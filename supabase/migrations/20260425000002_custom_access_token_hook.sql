-- Migration: custom_access_token_hook
-- Injects user role from profiles into JWT app_metadata.
-- Mirrors the production function of the same name.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE user_id = (event->>'user_id')::UUID;

  IF user_role IS NULL THEN
    user_role := 'viewer';
  END IF;

  RETURN jsonb_set(
    event,
    '{claims,app_metadata,role}',
    to_jsonb(user_role)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
