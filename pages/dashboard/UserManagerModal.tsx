import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody } from '../../components/ui/Modals';
import { fetchAllProfiles, updateUserRole } from '../../App';
import { Shield, User, Crown, Loader2 } from 'lucide-react';

type Profile = { id: string; user_id: string; name: string; email: string; role: string; created_at: string };

const ROLE_CONFIG = {
  admin:  { label: 'Admin',   icon: Crown,  color: 'bg-sand-400 text-brand-900',      desc: 'Acesso total + gestão de utilizadores' },
  editor: { label: 'Editor',  icon: Shield, color: 'bg-brand-100 text-brand-900',     desc: 'Pode criar e editar conteúdo' },
  membro: { label: 'Membro',  icon: User,   color: 'bg-slate-100 text-slate-600',     desc: 'Acesso de leitura' },
};

export const UserManagerModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchAllProfiles().then(data => { setProfiles(data); setLoading(false); });
  }, [isOpen]);

  const handleRoleChange = async (profileId: string, newRole: 'admin' | 'editor' | 'membro') => {
    setUpdating(profileId);
    const ok = await updateUserRole(profileId, newRole);
    if (ok) setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
    setUpdating(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center">
            <Crown size={16} className="text-sand-400" />
          </div>
          <div>
            <div className="font-semibold text-brand-900 text-base">Gestão de Utilizadores</div>
            <div className="text-xs text-slate-400 font-normal">Atribua permissões aos membros da plataforma</div>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Role legend */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG.admin][]).map(([role, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={role} className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                  <Icon size={10} /> {cfg.label}
                </span>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{cfg.desc}</p>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">Nenhum utilizador encontrado.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map(profile => {
              const roleCfg = ROLE_CONFIG[profile.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.membro;
              const Icon = roleCfg.icon;
              const isUpdating = updating === profile.id;
              return (
                <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-brand-700 font-semibold text-sm">
                    {profile.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <div className="font-medium text-slate-900 text-sm truncate">{profile.name}</div>
                    <div className="text-xs text-slate-400 truncate">{profile.email}</div>
                  </div>
                  {/* Role selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isUpdating ? (
                      <Loader2 size={16} className="animate-spin text-slate-400" />
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleCfg.color}`}>
                        <Icon size={10} /> {roleCfg.label}
                      </span>
                    )}
                    <select
                      value={profile.role}
                      onChange={e => handleRoleChange(profile.id, e.target.value as 'admin' | 'editor' | 'membro')}
                      disabled={isUpdating}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-brand-900 cursor-pointer hover:border-slate-300 transition-colors disabled:opacity-50"
                    >
                      <option value="membro">Membro</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};
