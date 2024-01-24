--> Manually added by @kristjan
--> https://supabase.com/blog/postgres-audit#:~:text=Back,faster%20lookup%20times.

--> index ts for time range filtering
create index record_version_ts
    on audit.record_version
    using brin(ts);

-- index table_oid for table filtering
create index record_version_table_oid
    on audit.record_version
    using btree(table_oid);

/**
  Changes to a Record Over Time
  One of the downsides to storing each row's data as jsonb is that filtering based on a column's value becomes very inefficient. If we want to look up a row's history quickly, we need to extract and index a unique identifier for each row.
  For the globally unique identifier, we'll use the following structure
    [table_oid, primary_key_value_1, primary_key_value_2, ...]
  and hash that array as a UUID v5 to get an efficiently indexable UUID type to identify the row that is robust to data changes.

  We'll use one utility function to lookup a record's primary key column names:
 */
create or replace function audit.primary_key_columns(entity_oid oid)
    returns text[]
    stable
    security definer
    language sql
as $$
    -- Looks up the names of a table's primary key columns
select
    coalesce(
            array_agg(pa.attname::text order by pa.attnum),
            array[]::text[]
    ) column_names
from
    pg_index pi
        join pg_attribute pa
             on pi.indrelid = pa.attrelid
                 and pa.attnum = any(pi.indkey)
where
    indrelid = $1
  and indisprimary
    $$;

/**
  We'll use another to consume the table_oid and primary key,
  converting the result into the record's UUID.
 */

create or replace function audit.to_record_id(
    entity_oid oid,
    pkey_cols text[],
    rec jsonb
)
    returns uuid
    stable
    language sql
as $$
select
    case
        when rec is null then null
        -- if no primary key exists, use a random uuid
        when pkey_cols = array[]::text[] then gen_random_uuid()
        else (
            select
                uuid_generate_v5(
                        'fd62bc3d-8d6e-43c2-919c-802ba3762271',
                        (
                            jsonb_build_array(to_jsonb($1))
                                || jsonb_agg($3 ->> key_)
                            )::text
                )
            from
                unnest($2) x(key_)
        )
        end
    $$;


/**
  Finally, we index the record_id and old_record_id columns
  that contain these unique identifiers for fast querying.
 */
-- index record_id for fast searching
create index record_version_record_id on audit.record_version (record_id)
    where record_id is not null;

-- index old_record_id for fast searching
create index record_version_old_record_id on audit.record_version (record_id)
    where old_record_id is not null;

/**
  AUDIT TRIGGER
  Enrollment
  Okay, so we have a home for our audit data that we're confident it can be queried efficiently.
  Now how do we populate it?

  We need the audit table to populate without end-users making any changes to their transactions.
  So we'll set up a trigger to fire when the data changes.
  In this case, we'll fire the trigger once for every inserted/updated/deleted row.
 */

create or replace function audit.insert_update_delete_trigger()
    returns trigger
    security definer
    language plpgsql
as $$
declare
    pkey_cols text[] = audit.primary_key_columns(TG_RELID);
record_jsonb jsonb = to_jsonb(new);
record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, record_jsonb);
old_record_jsonb jsonb = to_jsonb(old);
old_record_id uuid = audit.to_record_id(TG_RELID, pkey_cols, old_record_jsonb);
begin

insert into audit.record_version(
    record_id,
    old_record_id,
    op,
    table_oid,
    table_schema,
    table_name,
    record,
    old_record
)
select
    record_id,
    old_record_id,
    TG_OP,
    TG_RELID,
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    record_jsonb,
    old_record_jsonb;

return coalesce(new, old);
end;
$$;


/**
  "PUBLIC" API
  Finally, we'll wrap up the trigger creation and removal process behind a clean, idempotent, user facing API.

  The API we'll expose for enabling auditing on a table is
     select audit.enable_tracking('<schema>.<table>'::regclass);
  and for disabling tracking
    select audit.disable_tracking('<schema>.<table>'::regclass);

  Under the hood, those functions register our auditing trigger against the requested table.
 */

create or replace function audit.enable_tracking(regclass)
    returns void
    volatile
    security definer
    language plpgsql
as $$
declare
    statement_row text = format('
        create trigger audit_i_u_d
            before insert or update or delete
            on %I
            for each row
            execute procedure audit.insert_update_delete_trigger();',
                                $1
                         );

pkey_cols text[] = audit.primary_key_columns($1);
begin
    if pkey_cols = array[]::text[] then
        raise exception 'Table % can not be audited because it has no primary key', $1;
end if;

if not exists(select 1 from pg_trigger where tgrelid = $1 and tgname = 'audit_i_u_d') then
        execute statement_row;
end if;
end;
$$;

create or replace function audit.disable_tracking(regclass)
    returns void
    volatile
    security definer
    language plpgsql
as $$
declare
    statement_row text = format(
            'drop trigger if exists audit_i_u_d on %I;',
            $1
                         );
begin
    execute statement_row;
end;
$$;

