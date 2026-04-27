import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SectionWrapper, Card, Input, Button, Badge, PremiumLoader } from '../../components/ui';
import { LoginModal } from '../../components/ui';
import { EVENTS, AUTH_SESSION } from '../../store/app.store';
import { submitCommunityMedia } from '../../services/community-media.service';
import { subscribeToNewsletter, createPreCadastro } from '../../services/precadastros.service';
import { saveCommunityMediaBlob } from '../../services/media.service';
import { supabase } from '../../supabaseClient';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Event } from '../../types';
import { CheckCircle, Image as ImageIcon, Video, ArrowLeft, Check, UserPlus, Link as LinkIcon, FileUp, Loader2 } from 'lucide-react';
import { ColaborarSchema } from '../../validation/schemas';

export const EventoColaborarPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>(() =>
    AUTH_SESSION.isLoggedIn ? 'upload' : 'link'
  );
  const [previewUrl, setPreviewUrl] = useState('');

  const [formData, setFormData] = useState({
    authorName: '',
    email: '',
    url: '',
    type: 'image' as 'image' | 'video',
    message: '',
    agreedToTerms: false,
    subscribeNewsletter: false
  });

  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const isLoggedIn = AUTH_SESSION.isLoggedIn;
  const [loggedUserIdentity, setLoggedUserIdentity] = useState({ name: '', email: '' });

  useEffect(() => {
    setTimeout(() => {
      setEvent(EVENTS.find(e => e.id === id));
      setLoading(false);
    }, 400);
  }, [id]);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoggedUserIdentity({ name: '', email: '' });
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const fallbackEmail = user.email || AUTH_SESSION.displayName || '';
      const fallbackName = user.user_metadata?.name
        || fallbackEmail.split('@')[0]?.replace(/[._-]+/g, ' ')
        || 'Membro autenticado';
      setLoggedUserIdentity({
        name: fallbackName.trim(),
        email: fallbackEmail.trim(),
      });
    }).catch(() => {
      const fallbackEmail = AUTH_SESSION.displayName || '';
      setLoggedUserIdentity({
        name: fallbackEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Membro autenticado',
        email: fallbackEmail,
      });
    });
  }, [isLoggedIn]);

  usePageMeta("Colaborar – Fundacao Luso-Brasileira", event ? `Enviar memoria do evento ${event.title}` : "Enviar memoria");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const effectiveAuthorName = isLoggedIn ? loggedUserIdentity.name : formData.authorName;
    const effectiveEmail = isLoggedIn ? loggedUserIdentity.email : formData.email;

    const parsed = ColaborarSchema.safeParse({
      authorName: effectiveAuthorName,
      email: effectiveEmail,
      url: formData.url,
      message: formData.message || undefined,
      agreedToTerms: formData.agreedToTerms || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Dados inválidos.');
      return;
    }

    setError('');
    setSubmitting(true);

    // Não-autenticados: criar pré-cadastro como colaborador automaticamente
    if (!isLoggedIn) {
      createPreCadastro({
        name: effectiveAuthorName,
        email: effectiveEmail,
        type: 'individual',
        registrationType: 'colaborador',
        message: `Enviou memória do evento: ${event.title}`,
      });
    } else if (formData.subscribeNewsletter && effectiveEmail) {
      subscribeToNewsletter(effectiveEmail);
    }

    const result = await submitCommunityMedia({
      eventId: event.id,
      authorName: effectiveAuthorName,
      email: effectiveEmail,
      url: formData.url,
      type: formData.type,
      message: formData.message
    });
    setSubmitting(false);
    if (result) {
      setSuccess(true);
    } else {
      setError('Erro ao enviar memória. Tente novamente.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];

          const type = file.type.startsWith('video/') ? 'video' : 'image';

          // Show preview immediately
          setPreviewUrl(URL.createObjectURL(file));
          setFormData(prev => ({ ...prev, type: type }));
          setUploadingMedia(true);

          try {
              const publicUrl = await saveCommunityMediaBlob(file);
              setFormData(prev => ({ ...prev, url: publicUrl }));
              setError('');
          } catch (err: any) {
              if (import.meta.env.DEV) console.error(err);
              setPreviewUrl('');
              setFormData(prev => ({ ...prev, url: '' }));
              setError(err?.message || "Erro ao salvar arquivo. Tente novamente.");
          } finally {
              setUploadingMedia(false);
          }
      }
  };

  // Resolve preview for URL inputs
  useEffect(() => {
      if (uploadMode === 'link' && formData.url.startsWith('http')) {
          setPreviewUrl(formData.url);
      }
  }, [formData.url, uploadMode]);

  if (loading) return <PremiumLoader />;

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-900 text-white"><p>Evento invalido.</p></div>;
  }

  return (
    <div className="min-h-screen bg-brand-900 pt-28 pb-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-brand-800 rounded-full blur-[150px] opacity-40"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-black rounded-full blur-[120px] opacity-60"></div>
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

      <SectionWrapper className="relative z-10">
        <div className="mb-8 max-w-2xl mx-auto">
           <Button variant="ghost" onClick={() => navigate(`/eventos/${id}`)} className="pl-0 text-white/50 hover:text-white gap-2 hover:bg-transparent">
              <ArrowLeft size={16} /> Cancelar e voltar
           </Button>
        </div>

        <div className="max-w-2xl mx-auto">
           {success ? (
             <Card variant="dark" className="p-12 md:p-16 text-center animate-in zoom-in-95 duration-500 bg-brand-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden border-white/10">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-green-500/20">
                   <CheckCircle size={40} />
                </div>
                <h1 className="text-3xl font-light text-white mb-4 tracking-tight">Memoria Recebida</h1>
                <p className="text-white/60 text-lg font-light mb-10 max-w-lg mx-auto leading-relaxed">
                   Sua foto ou video foi enviado para curadoria. <br/>Apos aprovacao, ele aparecera na Galeria da Comunidade deste evento.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                   <Button variant="white" onClick={() => navigate(`/eventos/${id}`)}>Ver pagina do evento</Button>
                   <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { setSuccess(false); setFormData({...formData, url: '', message: ''}); setPreviewUrl(''); }}>Enviar outra</Button>
                </div>
             </Card>
           ) : (
             <>
                <Card variant="dark" className="p-8 md:p-12 rounded-[2.5rem] shadow-2xl bg-white/5 backdrop-blur-xl relative overflow-hidden animate-fadeInUpSlow border-white/10 mb-8">

                    <div className="text-center mb-10">
                    <Badge variant="gold" className="mb-4">Colaboracao</Badge>
                    <h1 className="text-3xl md:text-4xl font-light text-white mb-3 tracking-tight">Adicionar Memoria</h1>
                    <p className="text-white/50 font-light text-lg">
                        {event.title}
                    </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Tipo de Midia</label>
                        <div className="flex gap-4">
                            <button
                            type="button"
                            onClick={() => setFormData({...formData, type: 'image'})}
                            className={`flex-1 py-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${formData.type === 'image' ? 'bg-sand-400 text-brand-900 border-sand-400 shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}
                            >
                            <ImageIcon size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">Foto</span>
                            </button>
                            <button
                            type="button"
                            onClick={() => setFormData({...formData, type: 'video'})}
                            className={`flex-1 py-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${formData.type === 'video' ? 'bg-sand-400 text-brand-900 border-sand-400 shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}
                            >
                            <Video size={20} />
                            <span className="text-xs font-bold uppercase tracking-wider">Video</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end mb-2 px-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Foto ou Video da Memoria</label>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                                <button type="button" disabled={uploadingMedia} onClick={() => setUploadMode('upload')} className={`transition-colors pb-1 border-b-2 disabled:opacity-40 ${uploadMode === 'upload' ? 'text-sand-400 border-sand-400' : 'text-white/40 border-transparent hover:text-white'}`}>Upload</button>
                                <button type="button" disabled={uploadingMedia} onClick={() => setUploadMode('link')} className={`transition-colors pb-1 border-b-2 disabled:opacity-40 ${uploadMode === 'link' ? 'text-sand-400 border-sand-400' : 'text-white/40 border-transparent hover:text-white'}`}>Link URL</button>
                            </div>
                        </div>

                        {uploadMode === 'upload' ? (
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,video/mp4"
                                    onChange={handleFileUpload}
                                    disabled={uploadingMedia}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                <div className="w-full h-24 border border-dashed border-white/20 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-2 group-hover:bg-white/10 group-hover:border-sand-400/50 transition-all">
                                    {uploadingMedia ? (
                                        <>
                                            <Loader2 size={24} className="text-sand-400 animate-spin" />
                                            <span className="text-xs text-sand-200 font-medium">
                                                A carregar ficheiro...
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <FileUp size={24} className="text-white/40 group-hover:text-sand-400 transition-colors" />
                                            <span className="text-xs text-white/50 font-light group-hover:text-white transition-colors">
                                                Clique para carregar do dispositivo
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input
                                    aria-label="URL da mídia"
                                    required={uploadMode === 'link'}
                                    variant="dark"
                                    value={formData.url.includes('supabase.co/storage') ? '' : formData.url}
                                    disabled={uploadingMedia}
                                    onChange={(e: any) => {
                                        setFormData({...formData, url: e.target.value});
                                        setPreviewUrl(e.target.value);
                                    }}
                                    placeholder={formData.type === 'image' ? "https://..." : "https://youtube.com/..."}
                                    className="pl-12 font-mono text-sm"
                                />
                                <LinkIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
                            </div>
                        )}

                        <p className="text-[10px] text-white/30 ml-3 font-light pt-1">* {uploadMode === 'upload' ? 'Suportamos JPG, PNG, WEBP e MP4 ate 5MB. Documentos nao sao aceitos neste fluxo.' : 'Cole o link direto da imagem ou video.'}</p>
                        <p className="text-[10px] text-white/30 ml-3 font-light">Apos aprovacao, a contribuicao aparecera na Galeria da Comunidade da pagina deste evento.</p>
                        {uploadingMedia && (
                            <div className="flex items-center gap-2 text-xs text-sand-200 ml-3 pt-1" role="status" aria-live="polite">
                                <Loader2 size={14} className="animate-spin" />
                                A carregar imagem ou vídeo para revisão...
                            </div>
                        )}

                        {previewUrl && (
                            <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 h-48 bg-white/5 relative animate-fade-in-up-small shadow-inner group">
                                {formData.type === 'video' ? (
                                    <div className="flex items-center justify-center h-full text-white/50">
                                        <Video size={32} />
                                    </div>
                                ) : (
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                )}
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] px-2 py-1 rounded">Preview</div>
                            </div>
                        )}
                    </div>

                    {!isLoggedIn ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Seu Nome</label>
                                <Input aria-label="Nome" required variant="dark" value={formData.authorName} onChange={(e: any) => setFormData({...formData, authorName: e.target.value})} placeholder="Como quer ser identificado" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Seu Email</label>
                                <Input aria-label="E-mail" required variant="dark" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} placeholder="Para contato" />
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">Envio autenticado</p>
                            <p className="text-sm text-white/70 font-light">
                                Você está a enviar esta memória como <span className="text-white font-medium">{loggedUserIdentity.name || 'membro autenticado'}</span>
                                {loggedUserIdentity.email ? <> · <span className="text-white/60">{loggedUserIdentity.email}</span></> : null}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Mensagem</label>
                        <textarea
                            aria-label="Mensagem"
                            rows={3}
                            value={formData.message}
                            onChange={e => setFormData({...formData, message: e.target.value})}
                            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-sand-400 focus:ring-1 focus:ring-sand-400/20 outline-none transition-all placeholder-white/20 text-base font-light text-white"
                            placeholder="Conte uma breve historia sobre este momento..."
                        />
                    </div>

                    <div className="pt-2 space-y-4">
                        {/* Checkbox Termos */}
                        <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${formData.agreedToTerms ? 'bg-sand-400 border-sand-400' : 'border-white/20 group-hover:border-white/40'}`}>
                                {formData.agreedToTerms && <Check size={14} className="text-brand-900 stroke-[3]" />}
                            </div>
                            <input
                                aria-label="Concordo com os termos"
                                type="checkbox"
                                className="hidden"
                                checked={formData.agreedToTerms}
                                onChange={e => setFormData({...formData, agreedToTerms: e.target.checked})}
                            />
                            <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors select-none">
                                Concordo que esta midia pode ser utilizada nos canais da Fundacao e aceito os <Link to="/termos" target="_blank" className="text-sand-400 hover:underline">Termos de Uso</Link>.
                            </span>
                        </label>

                        {/* Checkbox Newsletter */}
                        {!isLoggedIn && (
                            <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${formData.subscribeNewsletter ? 'bg-brand-700 border-brand-700' : 'border-white/20 group-hover:border-white/40'}`}>
                                    {formData.subscribeNewsletter && <Check size={14} className="text-white stroke-[3]" />}
                                </div>
                                <input
                                    aria-label="Receber novidades por e-mail"
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.subscribeNewsletter}
                                    onChange={e => setFormData({...formData, subscribeNewsletter: e.target.checked})}
                                />
                                <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors select-none">
                                    Quero receber novidades e atualizacoes da Fundacao por e-mail.
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="pt-4">
                        {!isLoggedIn && (
                          <p className="text-white/30 text-[10px] text-center mb-4 font-light leading-relaxed">
                            Ao enviar, ficará registado como colaborador da Fundação.<br />
                            O seu envio será analisado antes de ser publicado.
                          </p>
                        )}
                        {error && <p className="text-red-400 text-xs text-center mb-4 font-medium animate-pulse">{error}</p>}
                        <Button variant="gold" type="submit" className="w-full text-xs rounded-2xl py-5 shadow-[0_0_20px_rgba(201,175,136,0.15)] hover:shadow-[0_0_30px_rgba(201,175,136,0.3)]" disabled={submitting || uploadingMedia}>
                            {submitting ? 'Enviando...' : uploadingMedia ? 'Aguarde o upload...' : 'Enviar Memoria'}
                        </Button>
                    </div>
                    </form>
                </Card>

                {/* Member Invite Section */}
                {!isLoggedIn && (
                <div className="max-w-xl mx-auto text-center animate-fadeInUpSlow delay-100">
                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40 mb-4">
                        <UserPlus size={12} /> Comunidade
                    </div>
                    <p className="text-white/50 text-sm font-light mb-4">
                        Deseja participar mais ativamente das nossas iniciativas?
                    </p>
                    <Link to="/precadastro">
                        <button className="text-xs font-bold text-white border-b border-sand-400/50 pb-0.5 hover:text-sand-400 hover:border-sand-400 transition-all">
                            Solicitar convite para se tornar Membro
                        </button>
                    </Link>
                </div>
                )}
             </>
           )}
        </div>
      </SectionWrapper>
    </div>
  );
};
