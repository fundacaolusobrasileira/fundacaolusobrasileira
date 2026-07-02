# Prompt completo — alterações Fundação Luso-Brasileira

> Cole este conteúdo inteiro numa nova sessão do Claude (Cowork) com a pasta do
> projeto selecionada. Ele é autossuficiente: contém os caminhos e o conteúdo
> integral de cada arquivo. Execute na ordem indicada.

## Pasta do projeto
`C:\Users\sslaw\fundacaolusobrasileira`

## Objetivo (4 mudanças)
1. **Estatutos editável**: hoje "Estatutos em vigor" está fixo no código (`DocumentacaoPage.tsx`, aponta para `/Estatutos.pdf`) e nunca foi gravado no banco, por isso não aparece no gestor do painel. Semear no banco via migração e tornar o item estático apenas um *fallback*.
2. **Painel mais limpo (Conselhos)**: adicionar busca por nome/cargo e recolher cada conselho a 5 nomes com botão "ver todos".
3. **Imagem de partilha (Open Graph)**: o logo atual tem texto branco e some em fundo branco. Criar `og-image.png` 1200×630 com fundo verde escuro da marca (`#0A1410`) e logo legível; completar as meta tags.
4. **Favicon (busca web)**: usar o emblema circular quadrado como favicon (`favicon.ico` + PNGs) para o Google mostrar o círculo em vez do nome.

---

## Mudança 1 — Estatutos

### 1a. Criar o arquivo `migrations/20260525_estatutos_seed.sql`
```sql
-- ============================================================
-- Migration: estatutos_seed
-- Data: 2026-05-25
-- Objetivo:
--   Semear o documento "Estatutos em vigor" na tabela
--   `institutional_documents` (categoria 'estatutos'), de modo que ele
--   passe a ser gerível no Dashboard (editar, substituir o PDF, ocultar,
--   excluir) — exatamente como os Relatórios Anuais.
--
-- Notas:
--   - Idempotente: só insere se ainda não existir um documento na categoria
--     'estatutos' (evita duplicar caso rode mais de uma vez).
--   - O download continua "gated" (exige nome + email).
--   - O arquivo /Estatutos.pdf já está hospedado em /public.
-- ============================================================

INSERT INTO public.institutional_documents (category, title, description, year, file_url, gated, "order")
SELECT v.category, v.title, v.description, v.year, v.file_url, v.gated, v."order"
FROM (VALUES
  ('estatutos', 'Estatutos em vigor',
     'Versão consolidada dos estatutos em vigor da Fundação Luso-Brasileira.', NULL::INTEGER,
     '/Estatutos.pdf', TRUE, 1)
) AS v(category, title, description, year, file_url, gated, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutional_documents d
  WHERE d.category = 'estatutos'
);
```

### 1b. Editar `pages/documentacao/DocumentacaoPage.tsx` (função `buildGroup`)
**Substituir este bloco:**
```tsx
// Combina os documentos estáticos (ex.: Estatutos) com os do banco, por categoria.
const buildGroup = (def: DocGroupDef): DocGroup => ({
  title: def.title,
  description: def.description,
  docs: [
    ...(def.staticDocs ?? []),
    ...getDocumentsByCategory(def.category).map<DocItem>(d => ({
      label: d.year ? `${d.title} (${d.year})` : d.title,
      file: d.file_url,
      year: d.year,
      gated: d.gated,
    })),
  ],
});
```
**Por este:**
```tsx
// Combina os documentos estáticos (ex.: Estatutos) com os do banco, por categoria.
// O item estático é apenas FALLBACK: assim que existir o documento no banco
// (gerível no Dashboard), ele substitui o estático — evitando duplicação.
const buildGroup = (def: DocGroupDef): DocGroup => {
  const dbDocs = getDocumentsByCategory(def.category).map<DocItem>(d => ({
    label: d.year ? `${d.title} (${d.year})` : d.title,
    file: d.file_url,
    year: d.year,
    gated: d.gated,
  }));
  const staticDocs = dbDocs.length === 0 ? (def.staticDocs ?? []) : [];
  return {
    title: def.title,
    description: def.description,
    docs: [...staticDocs, ...dbDocs],
  };
};
```

