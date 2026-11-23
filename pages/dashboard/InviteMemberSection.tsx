// pages/dashboard/InviteMemberSection.tsx
// Convidar por email os titulares das fichas de Governança que ainda não têm
// conta associada. Cruza PARTNERS (fichas) com profiles.partner_id (contas).
import React, { useEffect, useRef, useState } from 'react';
import { Mail, UserPlus, Check, X, Loader2, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { PARTNERS, FLB_STATE_EVENT, isAdmin } from '../../store/app.store';
import { fetchAllProfiles } from '../../services/auth.service';
import { inviteMemberByEmail } from '../../services/invites.service';
import type { Partner, UserProfile } from '../../types';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900/10 transition-all';

type LinkedAccount = { email: string; role: string };

const MemberRow: React.FC<{
  partner: Partner;
  account?: LinkedAccount;
  onInvited: () => void;
}> = ({ partner, account, onInvited }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState('');

  const handleInvite = async () => {
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed) { setRowError('Indique o email da pessoa.'); return; }
    setRowError('');
    setBusy(true);
    const result = await inviteMemberByEmail({
      email: trimmed,
      name: partner.name,
      partnerId: partner.id,
    });
    setBusy(false);
    if (result.ok) {
      setOpen(false);
      setEmail('');
      onInvited();
    } else {
      setRowError(result.error || 'Não foi possível enviar o convite.');
    }
  };

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${partner.active === false ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            {partner.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {partner.role && (
              <span className="text-[10px] text-slate-400 truncate">{partner.role}</span>
            )}
            {account ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-green-600">
                <ShieldCheck size={9} /> Conta associada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-500">
                <AlertTriangle size={9} /> Sem conta
              </span>
            )}
            {partner.active === false && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">Inativo</span>
            )}
          </div>
          {account && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{account.email}</p>
          )}
        </div>

        {!account && !open && (
          <button
            type="button"
            onClick={() => { setRowError(''); setOpen(true); }}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
          >
            <UserPlus size={12} /> Convidar
          </button>
        )}
      </div>

      {!account && open && (
        <div className="mt-2 rounded-lg bg-slate-50/70 border border-slate-100 p-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
            Email de {partner.name}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              autoFocus
              value={email}
              disabled={busy}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleInvite(); if (e.key === 'Escape' && !busy) setOpen(false); }}
              placeholder="pessoa@exemplo.pt"
              className={inputCls}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInvite}
                disabled={busy || !email.trim()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-900 hover:bg-brand-800 text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {busy ? 'A enviar...' : 'Enviar convite'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setRowError(''); }}
                disabled={busy}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40"
                title="Cancelar"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            É criada a conta, ligada a esta ficha, e enviado um email para a pessoa definir a sua
            password.
          </p>
          {rowError && (
            <p className="mt-2 flex items-start gap-2 text-xs text-red-500" role="alert">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {rowError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const InviteMemberSection = () => {
  const [, setTick] = useState(0);
  const [accounts, setAccounts] = useState<Record<string, LinkedAccount>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Carrega os perfis para saber quais fichas já têm conta. Cancelável: se a
  // secção desmontar (ou houver recarga) o resultado antigo é descartado.
  useEffect(() => {
    if (!isAdmin()) return;
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    fetchAllProfiles()
      .then(result => {
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.error || 'Não foi possível carregar as contas existentes.');
          setAccounts({});
          return;
        }
        const map: Record<string, LinkedAccount> = {};
        (result.data as UserProfile[]).forEach(profile => {
          if (profile.partner_id) {
            map[profile.partner_id] = { email: profile.email, role: profile.role };
          }
        });
        setAccounts(map);
      })
      .catch(err => {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error('[InviteMemberSection] fetchAllProfiles falhou:', err);
        setLoadError('Não foi possível carregar as contas existentes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadKey]);

  if (!isAdmin()) return null;

  const governanceMembers = PARTNERS
    .filter(p => p.category === 'Governança')
    .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || a.name.localeCompare(b.name));

  const withoutAccount = governanceMembers.filter(p => !accounts[p.id]).length;

  return (
    <div className="mt-6 animate-fadeInUpSlow delay-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm">
          <h3 className="font-medium text-brand-900 flex items-center gap-2">
            <Mail size={16} /> Convidar Membros
            <span className="ml-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Governança
            </span>
            {!loading && withoutAccount > 0 && (
              <span className="ml-1 bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                {withoutAccount} sem conta
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={() => setReloadKey(k => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-brand-900 uppercase tracking-widest transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {loading ? 'A carregar' : 'Atualizar'}
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Cada ficha de Governança pode ter uma conta associada, para o próprio membro editar o
            seu perfil. As fichas sem conta podem ser convidadas por email abaixo.
          </p>

          {loadError && (
            <p className="mb-4 flex items-start gap-2 text-xs text-red-500" role="alert">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {loadError}
            </p>
          )}

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {governanceMembers.length === 0 ? (
                <p className="px-4 py-6 text-center text-slate-400 text-xs">
                  Nenhuma ficha de Governança registada.
                </p>
              ) : (
                governanceMembers.map(partner => (
                  <MemberRow
                    key={partner.id}
                    partner={partner}
                    account={accounts[partner.id]}
                    onInvited={() => { if (mountedRef.current) setReloadKey(k => k + 1); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
