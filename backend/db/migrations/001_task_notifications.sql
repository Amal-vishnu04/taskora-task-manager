-- Tracks emails already sent per task so the same notification is never repeated.
CREATE TABLE IF NOT EXISTS task_notifications (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    dedupe_key VARCHAR(512) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT task_notifications_unique UNIQUE (task_id, type, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON task_notifications (user_id);
