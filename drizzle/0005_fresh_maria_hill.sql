CREATE OR REPLACE FUNCTION notify_new_comment() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_comments', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_notify_trigger AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION notify_new_comment();


CREATE OR REPLACE FUNCTION audit.notify_change() RETURNS trigger AS $$
BEGIN
    -- Notify about the change.
    -- The payload includes operation type, table information, new and old data.
    PERFORM pg_notify('audit_changes', json_build_object(
        'id', NEW.id,
        'ts', NEW.ts,
        'op', NEW.op,
        'table_oid', NEW.table_oid,
        'table_schema', NEW.table_schema,
        'table_name', NEW.table_name,
        'record_id', NEW.record_id,
        'old_record_id', NEW.old_record_id,
        'record', NEW.record,
        'old_record', NEW.old_record
    )::text);

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_audit_change AFTER INSERT ON audit.record_version
    FOR EACH ROW EXECUTE FUNCTION audit.notify_change();

