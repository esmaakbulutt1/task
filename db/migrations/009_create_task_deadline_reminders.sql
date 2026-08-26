CREATE TABLE task_deadline_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reminder_type TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    notification_id UUID,
    email_job_id TEXT,
    email_queued_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_task_deadline_reminders_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_task_deadline_reminders_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_task_deadline_reminders_notification
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_task_deadline_reminders_type
        CHECK (reminder_type IN ('approaching', 'overdue')),

    CONSTRAINT uq_task_deadline_reminder
        UNIQUE (task_id, user_id, reminder_type, due_date)
);

CREATE INDEX idx_task_deadline_reminders_incomplete
    ON task_deadline_reminders (locked_at, updated_at)
    WHERE completed_at IS NULL;
