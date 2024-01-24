/**
  AUDITING ALL TABLES
  Now that we have a way to enable auditing on a single table,

  We will manually enable auditing on invoices and products tables
 */

select audit.enable_tracking('public.comments'::regclass);
select audit.enable_tracking('public.posts'::regclass);
