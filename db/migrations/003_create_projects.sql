CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    status TEXT NOT NULL DEFAULT 'planned',

    start_date DATE,
    due_date DATE,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_projects_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_projects_creator
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_projects_status
        CHECK (
            status IN (
                'planned',
                'active',
                'completed',
                'archived'
            )
        ),

    CONSTRAINT chk_projects_dates
        CHECK (
            due_date IS NULL
            OR start_date IS NULL
            OR due_date >= start_date
        )
);

CREATE INDEX idx_projects_workspace_status
    ON projects (workspace_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_projects_workspace_created_at
    ON projects (workspace_id, created_at DESC)
    WHERE deleted_at IS NULL;
