import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SectionWrapper, Card, Input, Button, Badge, PremiumLoader } from '../../components/ui';
import { LoginModal } from '../../components/ui';
import { EVENTS, AUTH_SESSION } from '../../store/app.store';
import { submitCommunityMedia } from '../../services/community-media.service';
import { subscribeToNewsletter } from '../../services/precadastros.service';
import { saveMediaBlob } from '../../services/media.service';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Event } from '../../types';
import { Upload, CheckCircle, Image as ImageIcon, Video, ArrowLeft, Check, UserPlus, Link as LinkIcon, FileUp, Lock } from 'lucide-react';
import { ColaborarSchema } from '../../validation/schemas';

export const EventoColaborarPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload');
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

  useEffect(() => {
    setTimeout(() => {
      setEvent(EVENTS.find(e => e.id === id));
      setLoading(false);
    }, 400);
  }, [id]);

  usePageMeta("Colaborar – Fundacao Luso-Brasileira", event ? `Enviar memoria do evento ${event.title}` : "Enviar memoria");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const parsed = ColaborarSchema.safeParse({
      authorName: formData.authorName,
      email: formData.email,
      url: formData.url,
      message: formData.message || undefined,
      agreedToTerms: formData.agreedToTerms || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Dados inválidos.');
      return;
    }

    setError('');
    setSubmitting(true);

    // Process Newsletter Subscription if checked
    if (formData.subscribeNewsletter && formData.email) {
        subscribeToNewsletter(formData.email);
    }

    setTimeout(() => {
      submitCommunityMedia({
        eventId: event.id,
        authorName: formData.authorName,
        email: formData.email,
        url: formData.url,
        type: formData.type,
        message: formData.message
      });
      setSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];

          // Basic validation
          if (file.size > 20 * 1024 * 1024) { // 20MB limit
              setError("O arquivo e muito grande. Maximo 20MB.");
              return;
          }

          // Determine type based on file
          const type = file.type.startsWith('video') ? 'video' : 'image';

          // Show preview immediately
          setPreviewUrl(URL.createObjectURL(file));
          setFormData(prev => ({ ...prev, type: type }));

          try {
              const publicUrl = await saveMediaBlob(file);
              setFormData(prev => ({ ...prev, url: publicUrl }));
              setError('');
          } catch (err) {
              if (import.meta.env.DEV) console.error(err);
              setError("Erro ao salvar arquivo. Tente novamente.");
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
          {/* Auth gate */}
          {!isLoggedIn && (
            <Card variant="dark" className="p-12 text-center border-white/10 mb-8 animate-fadeInUpSlow">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lock size={28} className="text-sand-400" />
              </div>
              <h2 className="text-2xl font-light text-white mb-3 tracking-tight">Conta necessária</h2>
              <p className="text-white/50 font-light mb-8 max-w-sm mx-auto leading-relaxed">
                Para enviar a sua memória do evento, precisa de ter uma conta registada na plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="gold" onClick={() => setShowLogin(true)} className="px-8 py-3 text-xs">
                  Entrar na conta
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-3 text-xs" onClick={() => navigate('/cadastro')}>
                  Criar conta grátis
                </Button>
              </div>
            </Card>
          )}

           {isLoggedIn && success ? (
             <Card variant="dark" className="p-12 md:p-16 text-center animate-in zoom-in-95 duration-500 bg-brand-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden border-white/10">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-green-500/20">
                   <CheckCircle size={40} />
                </div>
                <h1 className="text-3xl font-light text-white mb-4 tracking-tight">Memoria Recebida</h1>
                <p className="text-white/60 text-lg font-light mb-10 max-w-lg mx-auto leading-relaxed">
                   Sua contribuicao foi enviada para curadoria. <br/>Obrigado por enriquecer a historia da Fundacao.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                   <Button variant="white" onClick={() => navigate(`/eventos/${id}`)}>Voltar a Galeria</Button>
                   <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => { setSuccess(false); setFormData({...formData, url: '', message: ''}); setPreviewUrl(''); }}>Enviar outra</Button>
                </div>
             </Card>
           ) : isLoggedIn ? (
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
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Arquivo da Memoria</label>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                                <button type="button" onClick={() => setUploadMode('upload')} className={`transition-colors pb-1 border-b-2 ${uploadMode === 'upload' ? 'text-sand-400 border-sand-400' : 'text-white/40 border-transparent hover:text-white'}`}>Upload</button>
                                <button type="button" onClick={() => setUploadMode('link')} className={`transition-colors pb-1 border-b-2 ${uploadMode === 'link' ? 'text-sand-400 border-sand-400' : 'text-white/40 border-transparent hover:text-white'}`}>Link URL</button>
                            </div>
                        </div>

                        {uploadMode === 'upload' ? (
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                <div className="w-full h-24 border border-dashed border-white/20 rounded-2xl bg-white/5 flex flex-col items-center justify-center gap-2 group-hover:bg-white/10 group-hover:border-sand-400/50 transition-all">
                                    <FileUp size={24} className="text-white/40 group-hover:text-sand-400 transition-colors" />
                                    <span className="text-xs text-white/50 font-light group-hover:text-white transition-colors">
                                        Clique para carregar do dispositivo
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input
                                    required={uploadMode === 'link'}
                                    variant="dark"
                                    value={formData.url.includes('supabase.co/storage') ? '' : formData.url}
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

                        <p className="text-[10px] text-white/30 ml-3 font-light pt-1">* {uploadMode === 'upload' ? 'Suportamos JPG, PNG e MP4.' : 'Cole o link direto da imagem ou video.'}</p>

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

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Seu Nome</label>
                            <Input required variant="dark" value={formData.authorName} onChange={(e: any) => setFormData({...formData, authorName: e.target.value})} placeholder="Como quer ser identificado" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Seu Email</label>
                            <Input required variant="dark" type="email" value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} placeholder="Para contato" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-2">Mensagem</label>
                        <textarea
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
                        <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${formData.subscribeNewsletter ? 'bg-brand-700 border-brand-700' : 'border-white/20 group-hover:border-white/40'}`}>
                                {formData.subscribeNewsletter && <Check size={14} className="text-white stroke-[3]" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={formData.subscribeNewsletter}
                                onChange={e => setFormData({...formData, subscribeNewsletter: e.target.checked})}
                            />
                            <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors select-none">
                                Quero receber novidades e atualizacoes da Fundacao por e-mail.
                            </span>
                        </label>
                    </div>

                    <div className="pt-4">
                        {error && <p className="text-red-400 text-xs text-center mb-4 font-medium animate-pulse">{error}</p>}
                        <Button variant="gold" type="submit" className="w-full text-xs rounded-2xl py-5 shadow-[0_0_20px_rgba(201,175,136,0.15)] hover:shadow-[0_0_30px_rgba(201,175,136,0.3)]" disabled={submitting}>
                            {submitting ? 'Enviando...' : 'Enviar Memoria'}
                        </Button>
                    </div>
                    </form>
                </Card>

                {/* Member Invite Section */}
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
             </>
           ) : null}
        </div>
      </SectionWrapper>
    </div>
  );
};
