<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../assets/php/config.php';
$db=getConnection(false);$name=str_replace('`','``',DB_NAME);$db->query("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");$db->select_db(DB_NAME);
$db->query('CREATE TABLE IF NOT EXISTS schema_migrations(name VARCHAR(255) PRIMARY KEY,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$directory=__DIR__.'/../assets/sql/';
function migration_run(mysqli $db,string $file): void {
 $sql=file_get_contents($file);
 if($sql===false)throw new RuntimeException("Could not read migration: $file");
 if(!$db->multi_query($sql))throw new RuntimeException("Could not execute migration $file: ".$db->error);
 do {
  if($result=$db->store_result())$result->free();
  if(!$db->more_results())break;
  if(!$db->next_result())throw new RuntimeException("Migration failed in $file: ".$db->error);
 } while(true);
}
$baseline='00000000_baseline.sql';
if(!$db->query("SELECT name FROM schema_migrations WHERE name='$baseline'")->num_rows){
 migration_run($db,$directory.$baseline);
 foreach(array_merge([$baseline],json_decode(file_get_contents($directory.'baseline_manifest.json'),true)) as $name){$stmt=$db->prepare('INSERT IGNORE INTO schema_migrations(name) VALUES (?)');$stmt->bind_param('s',$name);$stmt->execute();}
}
foreach(glob($directory.'*.sql') as $file){$name=basename($file);$stmt=$db->prepare('SELECT name FROM schema_migrations WHERE name=?');$stmt->bind_param('s',$name);$stmt->execute();if($stmt->get_result()->num_rows)continue;migration_run($db,$file);$stmt=$db->prepare('INSERT INTO schema_migrations(name) VALUES (?)');$stmt->bind_param('s',$name);$stmt->execute();echo "Applied $name\n";}
echo "Schema is current.\n";
