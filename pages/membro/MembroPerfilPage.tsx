import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Upload, Loader2, User } from 'lucide-react';
import { SectionWrapper, Card, Badge, Button, Input, AccessDeniedModal, LoginModal, PremiumLoader } from '../../components/ui';
import { SocialIcons } from '../../components/ui';
import { PARTNERS, FLB_STATE_EVENT, isEditor } from '../../store/app.store';
import { updateMember } from '../../services/members.service';
import { saveMediaBlob } from '../../services/media.service';
import { usePageMeta } from '../../hooks/usePageMeta';

export const MembroPerfilPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<any>(null);

    useEffect(() => {
        const found = PARTNERS.find(p => p.id === id);
        if(found) setMember(found);

        const handleUpdate = () => {
            const updated = PARTNERS.find(p => p.id === id);
            if(updated) setMember(updated);
        }
        window.addEventListener(FLB_STATE_EVENT, handleUpdate);
        return () => window.removeEventListener(FLB_STATE_EVENT, handleUpdate);
    }, [id]);

    if (!member) return <PremiumLoader />;

    return (
        <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
            <SectionWrapper>
                <div className="mb-8 animate-fadeInUpSlow">
                    <Button variant="ghost" onClick={() => navigate('/membros')} className="pl-0 gap-2 text-slate-400 hover:text-brand-900">
                        <ArrowLeft size={16} /> Voltar para Lista
                    </Button>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fadeInUpSlow delay-100">
                    <div className="md:flex">
                        <div className="md:w-1/3 bg-slate-50 p-10 flex flex-col items-center justify-center border-r border-slate-100">
                            <div className="w-48 h-48 rounded-full bg-white p-2 shadow-lg mb-6">
                                <img src={member.image} alt={member.name} className="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                            </div>
                            <h2 className="text-2xl font-serif text-brand-900 text-center mb-2">{member.name}</h2>
                            <Badge variant="gold">{member.role || member.category}</Badge>

                            <div className="mt-8 flex gap-3 justify-center">
                                <SocialIcons links={member.socialLinks} variant="dark" size="sm" />
                            </div>

                            {isEditor() && (
                                <div className="mt-8 flex gap-2">
                                    <Button onClick={() => navigate(`/membro/${id}/editar`)} className="text-xs h-8">Editar Perfil</Button>
                                </div>
                            )}
                        </div>

                        <div className="md:w-2/3 p-10 md:p-14">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">Biografia</h3>
                            <p className="text-slate-600 font-light leading-relaxed text-lg mb-10 whitespace-pre-wrap">
                                {member.summary || member.bio || "Sem biografia disponivel."}
                            </p>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoria</h4>
                                    <p className="text-brand-900">{member.category}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pais / Origem</h4>
                                    <p className="text-brand-900">{member.country || "Nao informado"}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Website</h4>
                                    {member.website ? (
                                        <a href={member.website} target="_blank" rel="noreferrer" className="text-sand-500 hover:underline flex items-center gap-1">
                                            {member.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                                        </a>
                                    ) : <span className="text-slate-400">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </SectionWrapper>
        </div>
    );
};

export const MembroEditarPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({ name: '', role: '', bio: '', image: '', type: 'pessoa', category: '', country: '', website: '', socialLinks: {} });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePageMeta("Editar Perfil – Fundacao Luso-Brasileira", "Atualize as informacoes do seu perfil de membro.");

  useEffect(() => {
     if (!isEditor()) {
         setShowAccessDenied(true);
     }

     const found = PARTNERS.find(p => p.id === id);
     if (found) {
        setFormData({ ...found, socialLinks: found.socialLinks || {} });
     } else {
        setNotFound(true);
     }
  }, [id]);

  const handleSave = () => {
    if (!isEditor()) {
        setShowAccessDenied(true);
        return;
    }
    if (id) {
        setLoading(true);
        updateMember(id, formData);
        setTimeout(() => {
            setLoading(false);
            navigate(-1);
        }, 500);
    }
  };

  const handleChange = (field: string, value: string) => {
     setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (key: string, value: string) => {
    setFormData((prev: any) => ({
        ...prev,
        socialLinks: {
            ...prev.socialLinks,
            [key]: value
        }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    setUploading(true);
    try {
        const publicUrl = await saveMediaBlob(file);
        setFormData((prev: any) => ({ ...prev, image: publicUrl }));
    } catch (err) {
        if (import.meta.env.DEV) console.error('Upload error:', err);
    } finally {
        setUploading(false);
        e.target.value = '';
    }
  };

  const handleCloseDenied = () => {
      setShowAccessDenied(false);
      navigate('/membros');
  };

  if (notFound) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center">
           <Card className="p-8">
               <p className="text-slate-600 mb-4">Membro nao encontrado.</p>
               <Button onClick={() => navigate('/membros')}>Voltar</Button>
           </Card>
        </div>
      );
  }

  if (!isEditor() && showAccessDenied) {
      return (
        <>
            <div className="min-h-screen bg-page"></div>
            <AccessDeniedModal isOpen={showAccessDenied} onClose={handleCloseDenied} onLogin={() => setShowLogin(true)} />
            <LoginModal isOpen={showLogin} onClose={() => { setShowLogin(false); if(isEditor()) setShowAccessDenied(false); else handleCloseDenied(); }} />
        </>
      );
  }

  if (!formData.name && !loading) return null;

  return (
    <div className="min-h-screen pt-40 pb-20 bg-[#F8F9FB] flex items-center justify-center">
      <SectionWrapper>
         <div className="max-w-2xl mx-auto animate-fadeInUpSlow">
            <div className="mb-8">
              <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 gap-2 text-slate-400 hover:text-brand-900">
                <ArrowLeft size={20} /> Cancelar
              </Button>
            </div>

            <Card className="p-8 md:p-12 lusobrasil-border relative overflow-hidden bg-white/80 backdrop-blur-md">
               <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-900/15 to-sand-400/15" />

               <div className="text-center mb-10">
                 <h1 className="text-3xl font-light text-slate-900 mb-2">Editar Perfil</h1>
                 <p className="text-slate-500 font-light">Atualize as informacoes do membro.</p>
               </div>

               <div className="space-y-6">
                 <div>
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome de Exibicao</label>
                   <Input value={formData.name || ''} onChange={(e: any) => handleChange('name', e.target.value)} />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tipo</label>
                       <select
                            className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm"
                            value={formData.type || 'pessoa'}
                            onChange={e => handleChange('type', e.target.value)}
                        >
                            <option value="pessoa">Pessoa</option>
                            <option value="empresa">Empresa</option>
                        </select>
                     </div>

                     <div>
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Categoria</label>
                       <select
                            className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm"
                            value={formData.category || 'Parceiro Silver'}
                            onChange={e => handleChange('category', e.target.value)}
                        >
                            <option value="Parceiro Platinum">Parceiro Platinum</option>
                            <option value="Parceiro Gold">Parceiro Gold</option>
                            <option value="Parceiro Silver">Parceiro Silver</option>
                            <option value="Apoio Público">Apoio Público</option>
                            <option value="Outro Apoio">Outro Apoio</option>
                            <option value="Exposição">Exposição</option>
                            <option value="Governança">Governança</option>
                        </select>
                     </div>
                 </div>

                 <div>
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cargo / Funcao</label>
                   <Input value={formData.role || ''} onChange={(e: any) => handleChange('role', e.target.value)} placeholder="Ex: Presidente, CEO, Diretor..." />
                 </div>

                 {/* Secao de Imagem com Upload */}
                 <div>
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Foto / Logo</label>
                   <div className="flex gap-4 items-start">
                     {/* Preview */}
                     <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                       {formData.image ? (
                         <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <User size={32} className="text-slate-300" />
                       )}
                     </div>

                     {/* Upload e URL */}
                     <div className="flex-grow space-y-3">
                       <input
                         type="file"
                         ref={fileInputRef}
                         onChange={handleImageUpload}
                         accept="image/*"
                         className="hidden"
                       />
                       <button
                         type="button"
                         onClick={() => fileInputRef.current?.click()}
                         disabled={uploading}
                         className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                       >
                         {uploading ? (
                           <>
                             <Loader2 size={16} className="animate-spin" />
                             Enviando...
                           </>
                         ) : (
                           <>
                             <Upload size={16} />
                             Fazer Upload de Imagem
                           </>
                         )}
                       </button>
                       <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 uppercase">ou URL:</span>
                         <Input
                           value={formData.image || ''}
                           onChange={(e: any) => handleChange('image', e.target.value)}
                           placeholder="https://..."
                           className="pl-16 text-sm"
                         />
                       </div>
                     </div>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Pais</label>
                        <Input value={formData.country || ''} onChange={(e: any) => handleChange('country', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Website</label>
                        <Input value={formData.website || ''} onChange={(e: any) => handleChange('website', e.target.value)} />
                    </div>
                 </div>

                 <div className="pt-4 pb-2 border-t border-b border-slate-100/50">
                    <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest ml-1 mb-4 block">Redes Sociais</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">LinkedIn</label>
                            <Input value={formData.socialLinks?.linkedin || ''} onChange={(e: any) => handleSocialChange('linkedin', e.target.value)} className="py-2 px-4 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Instagram</label>
                            <Input value={formData.socialLinks?.instagram || ''} onChange={(e: any) => handleSocialChange('instagram', e.target.value)} className="py-2 px-4 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Facebook</label>
                            <Input value={formData.socialLinks?.facebook || ''} onChange={(e: any) => handleSocialChange('facebook', e.target.value)} className="py-2 px-4 text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Twitter</label>
                            <Input value={formData.socialLinks?.twitter || ''} onChange={(e: any) => handleSocialChange('twitter', e.target.value)} className="py-2 px-4 text-sm" />
                        </div>
                    </div>
                 </div>

                 <div className="pt-4">
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Biografia</label>
                   <textarea
                      rows={6}
                      className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm resize-none focus:border-sand-400 focus:ring-4 focus:ring-sand-400/10"
                      value={formData.bio || ''}
                      onChange={e => handleChange('bio', e.target.value)}
                   />
                 </div>

                 <div className="pt-6">
                    <Button onClick={handleSave} className="w-full text-xs py-4" disabled={loading}>
                       {loading ? 'Salvando...' : 'Salvar Alteracoes'}
                    </Button>
                 </div>
               </div>
            </Card>
         </div>
      </SectionWrapper>
    </div>
  );
};
