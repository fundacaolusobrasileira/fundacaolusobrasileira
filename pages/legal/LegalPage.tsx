import React, { useEffect } from 'react';
import { SectionWrapper, Reveal } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';

// --- Shared Layout Component for Legal Pages ---
const LegalPageLayout = ({ title, subtitle, children }: { title: string, subtitle: string, children?: React.ReactNode }) => {
    useEffect(() => { window.scrollTo(0,0); }, []);

    return (
        <div className="min-h-screen bg-page pt-32 pb-20 relative overflow-hidden">
            {/* Subtle Background Elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-900/5 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sand-400/5 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none"></div>

            <SectionWrapper className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
                <header className="mb-16 md:mb-24 text-center md:text-left border-b border-slate-200 pb-12">
                    <Reveal>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-brand-900 tracking-tight leading-[1.1] mb-6">
                            {title}
                        </h1>
                    </Reveal>
                    <Reveal delay={100}>
                        <p className="text-lg md:text-xl text-slate-500 font-light max-w-2xl leading-relaxed">
                            {subtitle}
                        </p>
                    </Reveal>
                </header>

                <div className="space-y-12 md:space-y-16">
                    {children}
                </div>

                <div className="mt-20 pt-10 border-t border-slate-200 text-center md:text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Fundacao Luso-Brasileira - Documento Oficial
                    </p>
                </div>
            </SectionWrapper>
        </div>
    );
};

// --- Section Component ---
const LegalSection = ({ title, children, delay = 0 }: { title: string, children?: React.ReactNode, delay?: number }) => (
    <Reveal delay={delay}>
        <section className="md:grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4 mb-4 md:mb-0">
                <h2 className="text-base font-bold text-brand-900 uppercase tracking-wide leading-relaxed sticky top-32">
                    {title}
                </h2>
            </div>
            <div className="md:col-span-8">
                <div className="text-slate-600 font-light text-base md:text-lg leading-relaxed space-y-4 text-justify md:text-left">
                    {children}
                </div>
            </div>
        </section>
    </Reveal>
);

export const PrivacyPage = () => {
    usePageMeta("Politica de Privacidade – Fundacao Luso-Brasileira", "Compromisso com a transparencia e protecao de dados.");

    return (
        <LegalPageLayout
            title="Politica de Privacidade"
            subtitle="Compromisso com a transparencia, a seguranca da informacao e a protecao dos dados pessoais."
        >
            <LegalSection title="Introducao">
                <p>A Fundacao Luso-Brasileira respeita a privacidade de todos os usuarios, membros, parceiros e visitantes do seu site e plataformas digitais. Esta Politica de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos os dados pessoais, em conformidade com a legislacao aplicavel, incluindo o Regulamento Geral sobre a Protecao de Dados da Uniao Europeia e a Lei Geral de Protecao de Dados do Brasil.</p>
            </LegalSection>

            <LegalSection title="Dados Coletados" delay={100}>
                <p>Podemos coletar informacoes pessoais fornecidas voluntariamente pelos usuarios, como nome, e-mail, telefone, informacoes institucionais, dados enviados em formularios de pre-cadastro, eventos, contato ou participacao em iniciativas da Fundacao. Tambem podemos coletar dados tecnicos, como endereco IP, tipo de dispositivo, navegador e informacoes de navegacao.</p>
            </LegalSection>

            <LegalSection title="Finalidade do Uso" delay={200}>
                <p>Os dados coletados sao utilizados exclusivamente para fins institucionais, como comunicacao, gestao de eventos, gestao de membros, pre-cadastros, envio de informacoes relevantes, melhoria da experiencia do usuario e cumprimento de obrigacoes legais.</p>
            </LegalSection>

            <LegalSection title="Compartilhamento" delay={300}>
                <p>A Fundacao Luso-Brasileira nao comercializa dados pessoais. O compartilhamento ocorre apenas quando necessario para a execucao de atividades institucionais, cumprimento de obrigacoes legais ou mediante consentimento do titular.</p>
            </LegalSection>

            <LegalSection title="Armazenamento e Seguranca" delay={400}>
                <p>Adotamos medidas tecnicas e organizacionais adequadas para proteger os dados pessoais contra acessos nao autorizados, perda, uso indevido ou divulgacao indevida.</p>
            </LegalSection>

            <LegalSection title="Direitos dos Titulares" delay={500}>
                <p>Os titulares dos dados podem solicitar acesso, correcao, atualizacao ou exclusao de seus dados pessoais, bem como exercer outros direitos previstos na legislacao vigente, mediante contato pelos canais oficiais da Fundacao.</p>
            </LegalSection>

            <LegalSection title="Cookies" delay={600}>
                <p>Este site pode utilizar cookies para melhorar a navegacao e a experiencia do usuario. O uso de cookies pode ser gerenciado nas configuracoes do navegador.</p>
            </LegalSection>

            <LegalSection title="Alteracoes" delay={700}>
                <p>Esta Politica de Privacidade pode ser atualizada periodicamente. Recomendamos a consulta regular desta pagina.</p>
            </LegalSection>

            <LegalSection title="Contato" delay={800}>
                <p>Para duvidas ou solicitacoes relacionadas a privacidade e protecao de dados, entre em contato pelo e-mail institucional da Fundacao.</p>
            </LegalSection>
        </LegalPageLayout>
    );
};

export const TermsPage = () => {
    usePageMeta("Termos de Uso – Fundacao Luso-Brasileira", "Condicoes para utilizacao das plataformas digitais.");

    return (
        <LegalPageLayout
            title="Termos de Uso"
            subtitle="Condicoes para utilizacao do site e das plataformas digitais da Fundacao Luso-Brasileira."
        >
            <LegalSection title="Aceitacao dos Termos">
                <p>Ao acessar e utilizar este site, o usuario concorda com os presentes Termos de Uso. Caso nao concorde, recomenda-se nao utilizar os servicos e conteudos disponibilizados.</p>
            </LegalSection>

            <LegalSection title="Finalidade do Site" delay={100}>
                <p>O site da Fundacao Luso-Brasileira tem carater institucional, informativo e cultural, com o objetivo de divulgar iniciativas, eventos, projetos e conteudos relacionados a cooperacao entre Portugal, Brasil e a lusofonia.</p>
            </LegalSection>

            <LegalSection title="Uso Adequado" delay={200}>
                <p>O usuario compromete-se a utilizar o site de forma etica, legal e responsavel, nao praticando atos que possam comprometer a seguranca, integridade ou funcionamento da plataforma.</p>
            </LegalSection>

            <LegalSection title="Propriedade Intelectual" delay={300}>
                <p>Todo o conteudo presente neste site, incluindo textos, imagens, marcas, logotipos e materiais institucionais, e protegido por direitos autorais e pertence a Fundacao Luso-Brasileira ou a seus parceiros, sendo vedada a reproducao sem autorizacao previa.</p>
            </LegalSection>

            <LegalSection title="Links Externos" delay={400}>
                <p>O site pode conter links para paginas externas. A Fundacao nao se responsabiliza pelo conteudo, politicas ou praticas desses sites.</p>
            </LegalSection>

            <LegalSection title="Responsabilidades" delay={500}>
                <p>A Fundacao empenha-se em manter as informacoes atualizadas e corretas, mas nao se responsabiliza por eventuais erros, indisponibilidades temporarias ou danos decorrentes do uso do site.</p>
            </LegalSection>

            <LegalSection title="Modificacoes" delay={600}>
                <p>A Fundacao Luso-Brasileira pode alterar estes Termos de Uso a qualquer momento, sendo recomendada a consulta periodica desta pagina.</p>
            </LegalSection>

            <LegalSection title="Legislacao Aplicavel" delay={700}>
                <p>Estes Termos de Uso sao regidos pelas legislacoes aplicaveis em Portugal e no Brasil, respeitando os principios da cooperacao internacional e da protecao de direitos.</p>
            </LegalSection>

            <LegalSection title="Contato" delay={800}>
                <p>Para esclarecimentos sobre estes Termos de Uso, utilize os canais oficiais de contato da Fundacao.</p>
            </LegalSection>
        </LegalPageLayout>
    );
};
