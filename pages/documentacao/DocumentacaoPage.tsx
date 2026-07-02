import React, { useState, useEffect } from 'react';
import { FileText, Download, ChevronDown, ChevronUp, Lock, CheckCircle } from 'lucide-react';
import { SectionWrapper, Reveal, Modal, ModalBody, Button, Input } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { createEstatutosLead } from '../../services/estatutos-leads.service';
import { getDocumentsByCategory } from '../../services/documents.service';
import { showToast, FLB_STATE_EVENT } from '../../store/app.store';
import type { DocumentCategory } from '../../types';

type DocItem = {
  label: string;
  file: string;
  year?: number | null;
  gated?: boolean;
};

type DocGroup = {
  title: string;
  description: string;
  docs: DocItem[];
};

type DocGroupDef = {
  title: string;
  description: string;
  category: DocumentCategory;
  staticDocs?: DocItem[];
};

const isLegacyEstatutosDoc = (category: DocumentCategory, title: string, fileUrl: string) =>
  category === 'estatutos' &&
  title.trim().toLowerCase() === 'estatutos em vigor' &&
  fileUrl.trim() === '/Estatutos.pdf';

const GROUP_DEFS: DocGroupDef[] = [
  {
    title: 'Estatutos',
    description: 'Versao consolidada dos estatutos em vigor da Fundacao Luso-Brasileira.',
    category: 'estatutos',
  },
  {
    title: 'Relatorios Anuais',
    description: 'Relatorios de atividades, demonstracoes financeiras, parecer do Conselho Fiscal e atas de aprovacao.',
    category: 'relatorios-anuais',
  },
  {
    title: 'Regulamento Interno',
    description: 'Regulamento interno em vigor.',
    category: 'regulamento-interno',
  },
];

const buildGroup = (def: DocGroupDef): DocGroup => {
  const dbDocs = getDocumentsByCategory(def.category)
    .map<DocItem>(d => ({
      label: d.year ? `${d.title} (${d.year})` : d.title,
      file: d.file_url,
      year: d.year,
      gated: d.gated,
    }))
    .filter(doc => !isLegacyEstatutosDoc(def.category, doc.label, doc.file));

  const staticDocs = dbDocs.length === 0 ? (def.staticDocs ?? []) : [];

  return {
    title: def.title,
    description: def.description,
    docs: [...staticDocs, ...dbDocs],
  };
};

type GatedDownloadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  file: string;
  label: string;
};

const GatedDownloadModal: React.FC<GatedDownloadModalProps> = ({ isOpen, onClose, file, label }) => {
  const [step, setStep] = useState<'form' | 'ready'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('form');
    setName('');
    setEmail('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createEstatutosLead({ name, email, document: label });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Nao foi possivel concluir o pedido. Tente novamente.');
      return;
    }
    setStep('ready');
    showToast('Dados registados com sucesso.', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg" titleId="estatutos-download-title">
      <ModalBody>
        {step === 'form' ? (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sand-400/20 text-sand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={22} />
              </div>
              <h2 id="estatutos-download-title" className="text-2xl font-light text-brand-900">
                {label}
              </h2>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                Para descarregar este documento, preencha o seu nome completo e email. <span className="font-medium text-brand-900">Nao e necessario criar conta.</span>
                <br />
                <span className="text-slate-500">Na proxima etapa tera acesso ao botao de download.</span>
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="estatutos-name" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                  Nome completo
                </label>
                <Input
                  id="estatutos-name"
                  type="text"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="O seu nome"
                  autoFocus
                  required
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div>
                <label htmlFor="estatutos-email" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
                  Email
                </label>
                <Input
                  id="estatutos-email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-xs text-center" role="alert">{error}</p>}
              <Button type="submit" className="w-full" isLoading={loading}>
                {loading ? 'A registar...' : 'Continuar para o download'}
              </Button>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Os seus dados sao utilizados apenas pela Fundacao Luso-Brasileira para fins de transparencia e contacto institucional.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} />
            </div>
            <h2 id="estatutos-download-title" className="text-2xl font-light text-brand-900">
              Tudo certo, {name.split(' ')[0]}!
            </h2>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              O documento esta pronto para ser descarregado. Clique no botao abaixo.
            </p>
            <a
              href={file}
              download
              onClick={() => {
                showToast('A iniciar download...', 'info');
                setTimeout(handleClose, 600);
              }}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-900 text-white text-xs font-medium uppercase tracking-wide hover:bg-black transition-colors"
            >
              <Download size={14} /> Descarregar {label}
            </a>
            <p className="text-[10px] text-slate-400 mt-4">
              Caso o download nao inicie automaticamente, clique novamente no botao acima.
            </p>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
};

