CREATE TABLE IF NOT EXISTS studybuddy_chats (
 chat_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id INT NOT NULL,
 title VARCHAR(100) NOT NULL DEFAULT 'New conversation',
 subject VARCHAR(255) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY student_history (student_id,updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS studybuddy_messages (
 message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 chat_id INT NOT NULL,
 role ENUM('user','assistant') NOT NULL,
 content TEXT NOT NULL,
 request_id VARCHAR(64) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY request_role (chat_id,request_id,role),
 CONSTRAINT studybuddy_chat_messages FOREIGN KEY (chat_id) REFERENCES studybuddy_chats(chat_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
