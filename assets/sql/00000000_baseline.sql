SET FOREIGN_KEY_CHECKS=0;
CREATE TABLE IF NOT EXISTS `admin` (
  `admin_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `middle_initial` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`admin_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ai_review_sets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `scope` varchar(190) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `role` varchar(16) NOT NULL,
  `feature` varchar(32) NOT NULL,
  `quiz_id` int(11) NOT NULL DEFAULT 0,
  `fingerprint` char(64) NOT NULL,
  `context_json` longtext NOT NULL,
  `state_json` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `source_hash` char(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `context_key` (`scope`,`fingerprint`),
  KEY `owner_key` (`role`,`owner_id`)
) ENGINE=InnoDB AUTO_INCREMENT=218 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `ai_review_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `set_id` bigint(20) unsigned NOT NULL,
  `version` int(11) NOT NULL,
  `response_json` longtext NOT NULL,
  `hidden` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `version_key` (`set_id`,`version`)
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `announcements` (
  `announcement_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `target` enum('all','students','instructors') NOT NULL,
  `priority` enum('normal','important','urgent') NOT NULL DEFAULT 'normal',
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`announcement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `flags` (
  `flag_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `question_index` int(11) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` enum('pending','resolved') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`flag_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `game_questions` (
  `question_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `section` varchar(100) NOT NULL,
  `topic` varchar(150) NOT NULL,
  `game_mode` varchar(50) NOT NULL,
  `question_text` text DEFAULT NULL,
  `answer` varchar(255) NOT NULL,
  `option_a` varchar(255) DEFAULT NULL,
  `option_b` varchar(255) DEFAULT NULL,
  `option_c` varchar(255) DEFAULT NULL,
  `option_d` varchar(255) DEFAULT NULL,
  `hint` text DEFAULT NULL,
  `jumbled_word` varchar(255) DEFAULT NULL,
  `crossword_row` int(11) DEFAULT NULL,
  `crossword_col` int(11) DEFAULT NULL,
  `crossword_direction` enum('across','down') DEFAULT NULL,
  `crossword_number` int(11) DEFAULT NULL,
  `points` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`question_id`),
  KEY `idx_game_instructor` (`instructor_id`),
  KEY `idx_game_section` (`section`),
  KEY `idx_game_topic` (`topic`),
  KEY `idx_game_mode` (`game_mode`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `grade_boost_redemptions` (
  `redemption_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `xp_cost` int(11) NOT NULL DEFAULT 350,
  `score_before` decimal(5,2) NOT NULL DEFAULT 0.00,
  `score_after` decimal(5,2) NOT NULL DEFAULT 0.00,
  `redeemed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`redemption_id`),
  KEY `idx_boost_submission` (`submission_id`),
  KEY `idx_boost_student` (`student_id`),
  KEY `idx_boost_quiz` (`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor` (
  `instructor_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `teaching_exp` int(11) DEFAULT 0,
  `grade` varchar(5) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `course_alignment` tinyint(3) unsigned DEFAULT NULL,
  `evaluation_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `quiz_id` int(11) DEFAULT NULL,
  `submission_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'submit',
  `title` varchar(150) NOT NULL,
  `message` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `unique_submission_notification` (`submission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_quiz_alignment_evaluations` (
  `evaluation_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `alignment_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `content_relevance_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `evaluated_by` int(11) NOT NULL,
  `evaluated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `review_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`evaluation_id`),
  UNIQUE KEY `uq_quiz_alignment` (`quiz_id`),
  UNIQUE KEY `unique_quiz_alignment` (`quiz_id`),
  KEY `idx_alignment_instructor` (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `instructor_quiz_rewards` (
  `reward_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `reward_type` varchar(50) NOT NULL,
  `exp_awarded` int(11) NOT NULL DEFAULT 0,
  `pass_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `valid_submissions` int(11) NOT NULL DEFAULT 0,
  `passed_submissions` int(11) NOT NULL DEFAULT 0,
  `awarded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`reward_id`),
  UNIQUE KEY `uq_quiz_reward_type` (`quiz_id`,`reward_type`),
  KEY `idx_instructor_reward` (`instructor_id`)
) ENGINE=InnoDB AUTO_INCREMENT=176 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_syllabi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `file_data` mediumblob NOT NULL,
  `content` mediumtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `accepted_by` int(11) DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `maintenance_state` (
  `id` tinyint(4) NOT NULL,
  `enabled` tinyint(4) NOT NULL DEFAULT 0,
  `generation` int(11) NOT NULL DEFAULT 0,
  `deadline` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `pma__bookmark` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `dbase` varchar(255) NOT NULL DEFAULT '',
  `user` varchar(255) NOT NULL DEFAULT '',
  `label` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `query` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Bookmarks';
CREATE TABLE IF NOT EXISTS `pma__central_columns` (
  `db_name` varchar(64) NOT NULL,
  `col_name` varchar(64) NOT NULL,
  `col_type` varchar(64) NOT NULL,
  `col_length` text DEFAULT NULL,
  `col_collation` varchar(64) NOT NULL,
  `col_isNull` tinyint(1) NOT NULL,
  `col_extra` varchar(255) DEFAULT '',
  `col_default` text DEFAULT NULL,
  PRIMARY KEY (`db_name`,`col_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Central list of columns';
CREATE TABLE IF NOT EXISTS `pma__column_info` (
  `id` int(5) unsigned NOT NULL AUTO_INCREMENT,
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `column_name` varchar(64) NOT NULL DEFAULT '',
  `comment` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `mimetype` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `transformation` varchar(255) NOT NULL DEFAULT '',
  `transformation_options` varchar(255) NOT NULL DEFAULT '',
  `input_transformation` varchar(255) NOT NULL DEFAULT '',
  `input_transformation_options` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `db_name` (`db_name`,`table_name`,`column_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Column information for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__designer_settings` (
  `username` varchar(64) NOT NULL,
  `settings_data` text NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Settings related to Designer';
CREATE TABLE IF NOT EXISTS `pma__export_templates` (
  `id` int(5) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `export_type` varchar(10) NOT NULL,
  `template_name` varchar(64) NOT NULL,
  `template_data` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `u_user_type_template` (`username`,`export_type`,`template_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Saved export templates';
CREATE TABLE IF NOT EXISTS `pma__favorite` (
  `username` varchar(64) NOT NULL,
  `tables` text NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Favorite tables';
CREATE TABLE IF NOT EXISTS `pma__history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL DEFAULT '',
  `db` varchar(64) NOT NULL DEFAULT '',
  `table` varchar(64) NOT NULL DEFAULT '',
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp(),
  `sqlquery` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `username` (`username`,`db`,`table`,`timevalue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='SQL history for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__navigationhiding` (
  `username` varchar(64) NOT NULL,
  `item_name` varchar(64) NOT NULL,
  `item_type` varchar(64) NOT NULL,
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  PRIMARY KEY (`username`,`item_name`,`item_type`,`db_name`,`table_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Hidden items of navigation tree';
CREATE TABLE IF NOT EXISTS `pma__pdf_pages` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `page_nr` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `page_descr` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`page_nr`),
  KEY `db_name` (`db_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='PDF relation pages for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__recent` (
  `username` varchar(64) NOT NULL,
  `tables` text NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Recently accessed tables';
CREATE TABLE IF NOT EXISTS `pma__relation` (
  `master_db` varchar(64) NOT NULL DEFAULT '',
  `master_table` varchar(64) NOT NULL DEFAULT '',
  `master_field` varchar(64) NOT NULL DEFAULT '',
  `foreign_db` varchar(64) NOT NULL DEFAULT '',
  `foreign_table` varchar(64) NOT NULL DEFAULT '',
  `foreign_field` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`master_db`,`master_table`,`master_field`),
  KEY `foreign_field` (`foreign_db`,`foreign_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Relation table';
CREATE TABLE IF NOT EXISTS `pma__savedsearches` (
  `id` int(5) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL DEFAULT '',
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `search_name` varchar(64) NOT NULL DEFAULT '',
  `search_data` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `u_savedsearches_username_dbname` (`username`,`db_name`,`search_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Saved searches';
CREATE TABLE IF NOT EXISTS `pma__table_coords` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `pdf_page_number` int(11) NOT NULL DEFAULT 0,
  `x` float unsigned NOT NULL DEFAULT 0,
  `y` float unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`db_name`,`table_name`,`pdf_page_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Table coordinates for phpMyAdmin PDF output';
CREATE TABLE IF NOT EXISTS `pma__table_info` (
  `db_name` varchar(64) NOT NULL DEFAULT '',
  `table_name` varchar(64) NOT NULL DEFAULT '',
  `display_field` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`db_name`,`table_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Table information for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__table_uiprefs` (
  `username` varchar(64) NOT NULL,
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `prefs` text NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`username`,`db_name`,`table_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Tables'' UI preferences';
CREATE TABLE IF NOT EXISTS `pma__tracking` (
  `db_name` varchar(64) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `version` int(10) unsigned NOT NULL,
  `date_created` datetime NOT NULL,
  `date_updated` datetime NOT NULL,
  `schema_snapshot` text NOT NULL,
  `schema_sql` text DEFAULT NULL,
  `data_sql` longtext DEFAULT NULL,
  `tracking` set('UPDATE','REPLACE','INSERT','DELETE','TRUNCATE','CREATE DATABASE','ALTER DATABASE','DROP DATABASE','CREATE TABLE','ALTER TABLE','RENAME TABLE','DROP TABLE','CREATE INDEX','DROP INDEX','CREATE VIEW','ALTER VIEW','DROP VIEW') DEFAULT NULL,
  `tracking_active` int(1) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`db_name`,`table_name`,`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Database changes tracking for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__userconfig` (
  `username` varchar(64) NOT NULL,
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `config_data` text NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='User preferences storage for phpMyAdmin';
CREATE TABLE IF NOT EXISTS `pma__usergroups` (
  `usergroup` varchar(64) NOT NULL,
  `tab` varchar(64) NOT NULL,
  `allowed` enum('Y','N') NOT NULL DEFAULT 'N',
  PRIMARY KEY (`usergroup`,`tab`,`allowed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='User groups with configured menu items';
CREATE TABLE IF NOT EXISTS `pma__users` (
  `username` varchar(64) NOT NULL,
  `usergroup` varchar(64) NOT NULL,
  PRIMARY KEY (`username`,`usergroup`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_bin COMMENT='Users and their assignments to user groups';
CREATE TABLE IF NOT EXISTS `quiz_idsubmissions` (
  `submission_id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `answers` longtext NOT NULL,
  `score` decimal(5,2) DEFAULT 0.00,
  `xp_earned` int(11) DEFAULT 0,
  `status` varchar(30) DEFAULT 'submitted',
  `submitted_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`),
  KEY `quiz_id` (`quiz_id`),
  KEY `student_id` (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `quiz_reviewer_settings` (
  `quiz_id` int(11) NOT NULL,
  `reviewer_enabled` tinyint(4) NOT NULL DEFAULT 0,
  `answers_released` tinyint(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `quiz_submission_snapshots` (
  `submission_id` int(11) NOT NULL,
  `snapshot_json` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `quizzes` (
  `quiz_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `section` varchar(100) NOT NULL,
  `mode` enum('formal','informal') NOT NULL DEFAULT 'formal',
  `quiz_type` varchar(100) NOT NULL,
  `due_date` date DEFAULT NULL,
  `time_limit` int(11) NOT NULL,
  `xp_reward` int(11) NOT NULL,
  `instructions` text DEFAULT NULL,
  `questions` longtext DEFAULT NULL,
  `status` enum('draft','active','removed') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student` (
  `student_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_number` int(11) DEFAULT NULL,
  `institutional_email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `first_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `college` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `program` varchar(100) DEFAULT NULL,
  `year_level` int(11) DEFAULT NULL,
  `block` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`student_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_powerup_grants` (
  `student_id` int(11) NOT NULL,
  `level` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `remaining` int(11) NOT NULL DEFAULT 0,
  `permanent` tinyint(4) NOT NULL DEFAULT 0,
  `bonus` int(11) NOT NULL DEFAULT 0,
  `granted_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`student_id`,`level`),
  UNIQUE KEY `student_id` (`student_id`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `instructor_student_xp_awards` (
  `award_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `instructor_id` int(11) NOT NULL,
  `semester_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `reason` varchar(200) NOT NULL,
  `awarded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`award_id`),
  KEY `student_semester` (`student_id`,`semester_id`),
  KEY `instructor_awards` (`instructor_id`,`awarded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_powerup_uses` (
  `use_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `question_index` int(11) NOT NULL,
  `type` varchar(32) NOT NULL,
  `xp_cost` int(11) NOT NULL DEFAULT 0,
  `payload` longtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`use_id`),
  UNIQUE KEY `student_id` (`student_id`,`quiz_id`,`question_index`,`type`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_quiz_attempts` (
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `answers` longtext NOT NULL,
  `started_at` timestamp NULL DEFAULT current_timestamp(),
  `open_count` int(11) NOT NULL DEFAULT 0,
  `deadline` bigint(20) DEFAULT NULL,
  `session_token` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`student_id`,`quiz_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_quiz_notification_reads` (
  `notification_read_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 1,
  `read_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_read_id`),
  UNIQUE KEY `unique_student_quiz` (`student_id`,`quiz_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_announcement_notification_reads` (
  `student_id` int(11) NOT NULL,
  `announcement_id` int(11) NOT NULL,
  `read_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`student_id`,`announcement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_notification_dismissals` (
  `student_id` int(11) NOT NULL,
  `notification_type` varchar(20) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `dismissed_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`student_id`,`notification_type`,`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_reward_progress` (
  `student_id` int(11) NOT NULL,
  `lifetime_xp` int(11) NOT NULL DEFAULT 0,
  `streak` int(11) NOT NULL DEFAULT 0,
  `last_activity` date DEFAULT NULL,
  PRIMARY KEY (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `student_system_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `quiz_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(4) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `student_feed` (`student_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE IF NOT EXISTS `student_xp_awards` (
  `submission_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `base_xp` int(11) NOT NULL,
  `multiplier` decimal(3,1) NOT NULL DEFAULT 1.0,
  `crown_bonus` int(11) NOT NULL DEFAULT 0,
  `final_xp` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`submission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `studybuddy_chats` (
  `chat_id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL DEFAULT 'New conversation',
  `subject` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`chat_id`),
  KEY `student_history` (`student_id`,`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `studybuddy_messages` (
  `message_id` int(11) NOT NULL AUTO_INCREMENT,
  `chat_id` int(11) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`message_id`),
  UNIQUE KEY `request_role` (`chat_id`,`request_id`,`role`),
  CONSTRAINT `studybuddy_chat_messages` FOREIGN KEY (`chat_id`) REFERENCES `studybuddy_chats` (`chat_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_review_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `review_id` int(11) NOT NULL,
  `actor_role` varchar(20) NOT NULL,
  `actor_id` int(11) NOT NULL,
  `action` varchar(30) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `review_id` (`review_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `syllabus_reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `quiz_id` int(11) NOT NULL,
  `syllabus_id` int(11) NOT NULL,
  `fingerprint` char(64) NOT NULL,
  `report` mediumtext DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `questions_snapshot` longtext DEFAULT NULL,
  `rubric_version` int(11) NOT NULL DEFAULT 0,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `revision` (`quiz_id`,`syllabus_id`,`fingerprint`)
) ENGINE=InnoDB AUTO_INCREMENT=892 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `teaching_assignments` (
  `assignment_id` int(11) NOT NULL AUTO_INCREMENT,
  `instructor_id` int(11) NOT NULL,
  `subject_name` varchar(100) NOT NULL,
  `section` varchar(50) NOT NULL,
  `assignment_type` varchar(50) NOT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `instructor_id` (`instructor_id`),
  CONSTRAINT `teaching_assignments_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
INSERT IGNORE INTO maintenance_state(id,enabled,generation,deadline) VALUES(1,0,0,0);
SET FOREIGN_KEY_CHECKS=1;
