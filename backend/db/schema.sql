-- Stores TaskFlow user accounts; email addresses must be unique.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Stores tasks owned by users. Deleting an owner removes their tasks.
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP,
    image_url VARCHAR(512),
    owner_id INTEGER NOT NULL,
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    CONSTRAINT tasks_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Adds reminder tracking safely to databases created before this migration.
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Supports owner-scoped task lookups, due-date reminders, and status filtering.
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks (owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);