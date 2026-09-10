-- =====================================================================
-- CORREÇÃO P0 — ESCALADA DE PRIVILÉGIO EM public.profiles
-- =====================================================================
-- NÃO EXECUTE ÀS CEGAS. Leia primeiro. Isto ALTERA a produção.
--
-- PROBLEMA (confirmado no banco de produção)
--   policy "profiles: atualização própria" -> FOR UPDATE
--     USING      (auth.uid() = user_id)
--     WITH CHECK (ausente)
--   Sem WITH CHECK, o PostgreSQL reutiliza o USING para validar a linha
--   NOVA. A única condição é "a linha continua a ser minha" — a coluna
--   `role` não é validada. O único trigger existente (profiles_updated_at)
--   apenas actualiza o carimbo temporal.
--
-- IMPACTO
--   Qualquer autenticado promove-se a admin:
--     PATCH /rest/v1/profiles?user_id=eq.<uid>   {"role":"admin"}
--   As policies de escrita chamam is_admin(), que lê esta mesma tabela,
--   logo o efeito é imediato. Dá acesso a pré-cadastros, leads, activity
--   log e gestão de utilizadores.
--
-- ESTRATÉGIA
--   Trigger BEFORE UPDATE em vez de reescrever a policy. Razões:
--   1. um trigger vê OLD e NEW; uma policy WITH CHECK só vê NEW, e para
--      comparar com o valor antigo teria de consultar profiles dentro da
--      própria policy de profiles -> risco de recursão infinita de RLS;
--   2. protege mesmo que alguém volte a mexer nas policies no futuro;
--   3. não toca em nenhuma policy existente -> rollback trivial.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASSO 1 (LEITURA) — verificar se a falha já foi explorada
-- Corra isto ANTES de corrigir. São 8 perfis; confirme que os admins são
-- mesmo quem deve ser.
-- ---------------------------------------------------------------------
SELECT role, count(*) AS quantos
FROM public.profiles
GROUP BY role
ORDER BY quantos DESC;

-- Se quiser ver quem são (contém dados pessoais — não partilhe o output):
-- SELECT email, role, created_at, updated_at FROM public.profiles ORDER BY role, created_at;
-- Sinal de alerta: um perfil com role='admin' cujo updated_at seja muito
-- posterior ao created_at, sem que ninguém se lembre de o ter promovido.


-- ---------------------------------------------------------------------
-- PASSO 2 (ESCRITA) — a correcção
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp   -- corrige tambem o search_path mutavel
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- service_role (Edge Functions, seeds, manutencao) continua a poder.
    IF COALESCE(auth.role(), '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    -- Admins podem promover/despromover outros.
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Alteracao de role nao permitida (perfil %).', OLD.user_id
      USING ERRCODE = '42501';   -- insufficient_privilege
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;

CREATE TRIGGER profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_role_change();


-- ---------------------------------------------------------------------
-- PASSO 3 (ESCRITA) — fechar o search_path mutável das funções de autorização
-- is_admin() e is_editor() sao invocadas por quase todas as policies de
-- escrita e estao SECURITY DEFINER SEM search_path fixo.
-- ATENCAO: confirme primeiro o corpo actual de cada uma com
--   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='is_admin';
-- e substitua o corpo abaixo pelo real se for diferente.
-- ---------------------------------------------------------------------
-- ALTER FUNCTION public.is_admin()        SET search_path = public, pg_temp;
-- ALTER FUNCTION public.is_editor()       SET search_path = public, pg_temp;
-- ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
--
-- ALTER FUNCTION ... SET search_path preserva o corpo e so fixa o contexto:
-- e a forma mais segura, sem reescrever a funcao. Descomente para aplicar.


-- ---------------------------------------------------------------------
-- PASSO 4 (LEITURA) — provar que a correcção funciona
-- Corra como um utilizador NAO admin. No SQL Editor voce e superuser, por
-- isso este teste tem de ser feito pela app ou via REST com o token de um
-- membro. O resultado esperado e erro 42501.
--
--   PATCH /rest/v1/profiles?user_id=eq.<uid-do-membro>
--   Authorization: Bearer <access_token do membro>
--   {"role":"admin"}
--   -> deve falhar com "Alteracao de role nao permitida"
--
-- E confirme que continua a funcionar:
--   - membro edita o proprio nome/telefone  -> deve PASSAR
--   - admin muda o role de outro utilizador -> deve PASSAR
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- ROLLBACK (se algo correr mal)
-- ---------------------------------------------------------------------
-- DROP TRIGGER IF EXISTS profiles_guard_role ON public.profiles;
-- DROP FUNCTION IF EXISTS public.guard_profile_role_change();
