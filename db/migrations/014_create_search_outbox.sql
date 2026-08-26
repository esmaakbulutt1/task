CREATE TABLE search_outbox (
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    operation TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 1,
    attempts INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (entity_type, entity_id),

    CONSTRAINT chk_search_outbox_entity_type
        CHECK (entity_type IN ('workspace', 'project', 'task')),

    CONSTRAINT chk_search_outbox_operation
        CHECK (operation IN ('upsert', 'delete'))
);

CREATE INDEX idx_search_outbox_pending
    ON search_outbox (available_at, created_at)
    WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION enqueue_search_outbox_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    event_entity_id UUID;
    event_operation TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        event_entity_id := OLD.id;
        event_operation := 'delete';
    ELSE
        event_entity_id := NEW.id;
        event_operation := CASE
            WHEN NEW.deleted_at IS NULL THEN 'upsert'
            ELSE 'delete'
        END;
    END IF;

    INSERT INTO search_outbox (
        entity_type,
        entity_id,
        operation
    )
    VALUES (TG_ARGV[0], event_entity_id, event_operation)
    ON CONFLICT (entity_type, entity_id)
    DO UPDATE SET
        operation = EXCLUDED.operation,
        version = search_outbox.version + 1,
        attempts = 0,
        available_at = NOW(),
        locked_until = NULL,
        processed_at = NULL,
        last_error = NULL,
        updated_at = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_workspaces_search_outbox
AFTER INSERT OR UPDATE OR DELETE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION enqueue_search_outbox_event('workspace');

CREATE TRIGGER trg_projects_search_outbox
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION enqueue_search_outbox_event('project');

CREATE TRIGGER trg_tasks_search_outbox
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION enqueue_search_outbox_event('task');
