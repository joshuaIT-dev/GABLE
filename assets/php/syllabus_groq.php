<?php
// Native HTTPS fallback supports XAMPP processes that have not loaded cURL yet.
function syllabus_groq_request(array $payload): array {
 $body=json_encode($payload,JSON_THROW_ON_ERROR);
 if(function_exists('curl_init')){
  $ch=curl_init('https://api.groq.com/openai/v1/chat/completions');
  curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>50,CURLOPT_HTTPHEADER=>['Content-Type: application/json','Authorization: Bearer '.GROQ_API_KEY],CURLOPT_POSTFIELDS=>$body]);
  $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
 }else{
  $context=stream_context_create(['http'=>['method'=>'POST','header'=>"Content-Type: application/json\r\nAuthorization: Bearer ".GROQ_API_KEY,"content"=>$body,'timeout'=>50,'ignore_errors'=>true],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
  $raw=@file_get_contents('https://api.groq.com/openai/v1/chat/completions',false,$context);$code=0;
  foreach($http_response_header??[] as $header)if(preg_match('/^HTTP\/\S+\s+(\d+)/',$header,$match))$code=(int)$match[1];
 }
 if($code===429)throw new RuntimeException('Groq usage limit reached. Wait before retrying this review.',429);
 if($code===401||$code===403)throw new RuntimeException('Groq rejected the API credentials. Ask the administrator to check the key.',503);
 if($code!==200||$raw===false){error_log('Syllabus Groq HTTP '.$code);throw new RuntimeException('Groq could not complete the review (HTTP '.$code.'). Please retry shortly.',503);}
 $data=json_decode($raw,true);
 if(($data['choices'][0]['finish_reason']??'')==='length')throw new RuntimeException('The AI response was cut short. Retry the analysis.',502);
 return $data;
}
