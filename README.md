# GABLE

GABLE (Gamified Academic-Based Learning Environment) is a web application for managing quizzes and coursework with game-inspired progression. Students take quizzes and earn XP, instructors manage classes and review outcomes, and administrators manage the platform.

## Student XP semesters

Student XP progression belongs to a six-month semester. Spending reduces available XP but does not lower the student's level within the semester. The scheduled end is a reminder; only an administrator can close the period.

In **Admin → Settings → Platform & rewards**, use **Close a semester and restart student XP**:

1. Export and save the HTML report. It includes the university top 10, the top 10 per recorded college, and the complete student XP register. Open it offline or use your browser's Print → Save as PDF. Ranking uses earned semester XP including bonuses before spending; ties use last name, first name, then student ID. All student accounts are included.
2. Enter the next semester name, confirm that the report is saved, and type `RESET STUDENT XP`.
3. Start the next semester. Changed student records require a fresh export. Active quiz attempts must finish first. Saved exports remain available in admin history.

Reset restarts all student XP, levels, frames, unused power-ups and streaks. Quiz grades, historical awards and instructor XP remain intact. Earlier submissions cannot earn XP or consume rewards in the new semester, even when graded later. Grade boosts apply only to current-semester submissions. Students can earn level rewards again in the new semester. Refresh open student pages after reset.

The initial period includes existing XP because older records have no semester assignment. The first reset establishes a clean boundary. The legacy database field `student_reward_progress.lifetime_xp` now stores only current-semester progression and is cleared on reset.

Semester reset behavior is implemented in `assets/php/student_semester_service.php` and exposed to administrators through `assets/js/admin/student-semester.js` and `assets/php/admin_student_semester.php`. The repository does not currently include a dedicated semester integration-test script; verify reset workflows against a non-production database before using them on live accounts.


## Roles and portals

- **Student** - take formal and informal quizzes, review results, use learning tools, earn XP, and view rankings. Main pages: `pages/Student.html`, `pages/Sdashboard.html`, and `pages/Game.html`.
- **Instructor** - manage quizzes and classes, review submissions and syllabus alignment, and view teaching XP and rank. Main pages: `pages/Instructor.html` and `pages/Idashboard.html`.
- **Administrator** - manage users, quizzes, settings, reports, announcements, and instructor evaluations. Main page: `pages/Admin.html`.
- **Public pages** - `pages/Index.html`, `pages/Features.html`, `pages/About.html`, `pages/Help.html`, and `pages/Login.html`.

## Academic assignments

The current college name is **College of Information Technology & Computer Studies (CITCS)**, and the Information Technology program is **BSIT**. The `20261119_normalize_citcs_bsit.sql` migration updates existing student, instructor, and administrator records; the follow-up `20261119_normalize_bsit_section_labels.sql` migration updates legacy quiz and teaching-assignment section labels so they continue matching BSIT students.

Section labels use the format `<program> <year><block>`, such as `BSIT 1A`. The Add Student/User form supports block letters A–Z. When adding an instructor, select a college and program, then assign each subject its own one-or-more sections; assignments are saved as subject-section pairs.

## Technology

- PHP 8+ backend with MySQLi and MySQL/MariaDB
- HTML, CSS, and browser JavaScript; there is no Node build step or Composer dependency manager
- Apache for local hosting (for example, XAMPP)
- Groq API for AI-assisted features such as study support and content reviews

## Project layout

```text
pages/             Browser pages for public, student, instructor, and admin portals
assets/css/        Shared and portal-specific styles
assets/js/         Portal behavior and browser-side features
assets/php/        PHP endpoints, authentication, AI, quiz, XP, and database services
assets/sql/        Baseline schema and incremental database migrations
tools/             CLI utilities for migrations, admin creation, and quiz finalization
full_system.sql    Complete schema snapshot for database import
```

## Local setup

1. Place the project under the Apache document root. With the default XAMPP layout, open `http://localhost/GABLE/pages/Index.html`.
2. Create a private PHP config file outside the web root. `assets/php/config.php` loads the path in the `GABLE_PRIVATE_CONFIG` environment variable; if unset, it looks for `C:\xampp\gable-private\config.php` in the default XAMPP layout. The private file must define `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, and `GROQ_API_KEY`.
3. Ensure PHP has the `mysqli` extension enabled and can connect to the configured MySQL/MariaDB server. The configured database user needs permission to create the configured database and tables for the migration runner.
4. Run the schema migrations from the project root:

   ```powershell
   C:\xampp\php\php.exe tools\migrate.php
   ```

   This creates the database if needed, applies the baseline and any unapplied migrations in `assets/sql/`, and records them in `schema_migrations`. This includes data migrations that normalize existing college, program, and section labels. If you import `full_system.sql` instead, run the migration command afterward to apply newer changes, including semester XP. The snapshot contains schema, not application records.

5. Create an administrator with the CLI tool `tools/create_admin.php`. It reads a JSON object from standard input with `admin_number`, `first_name`, `last_name`, and `password` fields. Use a unique administrator number and a password 8 to 72 bytes long.
6. Sign in through `pages/Login.html` and choose the account role.

AI features that call Groq require a valid API key. Keep database credentials and API keys in the private config or environment, never in public pages or committed files. Some announcement drafting code also supports `assets/php/config.local.php` for a separate key; see `assets/php/config.local.php.example` for that feature's setup notes.

## Background quiz finalization

`tools/finalize_quizzes.php` finalizes eligible expired quiz attempts and processes instructor quiz rewards. It can preview eligible attempts without making changes:

```powershell
C:\xampp\php\php.exe tools\finalize_quizzes.php --dry-run
```

Run without `--dry-run` to process them. The utility is CLI-only; it is not a web page.

## Notes

- PHP endpoints are under `assets/php/`; browser pages call them with session-based role checks.
- SQL migration files and the complete SQL snapshot are blocked from direct web access by `.htaccess`.
- The repository does not include local database credentials or a default administrator password.


## Create demonstration accounts on XAMPP

After configuring the private database config described under Local setup, start MySQL in XAMPP and double-click `create_demo_accounts.bat` in the project root. The command applies migrations and creates 105 instructors, 2,730 students, 126 subjects and 546 Year 1 sections (A-Z for each of 21 programs). Each instructor teaches 2-3 subjects; each section has 2-3 subjects and five students. Accounts receive random XP and corresponding student rewards.

Login IDs continue the existing eight-digit format for each role. Passwords start at `12345` and increase in account-list order. These predictable passwords are for demonstration accounts only. Login details are saved as a CSV under `C:\xampp\gable-private` in the standard XAMPP layout, outside the repository. The script preserves existing accounts, including the demo student and Alex, and skips a complete existing demo batch. A partial batch stops setup for review.

Commit `create_demo_accounts.bat`, `tools/seed_demo_accounts.php`, `tools/demo-catalog.json`, and the SQL migrations with the application. Keep private configuration, API keys and generated credential lists out of GitHub. Creating all password hashes can take several minutes.
