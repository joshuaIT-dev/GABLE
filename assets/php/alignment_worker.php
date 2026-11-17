<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/config.php';
require_once __DIR__.'/alignment_service.php';
try{alignment_run_one(getConnection());}catch(Throwable $e){error_log('Alignment worker: '.$e->getMessage());exit(1);}
