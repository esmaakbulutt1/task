ALTER TABLE audit_logs
ADD COLUMN event_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE audit_logs
ADD CONSTRAINT uq_audit_logs_event_id UNIQUE (event_id);
