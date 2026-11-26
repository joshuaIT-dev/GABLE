ALTER TABLE grade_boost_redemptions
    DROP INDEX uq_boost_submission,
    ADD INDEX idx_boost_submission (submission_id);
