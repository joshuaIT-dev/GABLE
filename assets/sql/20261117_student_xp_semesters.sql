CREATE TABLE IF NOT EXISTS student_xp_semesters (
 semester_id INT AUTO_INCREMENT PRIMARY KEY,
 label VARCHAR(100) NOT NULL,
 started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 scheduled_end DATE NOT NULL,
 closed_at DATETIME NULL,
 submission_cutoff INT NOT NULL DEFAULT 0,
 redemption_cutoff INT NOT NULL DEFAULT 0,
 use_cutoff INT NOT NULL DEFAULT 0,
 opened_by INT NULL,
 closed_by INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO student_xp_semesters(label,scheduled_end)
SELECT 'Initial semester (includes existing XP)', DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
WHERE NOT EXISTS (SELECT 1 FROM student_xp_semesters);
CREATE TABLE IF NOT EXISTS student_xp_exports (
 export_id INT AUTO_INCREMENT PRIMARY KEY,
 semester_id INT NOT NULL,
 admin_id INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 snapshot_json LONGTEXT NOT NULL,
 snapshot_hash CHAR(64) NOT NULL,
 used_at DATETIME NULL,
 KEY semester_exports(semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE OR REPLACE VIEW current_xp_semester AS
SELECT * FROM student_xp_semesters WHERE semester_id=(SELECT MAX(semester_id) FROM student_xp_semesters);
CREATE OR REPLACE VIEW current_student_xp AS
SELECT s.student_id,
 COALESCE(q.earned_xp,0) earned_xp,
 COALESCE(g.bonus_xp,0) bonus_xp,
 COALESCE(r.spent_xp,0)+COALESCE(u.spent_xp,0) spent_xp,
 COALESCE(q.earned_xp,0)+COALESCE(g.bonus_xp,0) semester_xp,
 GREATEST(0,COALESCE(q.earned_xp,0)+COALESCE(g.bonus_xp,0)-COALESCE(r.spent_xp,0)-COALESCE(u.spent_xp,0)) xp
FROM student s
LEFT JOIN (SELECT student_id,SUM(xp_earned) earned_xp FROM quiz_idsubmissions
 WHERE submission_id>(SELECT submission_cutoff FROM current_xp_semester) AND status IN ('submitted','graded') GROUP BY student_id) q ON q.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(bonus) bonus_xp FROM student_powerup_grants GROUP BY student_id) g ON g.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(xp_cost) spent_xp FROM grade_boost_redemptions
 WHERE redemption_id>(SELECT redemption_cutoff FROM current_xp_semester) GROUP BY student_id) r ON r.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(xp_cost) spent_xp FROM student_powerup_uses
 WHERE use_id>(SELECT use_cutoff FROM current_xp_semester) GROUP BY student_id) u ON u.student_id=s.student_id;
