CREATE TABLE IF NOT EXISTS student_powerup_grants (
 student_id INT NOT NULL, level INT NOT NULL, type VARCHAR(32) NOT NULL,
 remaining INT NOT NULL DEFAULT 0, permanent TINYINT NOT NULL DEFAULT 0,
 bonus INT NOT NULL DEFAULT 0, granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(student_id, level), UNIQUE KEY(student_id, type)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_powerup_uses (
 use_id INT AUTO_INCREMENT PRIMARY KEY, student_id INT NOT NULL, quiz_id INT NOT NULL,
 question_index INT NOT NULL, type VARCHAR(32) NOT NULL, xp_cost INT NOT NULL DEFAULT 0,
 payload LONGTEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY(student_id, quiz_id, question_index, type)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
 student_id INT NOT NULL, quiz_id INT NOT NULL, answers LONGTEXT NOT NULL,
 started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(student_id, quiz_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_xp_awards (
 submission_id INT PRIMARY KEY, student_id INT NOT NULL, base_xp INT NOT NULL,
 multiplier DECIMAL(3,1) NOT NULL DEFAULT 1, crown_bonus INT NOT NULL DEFAULT 0,
 final_xp INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS student_reward_progress (
 student_id INT PRIMARY KEY, lifetime_xp INT NOT NULL DEFAULT 0,
 streak INT NOT NULL DEFAULT 0, last_activity DATE DEFAULT NULL
) ENGINE=InnoDB;
-- Existing results retain their XP and do not consume newly unlocked power-ups.
INSERT IGNORE INTO student_xp_awards (submission_id,student_id,base_xp,final_xp)
SELECT submission_id,student_id,xp_earned,xp_earned FROM quiz_idsubmissions
WHERE status IN ('submitted','graded');
