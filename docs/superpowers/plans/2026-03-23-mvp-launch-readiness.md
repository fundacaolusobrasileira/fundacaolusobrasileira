# MVP Launch Readiness — Fundação Luso-Brasileira

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver todos os bloqueadores e problemas identificados para lançar o MVP B com segurança (site + Supabase real funcionando, pré-cadastro persiste, admin consegue gerir eventos).

**Architecture:** O App.tsx é o ponto de entrada e fonte dos helpers de auth/CRUD. O estado em runtime vive no `store/app.store.ts`, lido pelo DashboardPage e pelos services. Páginas públicas usam seeds + sync do Supabase via events/members services. O problema crítico de segurança é que qualquer usuário autenticado recebe `role: 'editor'` sem verificar o banco.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, Supabase JS v2, React Router v7, Lucide React

---

## Chunk 1: Bloqueadores de Código

### Task 1: Corrigir bug de segurança — role hardcoded como 'editor'

**Contexto:** Em `App.tsx`, a função `loginAsEditor` e o listener `onAuthStateChange` atribuem `role: 'editor'` a qualquer usuário autenticado sem verificar a tabela `profiles`. Qualquer pessoa que se cadastre via `/cadastro` vira editor com acesso total ao dashboard.

**Ficheiros:**
- Modificar: `App.tsx` (função `loginAsEditor` ~linha 392, `onAuthStateChange` ~linha 882)

**O que fazer:** Após autenticação bem-sucedida, consultar `profiles` onde `user_id = auth.user.id` e usar o campo `role` real. Se o perfil tiver `role = 'editor'` ou `role = 'admin'`, permitir acesso como editor. Caso contrário, definir como `'viewer'`.

- [ ] **Step 1: Modificar `loginAsEditor` para verificar role real**

Localizar em `App.tsx` a função `loginAsEditor` (linha ~392). Substituir o bloco que define `AUTH_SESSION` após login bem-sucedido:

```typescript
// ANTES (remover isto):
if (data.session) {
    AUTH_SESSION = {
        isLoggedIn: true,
        role: 'editor',
        displayName: data.user.email || 'Editor',
        userId: data.user.id,
        lastLoginAt: new Date().toISOString()
    };
    syncFromSupabase();
    notifyState();
    showToast(`Bem-vindo, ${data.user.email}!`, 'success');
    return { ok: true };
}

// DEPOIS (substituir por):
if (data.session) {
    // Verificar role real na tabela profiles
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

    const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

    AUTH_SESSION = {
        isLoggedIn: true,
        role: userRole,
        displayName: data.user.email || 'Editor',
        userId: data.user.id,
        lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    notifyState();
    showToast(`Bem-vindo, ${data.user.email}!`, 'success');
    return { ok: true };
}
```

- [ ] **Step 2: Modificar `initAuth` para verificar role na restauração de sessão**

Localizar a função `initAuth` (linha ~862). Substituir:

```typescript
// ANTES:
const initAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    AUTH_SESSION = {
      isLoggedIn: true,
      role: 'editor',
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  }
};

// DEPOIS:
const initAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

    AUTH_SESSION = {
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  }
};
```

- [ ] **Step 3: Modificar `onAuthStateChange` para verificar role**

Localizar o listener `onAuthStateChange` (linha ~882). Substituir o bloco `SIGNED_IN`:

```typescript
// ANTES:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    AUTH_SESSION = {
      isLoggedIn: true,
      role: 'editor',
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  } else if (event === 'SIGNED_OUT') {
    ...
  }
});

// DEPOIS:
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    const userRole = (profile?.role === 'editor' || profile?.role === 'admin') ? 'editor' : 'viewer';

    AUTH_SESSION = {
      isLoggedIn: true,
      role: userRole,
      displayName: session.user.email || 'Editor',
      userId: session.user.id,
      lastLoginAt: new Date().toISOString()
    };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  } else if (event === 'SIGNED_OUT') {
    AUTH_SESSION = { isLoggedIn: false, role: 'viewer' };
    setAuthSession(AUTH_SESSION);
    syncFromSupabase();
    syncMembers();
    syncEvents();
    notifyState();
  }
});
```

- [ ] **Step 4: Verificar visualmente**

