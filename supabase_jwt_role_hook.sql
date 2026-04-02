-- ============================================================
-- FUNDAÇÃO LUSO-BRASILEIRA — JWT Role Hook
-- Versão: 2026-04-02
-- ============================================================
-- OBJETIVO:
--   Injectar o role do utilizador (admin/editor/membro/viewer)
--   directamente no JWT, eliminando a necessidade de consultar
--   a tabela profiles a cada login/refresh.
--
-- INSTRUÇÕES:
--   1. Cole e execute este ficheiro no SQL Editor do Supabase
--   2. Vá a Authentication → Hooks → JWT Claims Hook
--   3. Ative o hook e seleccione: public.custom_access_token_hook
--   4. Guarde as configurações
--   5. Faça logout e login novamente para gerar um JWT com o role
-- ============================================================


-- ============================================================
-- FUNÇÃO: custom_access_token_hook
-- Chamada automaticamente pelo Supabase ao gerar cada JWT.
-- Lê o role da tabela profiles e injecta em app_metadata.
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Look up the user's role from profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE user_id = (event->>'user_id')::UUID;

  -- Default to 'viewer' if profile not found
  IF user_role IS NULL THEN
    user_role := 'viewer';
  END IF;

  -- Inject role into app_metadata inside the JWT claims
  RETURN jsonb_set(
    event,
    '{claims,app_metadata,role}',
    to_jsonb(user_role)
  );
END;
$$;


-- ============================================================
-- PERMISSÕES
-- ============================================================

-- Allow Supabase auth service to call this hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
