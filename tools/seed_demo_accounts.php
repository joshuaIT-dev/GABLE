<?php
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
require_once __DIR__.'/../assets/php/config.php';
require_once __DIR__.'/../assets/php/powerup_service.php';

function seed_demo_accounts(mysqli $db,array $catalog,string $directory): array {
    $expectedTeachers=count($catalog)*5; $expectedStudents=count($catalog)*130;
    if (!$catalog) throw new RuntimeException('The program catalog is empty.');
    foreach ($catalog as $entry) {
        if (empty($entry['college']) || empty($entry['program']) || count(array_unique($entry['subjects']??[]))!==6) throw new RuntimeException('Each program needs a college and six distinct subjects.');
    }
    $lock=pu_row($db,"SELECT GET_LOCK(CONCAT(DATABASE(),':gable_demo_seed'),0) acquired");
    if ((int)$lock['acquired']!==1) throw new RuntimeException('Another account setup is running.');
    $file=null;$pending=null;
    try {
        $teachers=(int)pu_row($db,"SELECT COUNT(*) n FROM instructor WHERE institutional_email LIKE '%@demo.gable.test'")['n'];
        $students=(int)pu_row($db,"SELECT COUNT(*) n FROM student WHERE institutional_email LIKE '%@demo.gable.test'")['n'];
        if ($teachers===$expectedTeachers && $students===$expectedStudents) {
            return ['status'=>'Already present; no accounts or passwords changed.','instructors'=>$teachers,'students'=>$students,'account_lists'=>$directory];
        }
        if ($teachers || $students) throw new RuntimeException('A partial demo batch already exists. Setup stopped to preserve it; no duplicate accounts were created.');
        if (!is_dir($directory) && !mkdir($directory,0700,true)) throw new RuntimeException('Could not create the private account-list directory.');
        $path=$directory.'/demo-accounts-'.date('Ymd-His').'-'.bin2hex(random_bytes(3)).'.csv';
        $pending=$path.'.pending';$file=fopen($pending,'x');
        if (!$file) throw new RuntimeException('Could not create the private account list.');
        if(fputcsv($file,['Role','Login ID','Name','College','Program','Section','Subjects','Initial XP','Password'],',','"','')===false) throw new RuntimeException('Could not write account list.');
        $first=['Adrian','Bianca','Carlo','Diana','Ethan','Faith','Gabriel','Hannah','Isaac','Julia','Kyle','Lara','Miguel','Nina','Oscar','Paula','Rafael','Sofia','Tristan','Valerie','Wesley','Yasmin','Zachary','Andrea','Brandon','Camille','Daniel','Elena','Felix','Grace'];
        $last=['Santos','Reyes','Cruz','Garcia','Mendoza','Torres','Ramos','Flores','Rivera','Gonzales','Lopez','Castillo','Aquino','Bautista','Villanueva','Fernandez','Navarro','Morales','Perez','Santiago','Lim','Tan','Soriano','Valdez','Aguilar','Domingo','Mercado','Salazar','Francisco','Tolentino'];
        $password=12345;$created=0;
        $db->begin_transaction();
        // Lock existing account ranges while allocating the next role-specific login numbers.
        pu_query($db,'SELECT student_id FROM student ORDER BY student_id FOR UPDATE')->get_result()->fetch_all();
        pu_query($db,'SELECT instructor_id FROM instructor ORDER BY instructor_id FOR UPDATE')->get_result()->fetch_all();
        $year=(int)date('Y')*10000;
        $nextStudent=max($year+1000,(int)pu_row($db,'SELECT MAX(student_number) n FROM student')['n'])+1;
        $nextTeacher=max($year+2000,(int)pu_row($db,'SELECT MAX(instructor_number) n FROM instructor')['n'])+1;
        foreach ($catalog as $p=>$entry) {
            $college=$entry['college'];$program=$entry['program'];$subjects=$entry['subjects'];shuffle($subjects);
            $teacherIds=[];$loads=[];$owners=[];
            for($i=0;$i<5;$i++) {
                $number=$nextTeacher++;$name=$first[array_rand($first)];$surname=$last[array_rand($last)];$xp=random_int(0,10000);
                $plain=(string)$password++;$hash=password_hash($plain,PASSWORD_BCRYPT,['cost'=>10]);
                pu_query($db,"INSERT INTO instructor(instructor_number,institutional_email,first_name,last_name,college,program,password,teaching_exp,status) VALUES (?,?,?,?,?,?,?,?,'Active')",[$number,'i'.(910000000+$p*10+$i).'@demo.gable.test',$name,$surname,$college,$program,$hash,$xp]);
                $id=$db->insert_id;$teacherIds[]=$id;
                $picked=[$subjects[($i*2)%6],$subjects[($i*2+1)%6]];
                if(random_int(0,1)){ $extra=array_values(array_diff($subjects,$picked));$picked[]=$extra[array_rand($extra)]; }
                $loads[$id]=$picked;foreach($picked as $subject)$owners[$subject][]=$id;
                if(fputcsv($file,['instructor',$number,$name.' '.$surname,$college,$program,'',implode(' | ',$picked),$xp,$plain],',','"','')===false)throw new RuntimeException('Account list write failed.');
                $created++;
            }
            foreach(range('A','Z') as $s=>$block) {
                $section=$program.' 1'.$block;
                if($s<5)$picked=$loads[$teacherIds[$s]];
                else{$picked=$subjects;shuffle($picked);$picked=array_slice($picked,0,random_int(2,3));}
                foreach($picked as $subject){
                    $teacher=$s<5?$teacherIds[$s]:$owners[$subject][array_rand($owners[$subject])];
                    pu_query($db,"INSERT INTO teaching_assignments(instructor_id,subject_name,section,assignment_type) VALUES (?,?,?,'Lecture')",[$teacher,$subject,$section]);
                }
                for($i=0;$i<5;$i++) {
                    $number=$nextStudent++;$name=$first[array_rand($first)].' '.chr(random_int(65,90)).'.';$surname=$last[array_rand($last)];
                    $plain=(string)$password++;$hash=password_hash($plain,PASSWORD_BCRYPT,['cost'=>10]);
                    pu_query($db,"INSERT INTO student(student_number,institutional_email,first_name,last_name,college,program,year_level,block,password,status) VALUES (?,?,?,?,?,?,1,?,?,'Active')",[$number,'s'.(920000000+$p*1000+$s*5+$i).'@demo.gable.test',$name,$surname,$college,$program,$block,$hash]);
                    $id=$db->insert_id;$xp=random_int(0,8500);
                    pu_query($db,"INSERT INTO student_powerup_grants(student_id,level,type,remaining,permanent,bonus) VALUES (?,0,'semester_demo',0,0,?)",[$id,$xp]);
                    $state=pu_sync($db,$id);
                    if(fputcsv($file,['student',$number,$name.' '.$surname,$college,$program,$section,implode(' | ',$picked),$state['xp'],$plain],',','"','')===false)throw new RuntimeException('Account list write failed.');
                    $created++;
                }
            }
            echo 'Prepared '.$program.' ('.$created.' accounts).'.PHP_EOL;
        }
        if(!fflush($file))throw new RuntimeException('Could not save account list.');
        fclose($file);$file=null;
        if(!rename($pending,$path))throw new RuntimeException('Could not finalize account list.');
        $pending=$path;
        $db->commit();$pending=null;
        return ['status'=>'Created','instructors'=>$expectedTeachers,'students'=>$expectedStudents,'subjects'=>count($catalog)*6,'sections'=>count($catalog)*26,'password_range'=>'12345-'.($password-1),'account_list'=>$path];
    } catch(Throwable $error) {
        $db->rollback();
        if(is_resource($file))fclose($file);
        if($pending && is_file($pending))unlink($pending);
        throw $error;
    } finally {
        pu_query($db,"SELECT RELEASE_LOCK(CONCAT(DATABASE(),':gable_demo_seed'))");
    }
}

if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__) {
    try {
        $catalog=json_decode(file_get_contents(__DIR__.'/demo-catalog.json'),true,512,JSON_THROW_ON_ERROR);
        $result=seed_demo_accounts(getConnection(),$catalog,dirname(__DIR__,3).'/gable-private');
        echo json_encode($result,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
    } catch(Throwable $error) {
        fwrite(STDERR,'Account setup failed: '.$error->getMessage().PHP_EOL);exit(1);
    }
}
