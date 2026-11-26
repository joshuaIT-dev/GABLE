CREATE TABLE IF NOT EXISTS instructor_student_xp_awards (
 award_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL,
 instructor_id INT NOT NULL,
 semester_id INT NOT NULL,
 amount INT NOT NULL,
 reason VARCHAR(200) NOT NULL,
 awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY student_semester (student_id,semester_id),
 KEY instructor_awards (instructor_id,awarded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW current_student_xp AS
SELECT s.student_id,
 COALESCE(q.earned_xp,0) earned_xp,
 COALESCE(g.bonus_xp,0)+COALESCE(i.instructor_bonus_xp,0) bonus_xp,
 COALESCE(r.spent_xp,0)+COALESCE(u.spent_xp,0) spent_xp,
 COALESCE(q.earned_xp,0)+COALESCE(g.bonus_xp,0)+COALESCE(i.instructor_bonus_xp,0) semester_xp,
 GREATEST(0,COALESCE(q.earned_xp,0)+COALESCE(g.bonus_xp,0)+COALESCE(i.instructor_bonus_xp,0)-COALESCE(r.spent_xp,0)-COALESCE(u.spent_xp,0)) xp
FROM student s
LEFT JOIN (SELECT student_id,SUM(xp_earned) earned_xp FROM quiz_idsubmissions
 WHERE submission_id>(SELECT submission_cutoff FROM current_xp_semester) AND status IN ('submitted','graded') GROUP BY student_id) q ON q.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(bonus) bonus_xp FROM student_powerup_grants GROUP BY student_id) g ON g.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(amount) instructor_bonus_xp FROM instructor_student_xp_awards
 WHERE semester_id=(SELECT semester_id FROM current_xp_semester) GROUP BY student_id) i ON i.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(xp_cost) spent_xp FROM grade_boost_redemptions
 WHERE redemption_id>(SELECT redemption_cutoff FROM current_xp_semester) GROUP BY student_id) r ON r.student_id=s.student_id
LEFT JOIN (SELECT student_id,SUM(xp_cost) spent_xp FROM student_powerup_uses
 WHERE use_id>(SELECT use_cutoff FROM current_xp_semester) GROUP BY student_id) u ON u.student_id=s.student_id;
