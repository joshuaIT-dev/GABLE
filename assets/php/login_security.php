<?php
function login_limit(mysqli $db,string $identity,int $limit,int $seconds): void {
 $key=hash('sha256',$identity);$now=time();$cutoff=$now-$seconds;
 $stmt=$db->prepare('INSERT INTO login_rate_limits(bucket,window_start,attempts) VALUES (?,?,1) ON DUPLICATE KEY UPDATE attempts=IF(window_start<=?,1,attempts+1),window_start=IF(window_start<=?,VALUES(window_start),window_start)');$stmt->bind_param('siii',$key,$now,$cutoff,$cutoff);$stmt->execute();
 $stmt=$db->prepare('SELECT attempts FROM login_rate_limits WHERE bucket=?');$stmt->bind_param('s',$key);$stmt->execute();
 if((int)$stmt->get_result()->fetch_assoc()['attempts']>$limit){http_response_code(429);header('Retry-After: '.$seconds);echo 'Too many login attempts. Please wait before trying again.';exit;}
}

function login_clear(mysqli $db,string $identity): void {
 $key=hash('sha256',$identity);
 $stmt=$db->prepare('DELETE FROM login_rate_limits WHERE bucket=?');
 $stmt->bind_param('s',$key);$stmt->execute();$stmt->close();
}
