# GABLE

GABLE (Game Based Learning Environment) is a web application for managing quizzes and coursework with game-inspired progression. Students take quizzes and earn XP, instructors manage classes and review outcomes, and administrators manage the platform.

## Roles and portals

- **Student** - take formal and informal quizzes, review results, use learning tools, earn XP, and view rankings. Main pages: `pages/Student.html`, `pages/Sdashboard.html`, and `pages/Game.html`.
- **Instructor** - manage quizzes and classes, review submissions and syllabus alignment, and view teaching XP and rank. Main pages: `pages/Instructor.html` and `pages/Idashboard.html`.
- **Administrator** - manage users, quizzes, settings, reports, announcements, and instructor evaluations. Main page: `pages/Admin.html`.
- **Public pages** - `pages/Index.html`, `pages/Features.html`, `pages/About.html`, `pages/Help.html`, and `pages/Login.html`.

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

   This creates the database if needed, applies the baseline and any unapplied migrations in `assets/sql/`, and records them in `schema_migrations`. Alternatively, import `full_system.sql` into the configured database with a database client. The snapshot contains schema, not application records.

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
