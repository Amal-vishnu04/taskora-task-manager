-- Stores a readable history of important task events per user.
CREATE TABLE IF NOT EXISTS task_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    task_title VARCHAR(255) NOT NULL,
    action VARCHAR(40) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activity_user ON task_activity (user_id, created_at DESC);
