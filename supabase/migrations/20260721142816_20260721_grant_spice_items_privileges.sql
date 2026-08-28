-- Grant table privileges to authenticated role for spice_items.
-- The table was created with RLS policies but without GRANT statements,
-- causing 403 "permission denied for table spice_items" errors.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spice_items TO authenticated;
GRANT SELECT ON public.spice_items TO anon;
