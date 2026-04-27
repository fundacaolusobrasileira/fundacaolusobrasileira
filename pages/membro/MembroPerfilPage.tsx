import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resolveLink, safeUrl } from '../../utils/url';
import { ArrowLeft, ExternalLink, Upload, Loader2, User, Images, Gift, ArrowRight } from 'lucide-react';
import { SectionWrapper, Card, Badge, Button, Input, AccessDeniedModal, LoginModal, PremiumLoader } from '../../components/ui';
import { SocialIcons } from '../../components/ui';
import { PARTNERS, FLB_STATE_EVENT, isEditor, showToast, AUTH_LOADING, AUTH_SESSION } from '../../store/app.store';
import { updateMember } from '../../services/members.service';
import { saveMediaBlob } from '../../services/media.service';
import { fetchBenefitsByPartner } from '../../services/benefits.service';
import { PartnerGalleryEditor } from './PartnerGalleryEditor';
import { BenefitEditorSection } from './BenefitEditorSection';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Benefit } from '../../types';

const slugifyMemberName = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const findMemberByRouteId = (routeId?: string) =>
  PARTNERS.find(p => p.id === routeId) ?? PARTNERS.find(p => slugifyMemberName(p.name) === routeId);

export const MembroPerfilPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<any>(null);
    const [benefits, setBenefits] = useState<Benefit[]>([]);

    useEffect(() => {
        const findMember = () => findMemberByRouteId(id);

        const found = findMember();
        if(found) {
            if (found.active === false && !isEditor()) {
                navigate('/parceiros', { replace: true });
                return;
            }
            setMember(found);
            fetchBenefitsByPartner(found.id).then(data => setBenefits(data.filter(b => b.active)));
        }

        const handleUpdate = () => {
            const updated = findMember();
            if(updated) {
                if (updated.active === false && !isEditor()) {
                    navigate('/parceiros', { replace: true });
                    return;
                }
                setMember(updated);
            }
        }
        window.addEventListener(FLB_STATE_EVENT, handleUpdate);
        return () => window.removeEventListener(FLB_STATE_EVENT, handleUpdate);
    }, [id]);

    if (!member) return <PremiumLoader />;

    return (
        <div className="min-h-screen pt-32 pb-20 bg-[#F8F9FB]">
            <SectionWrapper>
                <div className="mb-8 animate-fadeInUpSlow">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 gap-2 text-slate-400 hover:text-brand-900">
                        <ArrowLeft size={16} /> Voltar
                    </Button>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fadeInUpSlow delay-100">
                    <div className="md:flex">
                        <div className="md:w-1/3 bg-slate-50 p-10 flex flex-col items-center justify-center border-r border-slate-100">
                            <div className="w-48 h-48 rounded-full bg-white p-2 shadow-lg mb-6">
                                {/* BUG 7 FIX: fallback when image is missing */}
                            {member.image
                              ? <img src={member.image} alt={member.name} className="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                              : <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center text-4xl text-slate-400 font-serif">{member.name?.charAt(0)}</div>
                            }
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
                                {member.full || member.summary || member.bio || "Sem biografia disponivel."}
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
                                    {safeUrl(member.website) ? (
                                        <a href={safeUrl(member.website)} target="_blank" rel="noreferrer" className="text-sand-500 hover:underline flex items-center gap-1">
                                            {member.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                                        </a>
                                    ) : <span className="text-slate-400">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gallery section */}
                {member.gallery && member.gallery.filter((g: any) => g.status === 'published').length > 0 && (
                    <div className="mt-10 animate-fadeInUpSlow delay-200">
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden p-10 md:p-14">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Images size={13} /> Galeria
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {member.gallery
                                    .filter((g: any) => g.status === 'published')
                                    .map((item: any) => (
                                        <div key={item.id} className="rounded-xl overflow-hidden aspect-square">
                                            <img
                                                src={item.url}
                                                alt={item.caption || ''}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* Legaltech Space special area */}
                {(member.id === 'legaltech-space' || member.name === 'Legaltech Space Group') && (
                    <div className="mt-10 animate-fadeInUpSlow delay-200">
                        <div className="bg-brand-900 rounded-[2.5rem] shadow-xl overflow-hidden p-10 md:p-14 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(201,175,136,0.12),transparent_60%)] pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sand-400 mb-2">Espaço Dedicado</p>
                                    <h3 className="text-2xl md:text-3xl font-serif text-white mb-3">Legaltech Space Group</h3>
                                    <p className="text-white/60 font-light leading-relaxed max-w-lg">
                                        Conheça o ecossistema, os serviços e a equipa do espaço de inovação jurídica e tecnológica da Fundação Luso-Brasileira.
                                    </p>
                                </div>
                                <Link
                                    to="/legaltech-space"
                                    className="shrink-0 inline-flex items-center gap-3 px-7 py-4 bg-sand-400 text-brand-900 text-xs font-bold uppercase tracking-widest rounded-full hover:bg-sand-300 transition-colors"
                                >
                                    Visitar Espaço <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Benefits section */}
                {benefits.length > 0 && (
                    <div className="mt-10 animate-fadeInUpSlow delay-300">
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden p-10 md:p-14">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Gift size={13} /> Benefícios
                            </h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {benefits.map(b => (
                                    <div key={b.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-3 ${
                                            b.category === 'desconto' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            b.category === 'acesso'   ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            b.category === 'serviço'  ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                                        'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {b.category.charAt(0).toUpperCase() + b.category.slice(1)}
                                        </span>
                                        <h4 className="font-semibold text-slate-900 text-sm mb-1">{b.title}</h4>
                                        {b.description && <p className="text-xs text-slate-500 leading-relaxed mb-3">{b.description}</p>}
                                        {(() => {
                                            const resolved = resolveLink(b.link);
                                            if (!resolved) return null;
                                            const className = 'text-xs font-medium text-brand-700 hover:underline flex items-center gap-1';
                                            return resolved.isExternal ? (
                                                <a href={resolved.href} target="_blank" rel="noreferrer" className={className}>
                                                    Saber mais <ExternalLink size={10} />
                                                </a>
                                            ) : (
                                                <Link to={resolved.href} className={className}>
                                                    Saber mais <ArrowRight size={10} />
                                                </Link>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </SectionWrapper>
        </div>
    );
};

export const MembroEditarPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({ name: '', role: '', summary: '', full: '', image: '', type: 'pessoa', category: '', country: '', website: '', socialLinks: {}, gallery: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'galeria' | 'beneficios'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePageMeta("Editar Perfil – Fundacao Luso-Brasileira", "Atualize as informacoes do seu perfil de membro.");

  useEffect(() => {
     const editor = isEditor();
     if (!editor) {
         setShowAccessDenied(true);
     }

     const found = findMemberByRouteId(id);
     if (found) {
        setFormData({ ...found, socialLinks: found.socialLinks || {} });
     } else {
        setNotFound(true);
     }
  }, [id]);

  // BUG 4 FIX: await updateMember and show error if it fails
  const handleSave = async () => {
    const editor = isEditor();
    if (!editor) {
        setShowAccessDenied(true);
        return;
    }
    if (id) {
        setLoading(true);
        const ok = await updateMember(id, formData);
        setLoading(false);
        if (!ok) return;
        // After save, slug IDs may have been replaced with UUIDs in PARTNERS.
        // Find the member's current id to navigate to the correct profile URL.
        const saved = findMemberByRouteId(id) ?? PARTNERS.find(p => p.name === formData.name);
        navigate(saved ? `/membro/${saved.id}` : '/dashboard');
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
    } catch (err: any) {
        showToast(`Erro no upload: ${err?.message || 'erro desconhecido'}`, 'error');
    } finally {
        setUploading(false);
        e.target.value = '';
    }
  };

  const handleCloseDenied = () => {
      setShowAccessDenied(false);
      navigate('/dashboard');
  };

  if (notFound) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center">
           <Card className="p-8">
               <p className="text-slate-600 mb-4">Membro nao encontrado.</p>
               <Button onClick={() => navigate('/dashboard')}>Voltar</Button>
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

               <div className="text-center mb-8">
                 <h1 className="text-3xl font-light text-slate-900 mb-2">Editar Perfil</h1>
                 <p className="text-slate-500 font-light">Atualize as informacoes do membro.</p>
               </div>

               {/* Tabs */}
               <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-8">
                 {([
                   { key: 'info',      label: 'Informação', icon: User },
                   { key: 'galeria',   label: 'Galeria',    icon: Images },
                   { key: 'beneficios', label: 'Benefícios', icon: Gift },
                 ] as const).map(({ key, label, icon: Icon }) => (
                   <button
                     key={key}
                     onClick={() => setActiveTab(key)}
                     className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                       activeTab === key
                         ? 'bg-white text-brand-900 shadow-sm'
                         : 'text-slate-500 hover:text-slate-700'
                     }`}
                   >
                     <Icon size={13} /> {label}
                   </button>
                 ))}
               </div>

               {activeTab === 'galeria' && id && (
                 <PartnerGalleryEditor
                   gallery={formData.gallery || []}
                   albums={formData.albums || []}
                   onChange={(gallery, albums) => setFormData((prev: any) => ({ ...prev, gallery, albums }))}
                 />
               )}

               {activeTab === 'beneficios' && id && (
                 <BenefitEditorSection partnerId={formData.id} />
               )}

               <div className={activeTab === 'info' ? 'space-y-6' : 'hidden'}>
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
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cargo Institucional</label>
                   <select
                        className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm"
                        value={formData.tier || ''}
                        onChange={e => handleChange('tier', e.target.value || undefined)}
                    >
                        <option value="">Sem cargo definido</option>
                        <option value="presidente">Presidente</option>
                        <option value="direcao">Direção</option>
                        <option value="secretario-geral">Secretário Geral</option>
                        <option value="vogal">Vogal</option>
                    </select>
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
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Bio (curta, para listagens)</label>
                   <textarea
                      rows={2}
                      className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm resize-none focus:border-sand-400 focus:ring-4 focus:ring-sand-400/10"
                      value={formData.bio || ''}
                      onChange={e => handleChange('bio', e.target.value)}
                   />
                 </div>

                 <div className="pt-4">
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Resumo Curto</label>
                   <textarea
                      rows={3}
                      className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm resize-none focus:border-sand-400 focus:ring-4 focus:ring-sand-400/10"
                      value={formData.summary || ''}
                      onChange={e => handleChange('summary', e.target.value)}
                   />
                 </div>

                 <div className="pt-4">
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Biografia Completa</label>
                   <textarea
                      rows={8}
                      className="w-full px-6 py-4 rounded-xl border border-slate-200 bg-white/60 focus:bg-white outline-none text-sm resize-none focus:border-sand-400 focus:ring-4 focus:ring-sand-400/10"
                      value={formData.full || ''}
                      onChange={e => handleChange('full', e.target.value)}
                   />
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                   <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Configurações</label>
                   <div className="grid grid-cols-3 gap-4">
                     <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                       <div className="flex items-center gap-2">
                         <button
                           type="button"
                           aria-label="Alternar status do membro"
                           onClick={() => setFormData((prev: any) => ({ ...prev, active: !(prev.active !== false) }))}
                           className={`relative w-10 h-5 rounded-full transition-colors ${formData.active !== false ? 'bg-green-500' : 'bg-slate-300'}`}
                         >
                           <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${formData.active !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                         <span className="text-xs font-medium text-slate-700">{formData.active !== false ? 'Ativo' : 'Inativo'}</span>
                       </div>
                     </div>
                     <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Destaque</label>
                       <div className="flex items-center gap-2">
                         <button
                           type="button"
                           aria-label="Alternar destaque do membro"
                           onClick={() => setFormData((prev: any) => ({ ...prev, featured: !prev.featured }))}
                           className={`relative w-10 h-5 rounded-full transition-colors ${formData.featured ? 'bg-sand-400' : 'bg-slate-300'}`}
                         >
                           <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${formData.featured ? 'translate-x-5' : 'translate-x-0'}`} />
                         </button>
                         <span className="text-xs font-medium text-slate-700">{formData.featured ? 'Sim' : 'Não'}</span>
                       </div>
                     </div>
                     <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ordem</label>
                       <input
                         type="number"
                         className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm outline-none focus:border-sand-400"
                         value={formData.order ?? 0}
                         onChange={e => setFormData((prev: any) => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                       />
                     </div>
                   </div>
                 </div>

               </div>

               {/* Save button: visible for info and galeria tabs */}
               {activeTab !== 'beneficios' && (
                 <div className="pt-6">
                    <Button onClick={handleSave} className="w-full text-xs py-4" disabled={loading}>
                       {loading ? 'Salvando...' : 'Salvar Alteracoes'}
                    </Button>
                 </div>
               )}
            </Card>
         </div>
      </SectionWrapper>
    </div>
  );
};
