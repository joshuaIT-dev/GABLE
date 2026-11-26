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
