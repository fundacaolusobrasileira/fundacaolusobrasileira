// pages/contacto/ContactoPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { SectionWrapper, Reveal } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';

/**
 * Dados institucionais REAIS, os mesmos que constam da Política de Privacidade
 * (pages/legal/LegalPage.tsx). Não acrescentar telefones, horários ou
 * formulários que a Fundação não tenha confirmado.
 */
export const CONTACT_EMAIL = 'geral@fundacaolusobrasileira.pt';

const OFFICES = [
  {
    id: 'lisboa',
    country: 'Portugal',
    city: 'Lisboa',
    lines: [
      'Rua de S. Marçal, n.º 77/79',
      'Freguesia de Santo António, concelho de Lisboa',
      'Portugal',
    ],
    registry: 'Número de identificação de pessoa coletiva 503.071.706',
  },
  {
    id: 'sao-paulo',
    country: 'Brasil',
    city: 'São Paulo',
    lines: [
      'Rua General Jardim, n.º 808, 6.º andar',
      'CEP 01223-010 — São Paulo',
      'Brasil',
    ],
    registry: 'CNPJ 57.018.427/0001-34',
  },
];

export const ContactoPage = () => {
  usePageMeta(
    'Contacto – Fundação Luso-Brasileira',
    'Contactos institucionais da Fundação Luso-Brasileira: endereço de correio eletrónico e moradas em Lisboa e em São Paulo.'
  );

  return (
    <main id="conteudo-principal" tabIndex={-1} className="min-h-screen bg-page pt-32 pb-20 relative overflow-hidden outline-none">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-900/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sand-400/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

      <SectionWrapper className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
        <header className="mb-16 md:mb-20 text-center md:text-left border-b border-slate-200 pb-12">
          <Reveal>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-brand-900 tracking-tight leading-[1.1] mb-6">
              Contacto
            </h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-lg md:text-xl text-slate-500 font-light max-w-2xl leading-relaxed">
              Canais oficiais da Fundação Luso-Brasileira para assuntos institucionais,
              parcerias, eventos e proteção de dados.
            </p>
          </Reveal>
        </header>

        <Reveal>
          <section aria-labelledby="contacto-email" className="mb-12">
            <h2
              id="contacto-email"
              className="text-xs font-bold uppercase tracking-[0.22em] text-sand-600 mb-4"
            >
              Correio eletrónico
            </h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-3 text-xl md:text-2xl font-light text-brand-900 hover:text-sand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-sand-400 rounded-lg"
            >
              <Mail size={22} aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
            <p className="text-slate-500 font-light text-sm mt-4 max-w-2xl leading-relaxed">
              Este é também o endereço do Encarregado de Proteção de Dados, para o exercício
              dos direitos previstos no RGPD e na LGPD. Consulte a{' '}
              <Link to="/privacidade" className="underline hover:text-brand-900 transition-colors">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section aria-labelledby="contacto-moradas">
            <h2
              id="contacto-moradas"
              className="text-xs font-bold uppercase tracking-[0.22em] text-sand-600 mb-6"
            >
              Moradas
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {OFFICES.map(office => (
                <address
                  key={office.id}
                  className="not-italic rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 md:p-8"
                >
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
                    <MapPin size={14} aria-hidden="true" />
                    {office.country}
                  </p>
                  <h3 className="text-2xl font-serif text-brand-900 mb-4">{office.city}</h3>
                  <div className="text-slate-600 font-light leading-relaxed space-y-1">
                    {office.lines.map(line => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-light mt-4 pt-4 border-t border-slate-100">
                    {office.registry}
                  </p>
                </address>
              ))}
            </div>
          </section>
        </Reveal>

        <div className="mt-20 pt-10 border-t border-slate-200 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Fundação Luso-Brasileira — Contactos Institucionais
          </p>
        </div>
      </SectionWrapper>
    </main>
  );
};
