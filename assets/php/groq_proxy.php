<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ai_usage.php';

function groq_proxy_fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
    groq_proxy_fail(405, 'Send a JSON POST request.');
}

$raw = file_get_contents('php://input');
if (strlen($raw) > 24000) groq_proxy_fail(413, 'Request is too large.');
$input = json_decode($raw, true);
if (!is_array($input)) groq_proxy_fail(400, 'Invalid request.');
$feature = $input['feature'] ?? '';
$db = getConnection(false);
$db->select_db(DB_NAME);

if ($feature === 'help') {
    $messages = $input['messages'] ?? null;
    if (!is_array($messages) || count($messages) < 1 || count($messages) > 16) groq_proxy_fail(422, 'Invalid chat history.');
    $total = 0;
    foreach ($messages as $message) {
        if (!is_array($message) || !in_array($message['role'] ?? '', ['system', 'user', 'assistant'], true) || !is_string($message['content'] ?? null)) groq_proxy_fail(422, 'Invalid chat message.');
        $total += strlen($message['content']);
        if (strlen($message['content']) > 16000 || $total > 20000) groq_proxy_fail(422, 'Chat history is too long.');
    }
    if (($messages[count($messages) - 1]['role'] ?? '') !== 'user') groq_proxy_fail(422, 'Send a user message to continue.');
    $owner = 'help:' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $limit = 20;
    $maxTokens = 600;
} elseif (in_array($feature, ['anomaly_notification', 'anomaly_analysis', 'triage_summary'], true)) {
    $adminId = (int)($_SESSION['admin'] ?? 0);
    if ($adminId < 1) groq_proxy_fail(401, 'Admin session required.');
    $stmt = $db->prepare('SELECT admin_id FROM admin WHERE admin_id=?');
    $stmt->bind_param('i', $adminId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) groq_proxy_fail(403, 'Admin account unavailable.');
    $prompt = $input['prompt'] ?? null;
    if (!is_string($prompt) || trim($prompt) === '' || strlen($prompt) > 6000) groq_proxy_fail(422, 'Invalid analysis request.');
    $messages = [['role' => 'user', 'content' => trim($prompt)]];
    $owner = 'admin-ai:' . $adminId;
    $limit = 50;
    $maxTokens = $feature === 'triage_summary' ? 300 : ($feature === 'anomaly_analysis' ? 180 : 120);
} else {
    groq_proxy_fail(400, 'Unknown AI feature.');
}

if (is_file(__DIR__ . '/config.local.php')) require_once __DIR__ . '/config.local.php';
$apiKey = defined('GABLE_AI_API_KEY') && GABLE_AI_API_KEY !== '' && strpos(GABLE_AI_API_KEY, 'PASTE-YOUR') === false
    ? GABLE_AI_API_KEY
    : (defined('GROQ_API_KEY') ? GROQ_API_KEY : (getenv('GROQ_API_KEY') ?: ''));
if ($apiKey === '') groq_proxy_fail(503, 'AI is not configured.');
if (!function_exists('curl_init')) groq_proxy_fail(503, 'AI is unavailable because PHP cURL is not loaded.');

try {
    ai_daily_reserve($db, $owner, $limit);
} catch (Throwable $e) {
    groq_proxy_fail((int)$e->getCode() === 429 ? 429 : 503, $e->getCode() === 429 ? $e->getMessage() : 'AI is temporarily unavailable.');
}

$curl = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 35,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(['model' => 'openai/gpt-oss-20b', 'max_tokens' => $maxTokens, 'reasoning_effort' => 'low', 'include_reasoning' => false, 'messages' => $messages]),
]);
$response = curl_exec($curl);
$status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
$content = trim((string)(json_decode($response ?: '', true)['choices'][0]['message']['content'] ?? ''));
if ($status !== 200 || $content === '') {
    error_log('Groq proxy request failed with HTTP ' . $status);
    groq_proxy_fail($status === 429 ? 429 : 502, $status === 429 ? 'AI usage limit reached. Please retry later.' : 'AI could not complete the request. Please try again.');
}
echo json_encode(['success' => true, 'content' => $content], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
