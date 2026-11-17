<?php
function ai_daily_reserve(mysqli $db,string $owner,int $limit): void {
    $stmt=$db->prepare('INSERT INTO ai_usage_limits(owner_key,usage_day,requests) VALUES (?,CURRENT_DATE,1) ON DUPLICATE KEY UPDATE requests=requests+1');
    $stmt->bind_param('s',$owner);$stmt->execute();$stmt->close();
    $stmt=$db->prepare('SELECT requests FROM ai_usage_limits WHERE owner_key=? AND usage_day=CURRENT_DATE');
    $stmt->bind_param('s',$owner);$stmt->execute();$count=(int)$stmt->get_result()->fetch_assoc()['requests'];$stmt->close();
    if($count>$limit)throw new RuntimeException('Daily AI limit reached. Please try again tomorrow.',429);
}
function ai_action_lock(mysqli $db,string $name,int $wait=0): void {
    $stmt=$db->prepare('SELECT GET_LOCK(?,?) locked');$stmt->bind_param('si',$name,$wait);$stmt->execute();
    $locked=(int)$stmt->get_result()->fetch_assoc()['locked'];$stmt->close();
    if(!$locked)throw new RuntimeException('A request is already running. Please wait for it to finish.',409);
}
function ai_action_unlock(mysqli $db,string $name): void {
    $stmt=$db->prepare('SELECT RELEASE_LOCK(?)');$stmt->bind_param('s',$name);$stmt->execute();$stmt->close();
}
