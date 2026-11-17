<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../assets/php/config.php';
try {
 $input=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
 $number=$input['admin_number']??'';$first=$input['first_name']??'';$last=$input['last_name']??'';$password=$input['password']??'';
 if(!is_scalar($number)||!preg_match('/^[0-9]{1,9}$/',(string)$number)||!is_string($first)||!is_string($last)||trim($first)===''||trim($last)===''||mb_strlen($first)>50||mb_strlen($last)>50||!is_string($password)||strlen($password)<8||strlen($password)>72)throw new RuntimeException('Provide admin_number (1-9 digits), first_name, last_name, and an 8-72 byte password as JSON on stdin.');
 $db=getConnection();$hash=password_hash($password,PASSWORD_DEFAULT);$first=trim($first);$last=trim($last);
 $stmt=$db->prepare('INSERT INTO admin(admin_number,first_name,last_name,password) VALUES (?,?,?,?)');$stmt->bind_param('ssss',$number,$first,$last,$hash);$stmt->execute();
 echo "Administrator created.\n";
}catch(Throwable $e){fwrite(STDERR,$e instanceof RuntimeException?$e->getMessage()."\n":"Could not create administrator; check input and whether the number already exists.\n");exit(1);}
