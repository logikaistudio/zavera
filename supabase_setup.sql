-- Create Zavera App Data Tables in Supabase
-- Run this SQL in Supabase SQL Editor

-- Main data store table (generic key-value store)
CREATE TABLE IF NOT EXISTS zavera_data (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default-user',
    data_key TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, data_key)
);

CREATE INDEX IF NOT EXISTS idx_zavera_data_user_id ON zavera_data(user_id);
CREATE INDEX IF NOT EXISTS idx_zavera_data_key ON zavera_data(data_key);

-- Enable realtime for instant updates
ALTER TABLE zavera_data REPLICA IDENTITY FULL;

-- Insert default empty data if not exists
INSERT INTO zavera_data (user_id, data_key, data) VALUES
    ('default-user', 'branches', '[]'::jsonb),
    ('default-user', 'selected_branch', 'null'::jsonb),
    ('default-user', 'services', '[]'::jsonb),
    ('default-user', 'therapists', '[]'::jsonb),
    ('default-user', 'bookings', '[]'::jsonb),
    ('default-user', 'inventory', '[]'::jsonb),
    ('default-user', 'therapist_statuses', '[]'::jsonb),
    ('default-user', 'slot_statuses', '{}'::jsonb),
    ('default-user', 'selected_slots', '[]'::jsonb),
    ('default-user', 'manual_completed_minutes', '{}'::jsonb),
    ('default-user', 'rekaps', '[]'::jsonb),
    ('default-user', 'pembukuan', '[]'::jsonb),
    ('default-user', 'expenses', '[]'::jsonb)
ON CONFLICT (user_id, data_key) DO NOTHING;
