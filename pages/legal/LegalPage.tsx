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
        <main id="conteudo-principal" tabIndex={-1} className="min-h-screen bg-page pt-32 pb-20 relative overflow-hidden outline-none">
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
                        Fundação Luso-Brasileira - Documento Oficial
                    </p>
                </div>
            </SectionWrapper>
        </main>
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
        locale: 'Português de Portugal (PT-PT)',
        sections: [
            {
                title: 'Identificação',
                body: (
                    <>
                        <p><strong>Última atualização:</strong> 11/06/2026</p>
                        <p><strong>Responsável pelo tratamento:</strong> Fundação Luso-Brasileira</p>
                        <p>Rua de S. Marçal, n.º 77/79, Freguesia de Santo António, concelho de Lisboa, com o número de identificação de pessoa coletiva 503.071.706 - Portugal - geral@fundacaolusobrasileira.pt</p>
                    </>
                ),
            },
            { title: 'Introdução', body: <p>A Fundação Luso-Brasileira respeita a privacidade dos utilizadores, membros, parceiros e visitantes do seu sítio e plataformas digitais. A presente Política descreve como recolhemos, utilizamos, conservamos e protegemos os dados pessoais, em conformidade com o Regulamento (UE) 2016/679 (RGPD) e a Lei n.º 58/2019, bem como, quando aplicável, com a Lei n.º 13.709/2018 do Brasil (LGPD).</p> },
            { title: 'Encarregado de Proteção de Dados', body: <p>Para questões relativas a dados pessoais pode contactar o Encarregado de Proteção de Dados através de geral@fundacaolusobrasileira.pt.</p> },
            { title: 'Dados recolhidos', body: <p>Recolhemos dados fornecidos voluntariamente (nome, e-mail, telefone, informações institucionais e dados enviados em formulários de pré-registo, eventos ou contacto) e dados técnicos de navegação (endereço IP, tipo de dispositivo e navegador).</p> },
            { title: 'Finalidades e fundamentos jurídicos', body: <p>Tratamos os dados para fins institucionais: comunicação, gestão de eventos e de membros, pré-registos, envio de informações e cumprimento de obrigações legais. Os fundamentos jurídicos são, consoante o caso: consentimento, execução de contrato ou diligências pré-contratuais, cumprimento de obrigação legal e interesse legítimo (artigo 6.º do RGPD).</p> },
            { title: 'Partilha de dados', body: <p>A Fundação não comercializa dados pessoais. A partilha ocorre apenas quando necessária à execução de atividades institucionais, ao cumprimento de obrigações legais ou mediante consentimento do titular, com subcontratantes vinculados por dever de confidencialidade.</p> },
            { title: 'Transferências internacionais', body: <p>Por ser uma entidade luso-brasileira, podem ocorrer transferências de dados entre Portugal/União Europeia e o Brasil. Tais transferências assentam em decisão de adequação ou noutras garantias adequadas previstas nos artigos 44.º a 49.º do RGPD.</p> },
            { title: 'Conservação', body: <p>Os dados são conservados apenas pelo período necessário às finalidades indicadas ou pelos prazos legais aplicáveis, sendo depois eliminados ou anonimizados.</p> },
            { title: 'Direitos dos titulares', body: <p>Pode exercer os direitos de acesso, retificação, atualização, apagamento, limitação, oposição e portabilidade, bem como retirar o consentimento. Pode ainda apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em Portugal, ou à ANPD, no Brasil.</p> },
            { title: 'Cookies', body: <p>Utilizamos cookies essenciais ao funcionamento do sítio e, mediante o seu consentimento, cookies analíticos. Pode aceitar, recusar ou configurar os cookies não essenciais através do nosso aviso de cookies e nas definições do navegador.</p> },
            { title: 'Segurança', body: <p>Adotamos medidas técnicas e organizativas adequadas para proteger os dados contra acessos não autorizados, perda, uso indevido ou divulgação indevida.</p> },
            { title: 'Menores', body: <p>O tratamento de dados de menores observa as exigências legais aplicáveis, podendo exigir consentimento ou autorização de quem exerça as responsabilidades parentais.</p> },
            { title: 'Alterações e contacto', body: <p>Esta Política pode ser atualizada periodicamente; recomendamos a consulta regular. Para esclarecimentos: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
    {
        locale: 'Português do Brasil (PT-BR)',
        sections: [
            {
                title: 'Identificação',
                body: (
                    <>
                        <p><strong>Última atualização:</strong> 11/06/2026</p>
                        <p><strong>Controlador:</strong> Fundação Luso-Brasileira</p>
                        <p>Rua General Jardim, n.º 808, 6.º andar, CEP 01223-010 - São Paulo, Brasil<br />CNPJ 57.018.427/0001-34 - geral@fundacaolusobrasileira.pt</p>
                    </>
                ),
            },
            { title: 'Introdução', body: <p>A Fundação Luso-Brasileira respeita a privacidade dos usuários, membros, parceiros e visitantes do seu site e plataformas digitais. Esta Política descreve como coletamos, utilizamos, armazenamos e protegemos os dados pessoais, em conformidade com a Lei n.º 13.709/2018 (LGPD) e, quando aplicável, com o Regulamento (UE) 2016/679 (RGPD) e a Lei n.º 58/2019 de Portugal.</p> },
            { title: 'Encarregado (DPO)', body: <p>Para assuntos relativos a dados pessoais, fale com o Encarregado pelo Tratamento de Dados Pessoais em geral@fundacaolusobrasileira.pt.</p> },
            { title: 'Dados coletados', body: <p>Coletamos dados fornecidos voluntariamente (nome, e-mail, telefone, informações institucionais e dados enviados em formulários de pré-cadastro, eventos ou contato) e dados técnicos de navegação (endereço IP, tipo de dispositivo e navegador).</p> },
            { title: 'Finalidades e bases legais', body: <p>Tratamos os dados para fins institucionais: comunicação, gestão de eventos e de membros, pré-cadastros, envio de informações e cumprimento de obrigações legais. As bases legais são, conforme o caso: consentimento, execução de contrato, cumprimento de obrigação legal e legítimo interesse (art. 7.º da LGPD).</p> },
            { title: 'Compartilhamento', body: <p>A Fundação não comercializa dados pessoais. O compartilhamento ocorre apenas quando necessário à execução de atividades institucionais, ao cumprimento de obrigações legais ou mediante consentimento do titular, com operadores obrigados à confidencialidade.</p> },
            { title: 'Transferências internacionais', body: <p>Por ser uma entidade luso-brasileira, pode haver transferência de dados entre o Brasil e Portugal/União Europeia. Tais transferências observam as garantias previstas nos arts. 33 a 36 da LGPD e nos arts. 44 a 49 do RGPD.</p> },
            { title: 'Retenção', body: <p>Os dados são mantidos apenas pelo tempo necessário às finalidades informadas ou pelos prazos legais aplicáveis, sendo depois eliminados ou anonimizados.</p> },
            { title: 'Direitos dos titulares', body: <p>Você pode exercer os direitos de acesso, correção, atualização, exclusão, anonimização, portabilidade, oposição e revogação do consentimento, entre outros previstos no art. 18 da LGPD. Pode também apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) ou à CNPD, em Portugal.</p> },
            { title: 'Cookies', body: <p>Utilizamos cookies essenciais ao funcionamento do site e, mediante consentimento, cookies analíticos. Você pode aceitar, recusar ou configurar os cookies não essenciais por meio do aviso de cookies e das configurações do navegador.</p> },
            { title: 'Segurança', body: <p>Adotamos medidas técnicas e organizacionais adequadas para proteger os dados contra acessos não autorizados, perda, uso indevido ou divulgação indevida.</p> },
            { title: 'Crianças e adolescentes', body: <p>O tratamento de dados de crianças e adolescentes observa o art. 14 da LGPD, podendo exigir o consentimento específico de pelo menos um dos pais ou responsável legal.</p> },
            { title: 'Alterações e contato', body: <p>Esta Política pode ser atualizada periodicamente; recomendamos a consulta regular. Para dúvidas: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
];

const termsLocales: LegalLocaleBlock[] = [
    {
        locale: 'Português de Portugal (PT-PT)',
        sections: [
            { title: 'Identificação', body: <><p><strong>Última atualização:</strong> 11/06/2026</p><p><strong>Entidade:</strong> Fundação Luso-Brasileira</p></> },
            { title: 'Aceitação', body: <p>Ao aceder e utilizar este sítio, o utilizador aceita os presentes Termos de Uso. Caso não concorde, recomenda-se que não utilize os serviços e conteúdos disponibilizados.</p> },
            { title: 'Finalidade do sítio', body: <p>O sítio tem caráter institucional, informativo e cultural, destinado a divulgar iniciativas, eventos, projetos e conteúdos relativos à cooperação entre Portugal, o Brasil e a lusofonia.</p> },
            { title: 'Uso adequado', body: <p>O utilizador compromete-se a utilizar o sítio de forma ética, legal e responsável, não praticando atos que comprometam a segurança, a integridade ou o funcionamento da plataforma.</p> },
            { title: 'Propriedade intelectual', body: <p>Os conteúdos do sítio (textos, imagens, marcas, logótipos e materiais institucionais) estão protegidos por direitos de autor e pertencem à Fundação Luso-Brasileira ou aos seus parceiros, sendo vedada a reprodução sem autorização prévia.</p> },
            { title: 'Ligações externas', body: <p>O sítio pode conter ligações para páginas externas. A Fundação não se responsabiliza pelo conteúdo, políticas ou práticas desses sítios.</p> },
            { title: 'Limitação de responsabilidade', body: <p>A Fundação esforça-se por manter as informações atualizadas e corretas, mas, na medida permitida pela lei aplicável, não se responsabiliza por eventuais erros, indisponibilidades temporárias ou danos decorrentes do uso do sítio. Esta cláusula não afasta os direitos imperativos dos consumidores.</p> },
            { title: 'Proteção de dados', body: <p>O tratamento de dados pessoais rege-se pela Política de Privacidade da Fundação, que faz parte integrante destes Termos.</p> },
            { title: 'Alterações', body: <p>A Fundação pode alterar estes Termos a qualquer momento; as alterações relevantes serão assinaladas com a respetiva data, recomendando-se a consulta periódica desta página.</p> },
            { title: 'Lei aplicável e foro', body: <p>Estes Termos regem-se pela lei portuguesa e, quando aplicável, pela lei brasileira, sem prejuízo das normas imperativas de proteção do consumidor do país de residência do utilizador. O foro competente é o legalmente estabelecido.</p> },
            { title: 'Contacto', body: <p>Para esclarecimentos sobre estes Termos, utilize os canais oficiais de contacto da Fundação: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
    {
        locale: 'Português do Brasil (PT-BR)',
        sections: [
            { title: 'Identificação', body: <><p><strong>Última atualização:</strong> 11/06/2026</p><p><strong>Entidade:</strong> Fundação Luso-Brasileira</p></> },
            { title: 'Aceitação', body: <p>Ao acessar e utilizar este site, o usuário concorda com os presentes Termos de Uso. Caso não concorde, recomenda-se não utilizar os serviços e conteúdos disponibilizados.</p> },
            { title: 'Finalidade do site', body: <p>O site tem caráter institucional, informativo e cultural, com o objetivo de divulgar iniciativas, eventos, projetos e conteúdos relacionados à cooperação entre Portugal, o Brasil e a lusofonia.</p> },
            { title: 'Uso adequado', body: <p>O usuário compromete-se a utilizar o site de forma ética, legal e responsável, não praticando atos que comprometam a segurança, a integridade ou o funcionamento da plataforma.</p> },
            { title: 'Propriedade intelectual', body: <p>Todo o conteúdo do site (textos, imagens, marcas, logotipos e materiais institucionais) é protegido por direitos autorais e pertence à Fundação Luso-Brasileira ou a seus parceiros, sendo vedada a reprodução sem autorização prévia.</p> },
            { title: 'Links externos', body: <p>O site pode conter links para páginas externas. A Fundação não se responsabiliza pelo conteúdo, políticas ou práticas desses sites.</p> },
            { title: 'Limitação de responsabilidade', body: <p>A Fundação empenha-se em manter as informações atualizadas e corretas, mas, nos limites permitidos pela lei aplicável, não se responsabiliza por eventuais erros, indisponibilidades temporárias ou danos decorrentes do uso do site. Esta cláusula não afasta os direitos do consumidor previstos no Código de Defesa do Consumidor.</p> },
            { title: 'Proteção de dados', body: <p>O tratamento de dados pessoais rege-se pela Política de Privacidade da Fundação, que integra estes Termos.</p> },
            { title: 'Alterações', body: <p>A Fundação pode alterar estes Termos a qualquer momento; as alterações relevantes serão indicadas com a respectiva data, recomendando-se a consulta periódica desta página.</p> },
            { title: 'Lei aplicável e foro', body: <p>Estes Termos são regidos pela legislação brasileira e, quando aplicável, pela legislação portuguesa, sem prejuízo das normas imperativas de proteção do consumidor do local de residência do usuário. Fica eleito o foro legalmente competente, salvo norma legal em contrário.</p> },
            { title: 'Contato', body: <p>Para esclarecimentos sobre estes Termos, utilize os canais oficiais de contato da Fundação: geral@fundacaolusobrasileira.pt.</p> },
        ],
    },
];

export const PrivacyPage = () => {
    usePageMeta('Política de Privacidade - Fundação Luso-Brasileira', 'Compromisso com a transparência, a segurança da informação e a proteção de dados pessoais.');

    return (
        <LegalPageLayout
            title="Política de Privacidade"
            subtitle="Versões oficiais em português de Portugal e português do Brasil para o tratamento de dados pessoais."
        >
            {privacyLocales.map((localeBlock, index) => (
                <LegalLocale key={localeBlock.locale} {...localeBlock} delay={index * 100} />
            ))}
        </LegalPageLayout>
    );
};

export const TermsPage = () => {
    usePageMeta('Termos de Uso - Fundação Luso-Brasileira', 'Versões oficiais em português de Portugal e português do Brasil.');

    return (
        <LegalPageLayout
            title="Termos de Uso"
            subtitle="Condições oficiais de utilização do site e das plataformas digitais da Fundação Luso-Brasileira."
        >
            {termsLocales.map((localeBlock, index) => (
                <LegalLocale key={localeBlock.locale} {...localeBlock} delay={index * 100} />
            ))}
        </LegalPageLayout>
    );
};