Abrir `http://localhost:5173`. Fazer login com um utilizador que NÃO tenha `role = 'editor'` na tabela profiles. Confirmar que o dashboard mostra "Acesso Negado" ou redireciona. Fazer login com um utilizador que tenha `role = 'editor'`. Confirmar acesso total.

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "fix: verificar role real na tabela profiles ao autenticar"
```

---

### Task 2: Corrigir PreCadastroPage — remover setTimeout e aguardar Supabase

**Contexto:** `pages/auth/PreCadastroPage.tsx` usa `setTimeout(..., 1000)` para "simular delay de rede" antes de chamar `createPreCadastro`. A função `createPreCadastro` em App.tsx é async e retorna `{ success: true }` ou `null`. A page não awaita nem trata erros — se o Supabase falhar, o utilizador vê "sucesso" na mesma.

**Ficheiros:**
- Modificar: `pages/auth/PreCadastroPage.tsx`

- [ ] **Step 1: Substituir handleSubmit por versão async sem setTimeout**

Localizar `handleSubmit` em `PreCadastroPage.tsx` (~linha 14). Substituir:

```typescript
// ANTES:
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    // Simulate network delay then save to global state
    setTimeout(() => {
      createPreCadastro({
          name: formData.name,
          email: formData.email,
          type: formData.type,
          message: formData.message
      });
      setStatus('success');
      setFormData({ name: '', email: '', type: 'individual', message: '' });
    }, 1000);
};

// DEPOIS:
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    const result = await createPreCadastro({
        name: formData.name,
        email: formData.email,
        type: formData.type,
        message: formData.message
    });

    if (result?.success) {
        setStatus('success');
        setFormData({ name: '', email: '', type: 'individual', message: '' });
    } else {
        setStatus('idle');
    }
};
```

- [ ] **Step 2: Verificar visualmente**

Abrir `/precadastro`. Preencher o formulário. Confirmar que o botão mostra loading imediatamente, e que o sucesso/erro refletem o resultado real do Supabase (sem delay artificial de 1 segundo).

- [ ] **Step 3: Commit**

```bash
git add pages/auth/PreCadastroPage.tsx
git commit -m "fix: PreCadastroPage awaits Supabase real, remove setTimeout artificial"
```

---

## Chunk 2: Limpeza de Código Legado

### Task 3: Eliminar ficheiros de páginas legados na raiz

**Contexto:** Após a refatoração institucional, os ficheiros de páginas foram migrados para `pages/`. Os ficheiros antigos na raiz (`page.home.tsx`, `page.evento.tsx`, etc.) são dead code — nenhum import os referencia. Mantê-los causa confusão.

**Ficheiros a eliminar:**
- `page.cadastro.tsx`
- `page.dashboard.media.tsx`
- `page.dashboard.tsx`
- `page.evento.colaborar.tsx`
- `page.evento.detalhe.tsx`
- `page.eventos.tsx`
- `page.home.tsx`
- `page.legal.tsx`
- `page.login.tsx`
- `page.membro.perfil.tsx`
- `page.membros.tsx`
- `page.precadastro.tsx`

**Ficheiros de componentes legados a eliminar:**
- `component.domain.tsx` — **ATENÇÃO:** verificar antes de apagar. O `DashboardPage.tsx` importa componentes deste ficheiro (linha 4: `import { StatCard, ListRow, EventEditorModal, ... } from '../../component.ui'`). Não apagar sem confirmar que os imports foram migrados.
- `component.ui.tsx` — mesma atenção.

- [ ] **Step 1: Confirmar que pages legadas não têm imports ativos**

```bash
grep -r "from '.*page\." --include="*.tsx" --include="*.ts" . \
  --exclude-dir=node_modules
```

Resultado esperado: nenhuma linha encontrada (sem imports para os page.*.tsx legados).

- [ ] **Step 2: Confirmar que component.ui e component.domain têm imports ativos**

```bash
grep -r "from '.*component\." --include="*.tsx" --include="*.ts" . \
  --exclude-dir=node_modules
```

Se houver resultados (ex: DashboardPage importa de `component.ui`), NÃO apagar esses ficheiros — registar para migração futura. Apagar apenas os `page.*.tsx`.

- [ ] **Step 3: Apagar ficheiros de páginas legados**

```bash
rm page.cadastro.tsx page.dashboard.media.tsx page.dashboard.tsx \
   page.evento.colaborar.tsx page.evento.detalhe.tsx page.eventos.tsx \
   page.home.tsx page.legal.tsx page.login.tsx page.membro.perfil.tsx \
   page.membros.tsx page.precadastro.tsx
