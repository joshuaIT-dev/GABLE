ALTER TABLE student_quiz_attempts ADD COLUMN IF NOT EXISTS snapshot_json LONGTEXT NULL;
CREATE TABLE IF NOT EXISTS ai_usage_limits(owner_key VARCHAR(100) NOT NULL,usage_day DATE NOT NULL,requests INT NOT NULL DEFAULT 0,PRIMARY KEY(owner_key,usage_day));
CREATE TABLE IF NOT EXISTS login_rate_limits(bucket CHAR(64) PRIMARY KEY,window_start BIGINT NOT NULL,attempts INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS ai_pending_requests(owner_key VARCHAR(100) NOT NULL,request_key VARCHAR(100) NOT NULL,expires_at BIGINT NOT NULL,PRIMARY KEY(owner_key,request_key));
