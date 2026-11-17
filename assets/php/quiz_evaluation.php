<?php
session_start();header('Content-Type: application/json');
http_response_code(isset($_SESSION['admin'])?409:401);
echo json_encode(['success'=>false,'message'=>isset($_SESSION['admin'])?'Use Quiz Alignment to confirm a current review against an accepted syllabus.':'Please sign in.']);
