begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_column('public','accounts','profile_completed_at','profile completion is persisted');
select has_column('public','accounts','password_changed_at','password changes are persisted');
select has_column('public','admin_profiles','given_name','administrator given name is persisted');
select has_column('public','admin_profiles','family_name','administrator family name is persisted');
select has_column('public','admin_profiles','location','administrator location is persisted');
select has_column('public','admin_profiles','bio','administrator biography is persisted');
select has_column('public','admin_profiles','avatar_path','administrator avatar path is persisted');
select has_table('public','authentication_events','authentication events are persisted');
select has_table('public','cancellation_reasons','cancellation reasons are persisted');
select ok((select relrowsecurity from pg_class where oid='public.authentication_events'::regclass),'authentication event RLS is enabled');
select is((select public from storage.buckets where id='profile-avatars'),false,'profile avatars are private');
select has_function('public','get_my_profile',array[]::text[],'profile read RPC exists');
select has_function('public','update_my_profile',array['text','text','text','text','text','text'],'profile update RPC exists');
select has_function('public','complete_my_profile',array['text','text','text','text','text','text'],'profile completion RPC exists');
select has_function('public','set_my_avatar',array['text'],'avatar RPC exists');
select has_function('public','record_my_password_change',array[]::text[],'password timestamp RPC exists');
select hasnt_function('public','enable_secondary_role',array['account_role'],'secondary role creation is unavailable');
select hasnt_function('public','switch_active_role',array['account_role'],'role switching is unavailable');

select * from finish();
rollback;