type DocGroupCardProps = {
  group: DocGroup;
  defaultOpen?: boolean;
  onRequestDownload: (doc: DocItem) => void;
};

const DocGroupCard: React.FC<DocGroupCardProps> = ({ group, defaultOpen, onRequestDownload }) => {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-900/5 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-brand-900" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-900">{group.title}</h2>
            <p className="text-sm text-slate-500 font-light mt-0.5">{group.description}</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 py-5 bg-slate-50/50">
          {group.docs.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Documento em preparacao - disponivel em breve.</p>
          ) : (
            <ul className="space-y-3">
              {group.docs.map(doc => (
                <li key={doc.file} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-slate-700 font-medium truncate">{doc.label}</span>
                    {doc.gated && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-sand-700 bg-sand-100 px-2 py-0.5 rounded-full">
                        <Lock size={9} /> Identificacao necessaria
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.gated ? (
                      <button
                        onClick={() => onRequestDownload(doc)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        <Download size={13} /> Baixar
                      </button>
                    ) : (
                      <a
                        href={doc.file}
                        download
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 transition-colors px-3 py-1.5 rounded-lg"
                      >
                        <Download size={13} /> Baixar
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export const DocumentacaoPage = () => {
  usePageMeta(
    'Documentacao Institucional - Fundacao Luso-Brasileira',
    'Acesso publico a documentos legais, estatutos, relatorios e regulamentos da Fundacao Luso-Brasileira.'
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<DocItem | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick(v => v + 1);
    window.addEventListener(FLB_STATE_EVENT, handler);
    return () => window.removeEventListener(FLB_STATE_EVENT, handler);
  }, []);

  const groups = GROUP_DEFS.map(buildGroup);

  const requestDownload = (doc: DocItem) => {
    setActiveDoc(doc);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-page pt-32 pb-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-900/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sand-400/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

      <SectionWrapper className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
        <header className="mb-16 md:mb-20 border-b border-slate-200 pb-12">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-4">Transparencia</p>
            <h1 className="text-4xl md:text-6xl font-serif text-brand-900 tracking-tight leading-[1.1] mb-6">
              Documentacao<br />Institucional
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-lg text-slate-500 font-light max-w-2xl leading-relaxed">
              Acesso publico aos documentos legais e institucionais da Fundacao Luso-Brasileira, em cumprimento das obrigacoes de transparencia previstas na lei.
            </p>
          </Reveal>
        </header>

        <Reveal delay={150}>
          <div className="space-y-4 mb-16">
            {groups.map((group, i) => (
              <DocGroupCard
                key={group.title}
                group={group}
                defaultOpen={i === 0}
                onRequestDownload={requestDownload}
              />
            ))}
          </div>
        </Reveal>

        <div className="mt-16 pt-10 border-t border-slate-200 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Fundacao Luso-Brasileira - Documentacao Oficial
          </p>
        </div>
      </SectionWrapper>

      {activeDoc && (
        <GatedDownloadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          file={activeDoc.file}
          label={activeDoc.label}
        />
      )}
    </div>
  );
};
