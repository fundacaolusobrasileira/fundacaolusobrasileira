import React, { useState } from 'react';
import { FileText, Download, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionWrapper, Reveal } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';

type DocItem = {
  label: string;
  file: string;
  year?: number;
};

type DocGroup = {
  title: string;
  description: string;
  docs: DocItem[];
};

const DOCUMENTOS: DocGroup[] = [
  {
    title: 'Estatutos',
    description: 'Versão consolidada dos estatutos em vigor da Fundação Luso-Brasileira.',
    docs: [
      { label: 'Estatutos em vigor', file: '/Estatutos.pdf' },
    ],
  },
  {
    title: 'Relatórios Anuais',
    description: 'Relatórios de atividades, demonstrações financeiras, parecer do Conselho Fiscal e atas de aprovação.',
    docs: [],
  },
  {
    title: 'Regulamento Interno',
    description: 'Regulamento interno em vigor.',
    docs: [],
  },
  {
    title: 'Órgãos Sociais',
    description: 'Identificação dos titulares dos órgãos previstos nos estatutos.',
    docs: [],
  },
];

const DocGroupCard = ({ group, defaultOpen }: { group: DocGroup; defaultOpen?: boolean }) => {
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
            <p className="text-sm text-slate-400 italic">Documento em preparação — disponível em breve.</p>
          ) : (
            <ul className="space-y-3">
              {group.docs.map(doc => (
                <li key={doc.file} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-100">
                  <span className="text-sm text-slate-700 font-medium">{doc.label}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 hover:text-sand-600 transition-colors px-3 py-1.5 rounded-lg border border-brand-900/20 hover:border-sand-400 hover:bg-sand-50"
                    >
                      <ExternalLink size={13} /> Ver
                    </a>
                    <a
                      href={doc.file}
                      download
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-900 hover:bg-brand-800 transition-colors px-3 py-1.5 rounded-lg"
                    >
                      <Download size={13} /> Baixar
                    </a>
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
    'Documentação Institucional – Fundação Luso-Brasileira',
    'Acesso público a documentos legais, estatutos, relatórios e regulamentos da Fundação Luso-Brasileira.'
  );

  return (
    <div className="min-h-screen bg-page pt-32 pb-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-900/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sand-400/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

      <SectionWrapper className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
        <header className="mb-16 md:mb-20 border-b border-slate-200 pb-12">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-4">Transparência</p>
            <h1 className="text-4xl md:text-6xl font-serif text-brand-900 tracking-tight leading-[1.1] mb-6">
              Documentação<br />Institucional
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-lg text-slate-500 font-light max-w-2xl leading-relaxed">
              Acesso público aos documentos legais e institucionais da Fundação Luso-Brasileira, em cumprimento das obrigações de transparência previstas na lei.
            </p>
          </Reveal>
        </header>

        <Reveal delay={150}>
          <div className="space-y-4 mb-16">
            {DOCUMENTOS.map((group, i) => (
              <DocGroupCard key={group.title} group={group} defaultOpen={i === 0} />
            ))}
          </div>
        </Reveal>

        {/* Inline PDF Viewer for Estatutos */}
        <Reveal delay={200}>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-brand-900" />
                <span className="text-sm font-bold text-brand-900">Estatutos — Visualização</span>
              </div>
              <a
                href="/Estatutos.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 hover:text-sand-600 transition-colors"
              >
                <ExternalLink size={13} /> Abrir em nova aba
              </a>
            </div>
            <iframe
              src="/Estatutos.pdf"
              title="Estatutos da Fundação Luso-Brasileira"
              className="w-full"
              style={{ height: '75vh', minHeight: '500px' }}
            />
          </div>
        </Reveal>

        <div className="mt-16 pt-10 border-t border-slate-200 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Fundação Luso-Brasileira — Documentação Oficial
          </p>
        </div>
      </SectionWrapper>
    </div>
  );
};
