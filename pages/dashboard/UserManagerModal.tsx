import React, { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody } from '../../components/ui/Modals';
import { fetchAllProfiles, updateUserRole, linkUserToPartner } from '../../services/auth.service';
import { supabase } from '../../supabaseClient';
import { Shield, User, Crown, Loader2, Link2, Unlink, ChevronDown, Download } from 'lucide-react';
import type { UserProfile } from '../../types';

type PartnerOption = { id: string; name: string };

const ROLE_CONFIG = {
  admin:  { label: 'Admin',  icon: Crown,  color: 'bg-sand-400 text-brand-900' },
  editor: { label: 'Editor', icon: Shield, color: 'bg-brand-100 text-brand-900' },
  membro: { label: 'Membro', icon: User,   color: 'bg-slate-100 text-slate-600' },
};

const TYPE_LABEL: Record<string, string> = {
  individual: 'Individual',
  institucional: 'Institucional',
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}

// Inline partner picker: shows current partner name + button to change/remove
function PartnerCell({
  profile,
  partners,
  updating,
  onLink,
}: {
  profile: UserProfile;
  partners: PartnerOption[];
  updating: boolean;
  onLink: (profileId: string, partnerId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setSearch(''); return; }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const linked = profile.partner;

  if (updating) {
    return <Loader2 size={14} className="animate-spin text-slate-400" />;
  }

  return (
    <div ref={ref} className="relative">
      {linked ? (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[130px]">
            <Link2 size={9} />
            {linked.name}
          </span>
          <button
            onClick={() => onLink(profile.id, null)}
            title="Remover vínculo"
            className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors"
          >
            <Unlink size={12} />
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            title="Alterar membro vinculado"
            className="p-0.5 rounded text-slate-300 hover:text-brand-700 transition-colors"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="text-[11px] text-slate-400 hover:text-brand-700 flex items-center gap-1 transition-colors"
        >
          <Link2 size={11} /> Vincular
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar membro..."
              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-brand-700"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">Nenhum resultado</li>
            ) : (
              filtered.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => { onLink(profile.id, p.id); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {p.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const handleCsvExport = (profiles: UserProfile[]) => {
  const header = ['Nome', 'Email', 'Telefone', 'Tipo', 'Role', 'Perfil Vinculado', 'Criado em'];
  const rows = profiles.map(p => [
    p.name,
    p.email,
    p.phone || '',
    p.type,
    p.role,
    p.partner?.name || '',
    formatDate(p.created_at),
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'utilizadores.csv'; a.click();
  URL.revokeObjectURL(url);
};

export const UserManagerModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [partnerLinkingAvailable, setPartnerLinkingAvailable] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setPartnerLinkingAvailable(false);

      const profilesResult = await fetchAllProfiles();

      if (cancelled) return;

      if (!profilesResult.ok) {
        setProfiles([]);
        setPartners([]);
        setLoadError(profilesResult.error);
        setLoading(false);
        return;
      }

      setProfiles(profilesResult.data);
      setPartnerLinkingAvailable(profilesResult.capabilities.partnerLinking);

      if (profilesResult.capabilities.partnerLinking) {
        const partnerResult = await supabase.from('partners').select('id, name').order('name');

        if (cancelled) return;

        if (partnerResult.error) {
          setProfiles([]);
          setPartners([]);
          setLoadError('Erro ao carregar membros vinculáveis.');
          setLoading(false);
          return;
        }

        setPartners((partnerResult.data || []) as PartnerOption[]);
      } else {
        setPartners([]);
      }

      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleRoleChange = async (profileId: string, newRole: 'admin' | 'editor' | 'membro') => {
    setUpdating(profileId + ':role');
    const ok = await updateUserRole(profileId, newRole);
    if (ok) setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    setUpdating(null);
  };

  const handleLink = async (profileId: string, partnerId: string | null) => {
    setUpdating(profileId + ':link');
    const ok = await linkUserToPartner(profileId, partnerId);
    if (ok) {
      const partnerObj = partnerId ? (partners.find(p => p.id === partnerId) ?? null) : null;
      setProfiles(prev => prev.map(p =>
        p.id === profileId ? { ...p, partner_id: partnerId, partner: partnerObj } : p
      ));
    }
    setUpdating(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center">
            <Crown size={16} className="text-sand-400" />
          </div>
          <div>
            <div className="font-semibold text-brand-900 text-base">Gestão de Utilizadores</div>
            <div className="text-xs text-slate-400 font-normal">Permissões e vínculos com membros da organização</div>
          </div>
        </div>
        {!loading && profiles.length > 0 && (
          <button
            onClick={() => handleCsvExport(profiles)}
            title="Exportar CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={13} /> Exportar
          </button>
        )}
      </ModalHeader>

      <ModalBody>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : loadError ? (
          <p className="text-center text-red-500 text-sm py-10">{loadError}</p>
        ) : profiles.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">Nenhum utilizador encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Utilizador</th>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Tipo</th>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Telefone</th>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Desde</th>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2 pr-3">Role</th>
                  <th className="text-left text-xs font-medium text-slate-400 pb-2">
                    {partnerLinkingAvailable ? 'Membro vinculado' : 'Vínculo com membro'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profiles.map(profile => {
                  const roleCfg = ROLE_CONFIG[profile.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.membro;
                  const RoleIcon = roleCfg.icon;
                  const isRoleUpdating = updating === profile.id + ':role';
                  const isLinkUpdating = updating === profile.id + ':link';
                  return (
                    <tr key={profile.id} className="group hover:bg-slate-50/50 transition-colors">
                      {/* Utilizador */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-brand-700 font-semibold text-sm">
                            {profile.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 text-sm truncate max-w-[160px]">{profile.name}</div>
                            <div className="text-xs text-slate-400 truncate max-w-[160px]">{profile.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Tipo */}
                      <td className="py-3 pr-3">
                        <span className="text-xs text-slate-500">{TYPE_LABEL[profile.type] ?? profile.type ?? '—'}</span>
                      </td>
                      {/* Telefone */}
                      <td className="py-3 pr-3">
                        <span className="text-xs text-slate-400">{profile.phone || '—'}</span>
                      </td>
                      {/* Desde */}
                      <td className="py-3 pr-3">
                        <span className="text-xs text-slate-400">{formatDate(profile.created_at)}</span>
                      </td>
                      {/* Role */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          {isRoleUpdating ? (
                            <Loader2 size={14} className="animate-spin text-slate-400" />
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleCfg.color}`}>
                              <RoleIcon size={9} /> {roleCfg.label}
                            </span>
                          )}
                          <select
                            value={profile.role}
                            onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'editor' | 'membro')}
                            disabled={isRoleUpdating}
                            className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-white text-slate-700 focus:outline-none focus:border-brand-900 cursor-pointer hover:border-slate-300 transition-colors disabled:opacity-50"
                          >
                            <option value="membro">Membro</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                      {/* Membro vinculado */}
                      <td className="py-3">
                        {partnerLinkingAvailable ? (
                          <PartnerCell
                            profile={profile}
                            partners={partners}
                            updating={isLinkUpdating}
                            onLink={handleLink}
                          />
                        ) : (
                          <span className="text-xs text-amber-700">Indisponível neste banco</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!partnerLinkingAvailable && (
              <p className="mt-3 text-xs text-amber-700">
                Vínculo com membro indisponível neste banco. Falta aplicar a migração de `profiles.partner_id`.
              </p>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};
