    CREATE OR REPLACE FUNCTION notify_trigger() RETURNS trigger AS $$
    BEGIN
        PERFORM pg_notify('new_posts', row_to_json(NEW)::text);
    RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER example_trigger AFTER INSERT ON public.posts
        FOR EACH ROW EXECUTE FUNCTION notify_trigger();
