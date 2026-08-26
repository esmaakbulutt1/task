CREATE TABLE import_succeeded_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID NOT NULL,
    row_number INTEGER NOT NULL,
    task_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_import_succeeded_rows_job
        FOREIGN KEY (import_job_id)
        REFERENCES import_jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_import_succeeded_rows_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_import_succeeded_row
        UNIQUE (import_job_id, row_number),

    CONSTRAINT chk_import_succeeded_rows_row_number
        CHECK (row_number > 0)
);

CREATE INDEX idx_import_succeeded_rows_job
    ON import_succeeded_rows (import_job_id, row_number);
