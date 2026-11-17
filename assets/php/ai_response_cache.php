<?php
if (function_exists('getConnection')) require_once __DIR__.'/review_history_service.php';
// Private, persistent cache; the lock also prevents simultaneous paid requests.
function ai_cache_begin(string $scope, string $context, bool $refresh = false, ?string $legacyContext = null): array {
    $dir = sys_get_temp_dir().'/gable-ai-'.substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('AI response storage is unavailable.', 503);
    }
    $file = fopen($dir.'/'.hash('sha256', $scope.'|'.$context).'.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) throw new RuntimeException('AI response storage is busy.', 503);
    $state = json_decode(stream_get_contents($file), true) ?: ['attempts'=>0];
    if (function_exists('review_restore')) {
        $stored=review_restore($scope,$context);
        if (!$stored && $legacyContext!==null && !isset($state['response'])) {
            $legacyPath=$dir.'/'.hash('sha256',$scope.'|'.$legacyContext).'.json';
            if (is_file($legacyPath)) {
                $legacy=fopen($legacyPath,'r');
                if ($legacy && flock($legacy,LOCK_SH)) { $state=json_decode(stream_get_contents($legacy),true)?:$state; flock($legacy,LOCK_UN); }
                if ($legacy) fclose($legacy);
            }
        }
        $state=$stored ?? $state;
        review_store($scope,$context,$state,isset($state['response']));
    }
    $state['successes'] ??= isset($state['response']) ? (int)$state['attempts'] : 0;
    $cached = $state['response'] ?? null;
    if (!$cached && !$refresh && function_exists('review_previous')) {
        $previous=review_previous($scope,$context);
        if ($previous) {
            $response=$previous['response']; unset($response['correct_answer']);
            flock($file,LOCK_UN); fclose($file);
            return ['cached'=>$response+['cached'=>true,'outdated'=>true,'generations'=>$state['attempts'],'limit'=>3,'limit_reached'=>$state['attempts']>=3]];
        }
    }

    if ($cached && (!$refresh || $state['attempts'] >= 3)) {
        flock($file, LOCK_UN); fclose($file);
        return ['cached'=>$cached + ['cached'=>true,'generations'=>$state['attempts'],'limit'=>3,'limit_reached'=>$state['attempts']>=3]];
    }
    if (!function_exists('curl_init')) {
        flock($file, LOCK_UN); fclose($file);
        throw new RuntimeException('AI is unavailable because PHP cURL is not loaded. Ask the administrator to restart Apache in XAMPP.',503);
    }
    if ($state['attempts'] >= 3) {
        flock($file, LOCK_UN); fclose($file);
        throw new RuntimeException('Three AI attempts have been used for this unchanged analysis. Try again after the results change.', 429);
    }
    // Reserve before contacting the provider: failures and aborted clients still cost tokens.
    $state['attempts']++;
    if (function_exists('review_store')) review_store($scope,$context,$state);
    ai_cache_write($file, $state);
    return ['file'=>$file,'state'=>$state,'scope'=>$scope,'context'=>$context];
}
function ai_cache_write($file, array $state): void {
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    rewind($file);
    if (!ftruncate($file, 0) || fwrite($file, $json) !== strlen($json) || !fflush($file)) {
        throw new RuntimeException('Could not save the AI response.', 503);
    }
}
function ai_cache_finish(array $ticket, array $response): array {
    $ticket['state']['response'] = $response;
    $ticket['state']['successes']=($ticket['state']['successes']??0)+1;
    if (function_exists('review_store')) review_store($ticket['scope'],$ticket['context'],$ticket['state'],true);
    ai_cache_write($ticket['file'], $ticket['state']);
    flock($ticket['file'], LOCK_UN); fclose($ticket['file']);
    return $response + ['cached'=>false,'generations'=>$ticket['state']['attempts'],'limit'=>3,'limit_reached'=>$ticket['state']['attempts']>=3];
}