```

- [ ] **Step 4: Verificar que o build não quebrou**

```bash
npm run build
```

Esperado: build bem-sucedido sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remover ficheiros de páginas legados da raiz"
```

---

## Chunk 3: Configuração Manual do Supabase (Não-Código)

> Estes passos são manuais e devem ser feitos no painel do Supabase **antes do lançamento**. Não são alterações de código.

### Task 4: Checklist de Setup Supabase

- [ ] **Step 1: Confirmar que o schema foi aplicado**

Aceder ao [Supabase Dashboard](https://supabase.com/dashboard) → projeto `ekxdvzquvoaeunmgopdp` → Table Editor. Verificar que existem as tabelas: `profiles`, `partners`, `events`, `precadastros`, `community_media_submissions`. Se não existirem, abrir SQL Editor e colar + executar o conteúdo de `supabase_schema.sql`.

- [ ] **Step 2: Confirmar bucket de storage**

Supabase Dashboard → Storage. Verificar que existe bucket `media` com acesso público. Se não existir: New Bucket → nome `media` → activar "Public bucket" → Create.

- [ ] **Step 3: Criar o primeiro utilizador admin**

Supabase Dashboard → Authentication → Users → "Invite user" (ou "Add user"). Criar com email e senha seguros. Após criação, ir a Table Editor → tabela `profiles` → encontrar a linha deste utilizador → alterar campo `role` de `'membro'` para `'editor'`. Guardar.

- [ ] **Step 4: Testar login admin no site**

Aceder a `http://localhost:5173/#/login`. Fazer login com as credenciais criadas no Step 3. Confirmar que o dashboard abre com acesso completo (botões de criar/editar/apagar visíveis).

- [ ] **Step 5: Inserir o evento da Gala 2025 no Supabase**

No Supabase SQL Editor, executar:

```sql
INSERT INTO public.events (
  title,
  subtitle,
  description,
  description_short,
  date,
  time,
  location,
  city,
  country,
  category,
  status,
  featured,
  gallery,
  links,
  social_links
) VALUES (
  'Gala Anual 2025 — Fundação Luso-Brasileira',
  'Uma noite de celebração cultural e cooperação luso-brasileira',
  'A Gala Anual 2025 da Fundação Luso-Brasileira reuniu personalidades de Portugal e do Brasil numa noite de celebração da cultura, do conhecimento e da cooperação bilateral. O evento contou com discursos de líderes institucionais, apresentações culturais e o anúncio de novas iniciativas para 2026.',
  'Uma noite de celebração da cultura e cooperação luso-brasileira com a presença de personalidades de ambos os países.',
  '2025-11-15',
  '19:30',
  'Auditório Vieira de Almeida',
  'Lisboa',
  'Portugal',
  'Fundação',
  'published',
  true,
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
);
```

Ajustar os campos `description`, `date`, `location` conforme os dados reais do evento.

---

## Chunk 4: Substituição de Imagens Placeholder

### Task 5: Identificar e substituir imagens picsum.photos

**Contexto:** Alguns componentes e dados de seed usam `picsum.photos` como placeholder. Para o lançamento real estas devem ser substituídas por imagens reais ou removidas. Este passo requer assets reais — documentado aqui para não esquecer.

- [ ] **Step 1: Listar todos os usos de picsum**

```bash
grep -r "picsum" --include="*.tsx" --include="*.ts" . \
  --exclude-dir=node_modules -n
```

Registar os ficheiros e linhas encontrados.

- [ ] **Step 2: Substituir por imagens reais**

Para cada ocorrência encontrada, substituir a URL do picsum por:
- Uma imagem real no bucket `media` do Supabase (preferível)
- Uma URL de imagem externa estável
- Remover o campo `image` se não houver imagem disponível (os componentes têm fallback para placeholder elegante)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: substituir imagens placeholder picsum por assets reais"
```

---

## Resumo dos Passos Manuais Obrigatórios

Antes de considerar o MVP lançado, os seguintes passos manuais devem estar completos:

| # | Passo | Onde |
|---|---|---|
| 1 | Aplicar `supabase_schema.sql` | Supabase SQL Editor |
| 2 | Criar bucket `media` (público) | Supabase Storage |
| 3 | Criar utilizador admin + definir role='editor' na tabela profiles | Supabase Auth + Table Editor |
| 4 | Inserir Gala 2025 na tabela `events` | Supabase SQL Editor |
| 5 | Substituir imagens picsum | Código + Supabase Storage |
