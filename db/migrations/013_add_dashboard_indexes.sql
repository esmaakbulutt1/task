CREATE INDEX idx_tasks_project_due_date_active
    ON tasks (project_id, due_date)
    WHERE deleted_at IS NULL
      AND status <> 'completed';

CREATE INDEX idx_tasks_project_updated_completed
    ON tasks (project_id, updated_at DESC)
    WHERE deleted_at IS NULL
      AND status = 'completed';
