<?php
function instructor_rank_error(string $rank,int $alignment,int $reviews,float $average): ?string {
 $minimum=['F'=>0,'C'=>70,'B'=>80,'A'=>90,'S'=>95,'SS'=>98,'SSS'=>99,'SSS+'=>100];
 if(!array_key_exists($rank,$minimum))return 'Select a valid instructor rank.';
 if($alignment<$minimum[$rank])return $rank.' requires at least '.$minimum[$rank].'% course alignment.';
 if($rank==='SSS+'&&($reviews<100||$average<99.5))return 'SSS+ requires 100% course alignment and at least 100 evaluated quizzes averaging 99.5% alignment.';
 return null;
}
