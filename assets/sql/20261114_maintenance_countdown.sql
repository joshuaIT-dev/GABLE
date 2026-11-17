CREATE TABLE IF NOT EXISTS maintenance_state (id TINYINT PRIMARY KEY, enabled TINYINT NOT NULL DEFAULT 0, generation INT NOT NULL DEFAULT 0, deadline BIGINT NOT NULL DEFAULT 0);
INSERT IGNORE INTO maintenance_state(id,enabled,generation,deadline) SELECT 1,COALESCE(MAX(setting_value),0),0,0 FROM system_settings WHERE setting_key='platform_maintenance_mode_enabled';
