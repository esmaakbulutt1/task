CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    parsing_finished BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_import_jobs_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_import_jobs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_import_jobs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_import_jobs_status
        CHECK (
            status IN (
                'pending',
                'parsing',
                'processing',
                'completed',
                'failed'
            )
        ),

    CONSTRAINT chk_import_jobs_counters
        CHECK (
            total_rows >= 0
            AND processed_rows >= 0
            AND failed_rows >= 0
        )
);

CREATE INDEX idx_import_jobs_project_status
    ON import_jobs (project_id, status);

CREATE INDEX idx_import_jobs_user_created_at
    ON import_jobs (user_id, created_at DESC);

CREATE TABLE import_failed_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    error_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_import_failed_rows_job
        FOREIGN KEY (import_job_id)
        REFERENCES import_jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_import_failed_row
        UNIQUE (import_job_id, row_number),

    CONSTRAINT chk_import_failed_rows_row_number
        CHECK (row_number > 0)
);