---

## Mudança 2 — Conselhos (busca + recolher)

### Substituir TODO o conteúdo de `pages/dashboard/CouncilManagerSection.tsx` por:
```tsx
// pages/dashboard/CouncilManagerSection.tsx
// Gestão (CRUD) dos nomes dos Conselhos (Administração, Executivo, Fiscal,
// Curadores). Apenas nomes — não perfis. Dados na tabela `council_members`.
// UX: cada conselho mostra poucos nomes (com "ver todos") e há uma busca
// global por nome/cargo, para manter o painel limpo mesmo com listas longas.
import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Trash2, Check, X, Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { COUNCILS, FLB_STATE_EVENT } from '../../store/app.store';
import { createCouncilMember, updateCouncilMember, deleteCouncilMember } from '../../services/councils.service';
import type { CouncilMember, CouncilType } from '../../types';

const COUNCIL_LABELS: Record<CouncilType, { title: string; hint: string }> = {
  administracao: { title: 'Conselho de Administração', hint: 'Órgão de administração da Fundação' },
  executivo: { title: 'Conselho Executivo', hint: 'Órgão executivo da Fundação' },
  fiscal: { title: 'Conselho Fiscal', hint: 'Órgão de fiscalização da Fundação' },
  curadores: { title: 'Conselho de Curadores', hint: 'Órgão consultivo e de orientação estratégica' },
};

const COUNCIL_ORDER: CouncilType[] = ['administracao', 'executivo', 'fiscal', 'curadores'];

// Quantos nomes mostrar por conselho antes de "ver todos".
const COLLAPSE_LIMIT = 5;

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';

const matchesQuery = (m: CouncilMember, q: string) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  return m.name.toLowerCase().includes(needle) || (m.role || '').toLowerCase().includes(needle);
};

const CouncilGroup: React.FC<{ council: CouncilType; query: string }> = ({ council, query }) => {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const label = COUNCIL_LABELS[council];
  const allMembers = COUNCILS
    .filter(m => m.council === council)
    .sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));

  const searching = query.trim().length > 0;
  const filtered = allMembers.filter(m => matchesQuery(m, query));
  // Em busca: mostra todos os correspondentes. Sem busca: recolhe ao limite.
  const visible = searching ? filtered : (showAll ? allMembers : allMembers.slice(0, COLLAPSE_LIMIT));
  const hiddenCount = allMembers.length - COLLAPSE_LIMIT;
  const headerCount = searching ? filtered.length : allMembers.length;

  const handleAdd = async () => {
    if (newName.trim().length < 2 || busy) return;
    setBusy(true);
    const created = await createCouncilMember({ council, name: newName.trim(), role: newRole.trim() || null });
    setBusy(false);
    if (created) { setNewName(''); setNewRole(''); }
  };

  const startEdit = (m: CouncilMember) => {
    setConfirmId(null);
    setEditingId(m.id);
    setEditName(m.name);
    setEditRole(m.role || '');
  };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditRole(''); };
  const saveEdit = async (id: string) => {
    if (editName.trim().length < 2 || busy) return;
    setBusy(true);
    const ok = await updateCouncilMember(id, { name: editName.trim(), role: editRole.trim() || null });
    setBusy(false);
    if (ok) cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (busy) return;
    setBusy(true);
    await deleteCouncilMember(id);
    setBusy(false);
    setConfirmId(null);
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-white/60">
        <p className="text-sm font-semibold text-brand-900">{label.title}</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
          {label.hint} · {searching ? `${headerCount} de ${allMembers.length}` : `${headerCount} ${headerCount === 1 ? 'nome' : 'nomes'}`}
        </p>
      </div>

      {/* Lista */}
      <div className="divide-y divide-slate-100">
        {allMembers.length === 0 && (
          <p className="px-4 py-6 text-center text-slate-400 text-xs">Nenhum nome ainda. Adicione abaixo.</p>
        )}
        {allMembers.length > 0 && searching && filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-slate-400 text-xs">Nenhum nome corresponde à busca.</p>
        )}
        {visible.map(m => (
          <div key={m.id} className="px-4 py-2.5 flex items-center gap-2">
            {editingId === m.id ? (
              <>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nome"
                    className={inputCls}
                  />
                  <input
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    placeholder="Cargo (opcional, ex.: Presidente)"
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={() => saveEdit(m.id)}
                  disabled={busy}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                  title="Guardar"
                ><Check size={15} /></button>
                <button
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  title="Cancelar"
                ><X size={15} /></button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{m.name}</p>
                  {m.role && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-sand-600 mt-0.5">{m.role}</p>
                  )}
                </div>
                {confirmId === m.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Excluir?</span>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      title="Confirmar exclusão"
                    ><Check size={15} /></button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                      title="Cancelar"
                    ><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => startEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-900 hover:bg-slate-100 transition-colors"
                      title="Editar"
                    ><Pencil size={14} /></button>
                    <button
                      onClick={() => setConfirmId(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Excluir"
                    ><Trash2 size={14} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Ver todos / ver menos (apenas sem busca e quando há nomes ocultos) */}
      {!searching && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full px-4 py-2 border-t border-slate-100 bg-white/40 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-brand-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {showAll
            ? <><ChevronUp size={13} /> Ver menos</>
            : <><ChevronDown size={13} /> Ver todos ({allMembers.length})</>}
        </button>
      )}

      {/* Adicionar */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white/40 flex flex-col sm:flex-row gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Nome a adicionar"
          className={inputCls}
        />
        <input
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Cargo (opcional)"
          className={`${inputCls} sm:max-w-[200px]`}
        />
        <button
          onClick={handleAdd}
          disabled={busy || newName.trim().length < 2}
          className="shrink-0 bg-brand-900 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        ><Plus size={14} /> Adicionar</button>
      </div>
    </div>
  );
};

export const CouncilManagerSection = () => {
  const [, setTick] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  const totalNames = COUNCILS.length;

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <Landmark size={16} /> Conselhos da Fundação
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{totalNames} nomes</span>
          </h3>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar nome ou cargo..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all placeholder:text-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-900 transition-colors"
                title="Limpar busca"
              ><X size={14} /></button>
            )}
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {COUNCIL_ORDER.map(council => (
            <CouncilGroup key={council} council={council} query={query} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## Mudança 3 + 4 — index.html (Open Graph + favicon + manifest)

### Editar `index.html`
**Substituir este bloco (logo após a meta CSP):**
```html
    <link rel="icon" type="image/png" href="/logo-flb.png" />
    <link rel="apple-touch-icon" href="/logo-flb.png" />
    <!-- Open Graph -->
    <meta property="og:title" content="Fundação Luso-Brasileira" />
    <meta property="og:description" content="Conectando Portugal e Brasil através da cultura e inovação." />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="/logo-flb.png" />
