import React, { useEffect } from 'react';
import { SectionWrapper, Reveal } from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';

type LegalSectionItem = {
    title: string;
    body: React.ReactNode;
};

type LegalLocaleBlock = {
    locale: string;
    sections: LegalSectionItem[];
};

const LegalPageLayout = ({ title, subtitle, children }: { title: string, subtitle: string, children?: React.ReactNode }) => {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className="min-h-screen bg-page pt-32 pb-20 relative overflow-hidden">
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

const LegalLocale = ({ locale, sections, delay = 0 }: LegalLocaleBlock & { delay?: number }) => (
    <Reveal delay={delay}>
        <section className="rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sand-600">{locale}</p>
            </div>
            <div className="px-6 py-6 md:px-8 md:py-8 space-y-10">
                {sections.map(section => (
                    <div key={`${locale}-${section.title}`} className="md:grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 mb-3 md:mb-0">
                            <h2 className="text-base font-bold text-brand-900 uppercase tracking-wide leading-relaxed">
                                {section.title}
                            </h2>
                        </div>
                        <div className="md:col-span-8">
                            <div className="text-slate-600 font-light text-base md:text-lg leading-relaxed space-y-4 text-justify md:text-left">
                                {section.body}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    </Reveal>
);

const privacyLocales: LegalLocaleBlock[] = [
    {
        locale: 'Portugues de Portugal (PT-PT)',
        sections: [
            {
                title: 'Identificacao',
                body: (
                    <>
                        <p><strong>Ultima atualizacao:</strong> 11/06/2026</p>
                        <p><strong>Responsavel pelo tratamento:</strong> Fundacao Luso-Brasileira</p>
                        <p>Rua de S. Marcal, n.o 77/79, Freguesia de Santo Antonio, concelho de Lisboa, com o numero de identificacao e pessoa coletiva 503.071.706 - Portugal - geral@fundacaolusobrasileira.pt</p>
                    </>
                ),
            },
            { title: 'Introducao', body: <p>A Fundacao Luso-Brasileira respeita a privacidade dos utilizadores, membros, parceiros e visitantes do seu sitio e plataformas digitais. A presente Politica descreve como recolhemos, utilizamos, conservamos e protegemos os dados pessoais, em conformidade com o Regulamento (UE) 2016/679 (RGPD) e a Lei n.o 58/2019, bem como, quando aplicavel, com a Lei n.o 13.709/2018 do Brasil (LGPD).</p> },
            { title: 'Encarregado de Protecao de Dados', body: <p>Para questoes relativas a dados pessoais pode contactar o Encarregado de Protecao de Dados atraves de geral@fundacaolusobrasileira.pt.</p> },
            { title: 'Dados recolhidos', body: <p>Recolhemos dados fornecidos voluntariamente (nome, e-mail, telefone, informacoes institucionais e dados enviados em formularios de pre-registo, eventos ou contacto) e dados tecnicos de navegacao (endereco IP, tipo de dispositivo e navegador).</p> },
            { title: 'Finalidades e fundamentos juridicos', body: <p>Tratamos os dados para fins institucionais: comunicacao, gestao de eventos e de membros, pre-registos, envio de informacoes e cumprimento de obrigacoes legais. Os fundamentos juridicos sao, consoante o caso: consentimento, execucao de contrato ou diligencias pre-contratuais, cumprimento de obrigacao legal e interesse legitimo (artigo 6.o do RGPD).</p> },
            { title: 'Partilha de dados', body: <p>A Fundacao nao comercializa dados pessoais. A partilha ocorre apenas quando necessaria a execucao de atividades institucionais, ao cumprimento de obrigacoes legais ou mediante consentimento do titular, com subcontratantes vinculados por dever de confidencialidade.</p> },
            { title: 'Transferencias internacionais', body: <p>Por ser uma entidade luso-brasileira, podem ocorrer transferencias de dados entre Portugal/Uniao Europeia e o Brasil. Tais transferencias assentam em decisao de adequacao ou noutras garantias adequadas previstas nos artigos 44.o a 49.o do RGPD.</p> },
            { title: 'Conservacao', body: <p>Os dados sao conservados apenas pelo periodo necessario as finalidades indicadas ou pelos prazos legais aplicaveis, sendo depois eliminados ou anonimizados.</p> },
            { title: 'Direitos dos titulares', body: <p>Pode exercer os direitos de acesso, retificacao, atualizacao, apagamento, limitacao, oposicao e portabilidade, bem como retirar o consentimento. Pode ainda apresentar reclamacao a Comissao Nacional de Protecao de Dados (CNPD), em Portugal, ou a ANPD, no Brasil.</p> },
            { title: 'Cookies', body: <p>Utilizamos cookies essenciais ao funcionamento do sitio e, mediante o seu consentimento, cookies analiticos. Pode aceitar, recusar ou configurar os cookies nao essenciais atraves do nosso aviso de cookies e nas definicoes do navegador.</p> },
            { title: 'Seguranca', body: <p>Adotamos medidas tecnicas e organizativas adequadas para proteger os dados contra acessos nao autorizados, perda, uso indevido ou divulgacao indevida.</p> },
            { title: 'Menores', body: <p>O tratamento de dados de menores observa as exigencias legais aplicaveis, podendo exigir consentimento ou autorizacao de quem exerca as responsabilidades parentais.</p> },
            { title: 'Alteracoes e contacto', body: <p>Esta Politica pode ser atualizada periodicamente; recomendamos a consulta regular. Para esclarecimentos: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
    {
        locale: 'Portugues do Brasil (PT-BR)',
        sections: [
            {
                title: 'Identificacao',
                body: (
                    <>
                        <p><strong>Ultima atualizacao:</strong> 11/06/2026</p>
                        <p><strong>Controlador:</strong> Fundacao Luso-Brasileira</p>
                        <p>Rua General Jardim, no 808, 6o andar, CEP 01223-010 - Sao Paulo, Brasil<br />CNPJ 57.018.427/0001-34 - geral@fundacaolusobrasileira.pt</p>
                    </>
                ),
            },
            { title: 'Introducao', body: <p>A Fundacao Luso-Brasileira respeita a privacidade dos usuarios, membros, parceiros e visitantes do seu site e plataformas digitais. Esta Politica descreve como coletamos, utilizamos, armazenamos e protegemos os dados pessoais, em conformidade com a Lei no 13.709/2018 (LGPD) e, quando aplicavel, com o Regulamento (UE) 2016/679 (RGPD) e a Lei no 58/2019 de Portugal.</p> },
            { title: 'Encarregado (DPO)', body: <p>Para assuntos relativos a dados pessoais, fale com o Encarregado pelo Tratamento de Dados Pessoais em geral@fundacaolusobrasileira.pt.</p> },
            { title: 'Dados coletados', body: <p>Coletamos dados fornecidos voluntariamente (nome, e-mail, telefone, informacoes institucionais e dados enviados em formularios de pre-cadastro, eventos ou contato) e dados tecnicos de navegacao (endereco IP, tipo de dispositivo e navegador).</p> },
            { title: 'Finalidades e bases legais', body: <p>Tratamos os dados para fins institucionais: comunicacao, gestao de eventos e de membros, pre-cadastros, envio de informacoes e cumprimento de obrigacoes legais. As bases legais sao, conforme o caso: consentimento, execucao de contrato, cumprimento de obrigacao legal e legitimo interesse (art. 7o da LGPD).</p> },
            { title: 'Compartilhamento', body: <p>A Fundacao nao comercializa dados pessoais. O compartilhamento ocorre apenas quando necessario a execucao de atividades institucionais, ao cumprimento de obrigacoes legais ou mediante consentimento do titular, com operadores obrigados a confidencialidade.</p> },
            { title: 'Transferencias internacionais', body: <p>Por ser uma entidade luso-brasileira, pode haver transferencia de dados entre o Brasil e Portugal/Uniao Europeia. Tais transferencias observam as garantias previstas nos arts. 33 a 36 da LGPD e nos arts. 44 a 49 do RGPD.</p> },
            { title: 'Retencao', body: <p>Os dados sao mantidos apenas pelo tempo necessario as finalidades informadas ou pelos prazos legais aplicaveis, sendo depois eliminados ou anonimizados.</p> },
            { title: 'Direitos dos titulares', body: <p>Voce pode exercer os direitos de acesso, correcao, atualizacao, exclusao, anonimizacao, portabilidade, oposicao e revogacao do consentimento, entre outros previstos no art. 18 da LGPD. Pode tambem apresentar reclamacao a Autoridade Nacional de Protecao de Dados (ANPD) ou a CNPD, em Portugal.</p> },
            { title: 'Cookies', body: <p>Utilizamos cookies essenciais ao funcionamento do site e, mediante consentimento, cookies analiticos. Voce pode aceitar, recusar ou configurar os cookies nao essenciais por meio do aviso de cookies e das configuracoes do navegador.</p> },
            { title: 'Seguranca', body: <p>Adotamos medidas tecnicas e organizacionais adequadas para proteger os dados contra acessos nao autorizados, perda, uso indevido ou divulgacao indevida.</p> },
            { title: 'Criancas e adolescentes', body: <p>O tratamento de dados de criancas e adolescentes observa o art. 14 da LGPD, podendo exigir o consentimento especifico de pelo menos um dos pais ou responsavel legal.</p> },
            { title: 'Alteracoes e contato', body: <p>Esta Politica pode ser atualizada periodicamente; recomendamos a consulta regular. Para duvidas: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
];

const termsLocales: LegalLocaleBlock[] = [
    {
        locale: 'Portugues de Portugal (PT-PT)',
        sections: [
            { title: 'Identificacao', body: <><p><strong>Ultima atualizacao:</strong> 11/06/2026</p><p><strong>Entidade:</strong> Fundacao Luso-Brasileira</p></> },
            { title: 'Aceitacao', body: <p>Ao aceder e utilizar este sitio, o utilizador aceita os presentes Termos de Uso. Caso nao concorde, recomenda-se que nao utilize os servicos e conteudos disponibilizados.</p> },
            { title: 'Finalidade do sitio', body: <p>O sitio tem carater institucional, informativo e cultural, destinado a divulgar iniciativas, eventos, projetos e conteudos relativos a cooperacao entre Portugal, o Brasil e a lusofonia.</p> },
            { title: 'Uso adequado', body: <p>O utilizador compromete-se a utilizar o sitio de forma etica, legal e responsavel, nao praticando atos que comprometam a seguranca, a integridade ou o funcionamento da plataforma.</p> },
            { title: 'Propriedade intelectual', body: <p>Os conteudos do sitio (textos, imagens, marcas, logotipos e materiais institucionais) estao protegidos por direitos de autor e pertencem a Fundacao Luso-Brasileira ou aos seus parceiros, sendo vedada a reproducao sem autorizacao previa.</p> },
            { title: 'Ligacoes externas', body: <p>O sitio pode conter ligacoes para paginas externas. A Fundacao nao se responsabiliza pelo conteudo, politicas ou praticas desses sitios.</p> },
            { title: 'Limitacao de responsabilidade', body: <p>A Fundacao esforca-se por manter as informacoes atualizadas e corretas, mas, na medida permitida pela lei aplicavel, nao se responsabiliza por eventuais erros, indisponibilidades temporarias ou danos decorrentes do uso do sitio. Esta clausula nao afasta os direitos imperativos dos consumidores.</p> },
            { title: 'Protecao de dados', body: <p>O tratamento de dados pessoais rege-se pela Politica de Privacidade da Fundacao, que faz parte integrante destes Termos.</p> },
            { title: 'Alteracoes', body: <p>A Fundacao pode alterar estes Termos a qualquer momento; as alteracoes relevantes serao assinaladas com a respetiva data, recomendando-se a consulta periodica desta pagina.</p> },
            { title: 'Lei aplicavel e foro', body: <p>Estes Termos regem-se pela lei portuguesa e, quando aplicavel, pela lei brasileira, sem prejuizo das normas imperativas de protecao do consumidor do pais de residencia do utilizador. O foro competente e o legalmente estabelecido.</p> },
            { title: 'Contacto', body: <p>Para esclarecimentos sobre estes Termos, utilize os canais oficiais de contacto da Fundacao: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
    {
        locale: 'Portugues do Brasil (PT-BR)',
        sections: [
            { title: 'Identificacao', body: <><p><strong>Ultima atualizacao:</strong> 11/06/2026</p><p><strong>Entidade:</strong> Fundacao Luso-Brasileira</p></> },
            { title: 'Aceitacao', body: <p>Ao acessar e utilizar este site, o usuario concorda com os presentes Termos de Uso. Caso nao concorde, recomenda-se nao utilizar os servicos e conteudos disponibilizados.</p> },
            { title: 'Finalidade do site', body: <p>O site tem carater institucional, informativo e cultural, com o objetivo de divulgar iniciativas, eventos, projetos e conteudos relacionados a cooperacao entre Portugal, o Brasil e a lusofonia.</p> },
            { title: 'Uso adequado', body: <p>O usuario compromete-se a utilizar o site de forma etica, legal e responsavel, nao praticando atos que comprometam a seguranca, a integridade ou o funcionamento da plataforma.</p> },
            { title: 'Propriedade intelectual', body: <p>Todo o conteudo do site (textos, imagens, marcas, logotipos e materiais institucionais) e protegido por direitos autorais e pertence a Fundacao Luso-Brasileira ou a seus parceiros, sendo vedada a reproducao sem autorizacao previa.</p> },
            { title: 'Links externos', body: <p>O site pode conter links para paginas externas. A Fundacao nao se responsabiliza pelo conteudo, politicas ou praticas desses sites.</p> },
            { title: 'Limitacao de responsabilidade', body: <p>A Fundacao empenha-se em manter as informacoes atualizadas e corretas, mas, nos limites permitidos pela lei aplicavel, nao se responsabiliza por eventuais erros, indisponibilidades temporarias ou danos decorrentes do uso do site. Esta clausula nao afasta os direitos do consumidor previstos no Codigo de Defesa do Consumidor.</p> },
            { title: 'Protecao de dados', body: <p>O tratamento de dados pessoais rege-se pela Politica de Privacidade da Fundacao, que integra estes Termos.</p> },
            { title: 'Alteracoes', body: <p>A Fundacao pode alterar estes Termos a qualquer momento; as alteracoes relevantes serao indicadas com a respectiva data, recomendando-se a consulta periodica desta pagina.</p> },
            { title: 'Lei aplicavel e foro', body: <p>Estes Termos sao regidos pela legislacao brasileira e, quando aplicavel, pela legislacao portuguesa, sem prejuizo das normas imperativas de protecao do consumidor do local de residencia do usuario. Fica eleito o foro legalmente competente, salvo norma legal em contrario.</p> },
            { title: 'Contato', body: <p>Para esclarecimentos sobre estes Termos, utilize os canais oficiais de contato da Fundacao: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
];

export const PrivacyPage = () => {
    usePageMeta('Politica de Privacidade - Fundacao Luso-Brasileira', 'Compromisso com a transparencia, a seguranca da informacao e a protecao de dados pessoais.');

    return (
        <LegalPageLayout
            title="Politica de Privacidade"
            subtitle="Versoes oficiais em portugues de Portugal e portugues do Brasil para o tratamento de dados pessoais."
        >
            {privacyLocales.map((localeBlock, index) => (
                <LegalLocale key={localeBlock.locale} {...localeBlock} delay={index * 100} />
            ))}
        </LegalPageLayout>
    );
};

export const TermsPage = () => {
    usePageMeta('Termos de Uso - Fundacao Luso-Brasileira', 'Versoes oficiais em portugues de Portugal e portugues do Brasil.');

    return (
        <LegalPageLayout
            title="Termos de Uso"
            subtitle="Condicoes oficiais de utilizacao do site e das plataformas digitais da Fundacao Luso-Brasileira."
        >
            {termsLocales.map((localeBlock, index) => (
                <LegalLocale key={localeBlock.locale} {...localeBlock} delay={index * 100} />
            ))}
        </LegalPageLayout>
    );
};
