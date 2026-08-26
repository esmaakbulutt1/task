CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    created_by UUID NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_tasks_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_tasks_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tasks_assignee
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_tasks_title
        CHECK (CHAR_LENGTH(BTRIM(title)) > 0),

    CONSTRAINT chk_tasks_status
        CHECK (
            status IN (
                'backlog',
                'todo',
                'in_progress',
                'review',
                'completed'
            )
        ),

    CONSTRAINT chk_tasks_priority
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX idx_tasks_project_status
    ON tasks (project_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_project_priority
    ON tasks (project_id, priority)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_assignee_due_date
    ON tasks (assigned_to, due_date)
    WHERE deleted_at IS NULL
      AND status <> 'completed';
