@echo off
setlocal
cd /d "%~dp0"
set "GABLE_PHP=%~dp0..\..\php\php.exe"
if not exist "%GABLE_PHP%" set "GABLE_PHP=C:\xampp\php\php.exe"
if not exist "%GABLE_PHP%" (
  echo PHP was not found. Place GABLE in the XAMPP htdocs folder.
  pause
  exit /b 1
)
echo GABLE demo account setup
echo Start MySQL in XAMPP before continuing.
echo This creates 105 instructors and 2730 students with demonstration passwords.
echo Existing accounts are preserved. An existing demo batch is skipped.
echo.
"%GABLE_PHP%" -r "$p=getenv('GABLE_PRIVATE_CONFIG') ?: dirname(getcwd(),2).'/gable-private/config.php'; if(!is_file($p)){fwrite(STDERR,'Private database config is missing. Follow Local setup in README.md first.'.PHP_EOL);exit(1);}"
if errorlevel 1 goto failed
"%GABLE_PHP%" tools\migrate.php
if errorlevel 1 goto failed
"%GABLE_PHP%" tools\seed_demo_accounts.php
if errorlevel 1 goto failed
echo.
echo Setup complete. See the account-list path printed above for login details.
pause
exit /b 0
:failed
echo.
echo Setup stopped. Check the message above and the database settings in your private config.
pause
exit /b 1