```
**Por este:**
```html
    <!-- Favicons (emblema circular da Fundação) -->
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#0A1410" />
    <!-- Open Graph -->
    <meta property="og:title" content="Fundação Luso-Brasileira" />
    <meta property="og:description" content="Conectando Portugal e Brasil através da cultura e inovação." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://fundacaolusobrasileira.vercel.app/" />
    <meta property="og:site_name" content="Fundação Luso-Brasileira" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:image" content="https://fundacaolusobrasileira.vercel.app/og-image.png" />
    <meta property="og:image:secure_url" content="https://fundacaolusobrasileira.vercel.app/og-image.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Fundação Luso-Brasileira" />
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Fundação Luso-Brasileira" />
    <meta name="twitter:description" content="Conectando Portugal e Brasil através da cultura e inovação." />
    <meta name="twitter:image" content="https://fundacaolusobrasileira.vercel.app/og-image.png" />
```

### Criar `public/site.webmanifest`
```json
{
  "name": "Fundação Luso-Brasileira",
  "short_name": "FLB",
  "description": "Website institucional da Fundação Luso-Brasileira.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A1410",
  "theme_color": "#0A1410",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

### Gerar as imagens (rodar no shell, dentro da pasta do projeto)
Requer Python com Pillow (`pip install pillow --break-system-packages`).

**`og-image.png` (1200×630, fundo verde da marca + logo):**
```python
from PIL import Image, ImageDraw
import math
W, H = 1200, 630
base, center = (10, 20, 16), (16, 30, 24)   # #0A1410 -> leve realce no centro
bg = Image.new('RGB', (W, H), base); px = bg.load()
cx, cy = W/2, H/2; maxd = math.hypot(cx, cy)
for y in range(H):
    for x in range(W):
        d = math.hypot(x-cx, y-cy)/maxd
        t = max(0.0, 1.0 - d*1.15)**2
        px[x, y] = tuple(int(base[i] + (center[i]-base[i])*t) for i in range(3))
logo = Image.open('public/logo-flb-full.png').convert('RGBA')
tw = 880; th = int(logo.height*tw/logo.width)
logo = logo.resize((tw, th), Image.LANCZOS)
bg.paste(logo, ((W-tw)//2, (H-th)//2), logo)
d = ImageDraw.Draw(bg)
d.rounded_rectangle([(W//2-60, H-70), (W//2+60, H-66)], radius=2, fill=(201,175,136))
bg.save('public/og-image.png', 'PNG', optimize=True)
```

**Favicons (a partir do emblema circular):**
```python
from PIL import Image
src = Image.open('public/ICON LOGO FUNDAÇÃO.PNG').convert('RGBA')
bbox = src.split()[3].getbbox(); emblem = src.crop(bbox) if bbox else src

def sq(img, size, pad, bg=None):
    inner = size - 2*int(size*pad); w, h = img.size
    s = inner/max(w, h); nw, nh = int(w*s), int(h*s)
    r = img.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (bg+(255,)) if bg else (0,0,0,0))
    canvas.paste(r, ((size-nw)//2, (size-nh)//2), r)
    return canvas if bg is None else canvas.convert('RGB')

for s in (16, 32, 48):
    sq(emblem, s, 0.04).save(f'public/favicon-{s}x{s}.png', 'PNG', optimize=True)
icos = [sq(emblem, s, 0.04) for s in (16, 32, 48)]
icos[0].save('public/favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48)], append_images=icos[1:])
sq(emblem, 180, 0.10, (10,20,16)).save('public/apple-touch-icon.png', 'PNG', optimize=True)
sq(emblem, 192, 0.10, (10,20,16)).save('public/icon-192.png', 'PNG', optimize=True)
sq(emblem, 512, 0.10, (10,20,16)).save('public/icon-512.png', 'PNG', optimize=True)
```

---

## Passos finais
1. **Supabase**: rodar `migrations/20260525_estatutos_seed.sql` no SQL Editor. É o que faz o Estatuto aparecer editável no painel.
2. **Build local**: `npm run build` para confirmar que compila.
3. **Commit** (rodar na sua máquina, onde os arquivos estão corretos):
```
git add index.html pages/dashboard/CouncilManagerSection.tsx pages/documentacao/DocumentacaoPage.tsx migrations/20260525_estatutos_seed.sql public/og-image.png public/site.webmanifest public/favicon.ico public/favicon-16x16.png public/favicon-32x32.png public/favicon-48x48.png public/apple-touch-icon.png public/icon-192.png public/icon-512.png
git commit -m "feat: estatutos gerível no painel, conselhos com busca e partilha/favicon corrigidos"
```
4. **Deploy** no Vercel. Para a pré-visualização de partilha atualizar, force um novo scrape (ex.: Facebook Sharing Debugger / LinkedIn Post Inspector). O favicon no Google pode levar dias/semanas para recachear.

## Observação
Os arquivos acima JÁ foram aplicados nesta pasta nesta sessão. Este documento serve para reaplicar/reproduzir tudo do zero numa sessão limpa, se necessário.
