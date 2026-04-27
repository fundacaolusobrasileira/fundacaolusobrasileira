# Relatório de Correções do PDF

Data: 26 de abril de 2026

Este documento resume os problemas reportados no PDF, o que foi corrigido no sistema e onde está a evidência em vídeo/screenshot/trace dos testes E2E.

## 1. Aceitar, rejeitar, criar conta, conectar e depois ainda poder editar

Problema:
O fluxo de pré-registo tinha ações espalhadas e permitia inconsistências depois da conversão. Um pré-registo já convertido ainda podia ter identidade e estado alterados manualmente no editor, o que podia desalinhar pré-registo, conta criada e membro/parceiro vinculado.

Correção:
- O fluxo administrativo foi validado ponta a ponta com `aprovar`, `rejeitar`, `eliminar`, `criar conta` e `conectar`.
- Depois de `convertido`, o editor do pré-registo passou a bloquear `nome`, `email`, `tipo`, `perfil pretendido` e `estado`.
- O estado passou a ser alterado apenas pelos botões de ação do fluxo.
- Continua permitido ajustar a mensagem do pré-registo sem quebrar a conta criada.

Arquivos principais:
- [component.ui.tsx](/H:/Workspace/fundacaolusobrasileira/component.ui.tsx)
- [services/precadastros.service.ts](/H:/Workspace/fundacaolusobrasileira/services/precadastros.service.ts)

Evidência:
- [pdf-precadastro-admin-lock](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-precadastro-admin-lock>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 2. Editar membro não existe no back nem front

Problema:
Havia falhas reais no fluxo de edição de membro/parceiro, incluindo casos em que a alteração não estava claramente validada de ponta a ponta no público.

Correção:
- O fluxo foi coberto por E2E real.
- O teste cria um membro, edita os campos principais e valida a alteração refletida na área pública.
- Também foi validado o comportamento de destaque na listagem pública.

Arquivos principais:
- [pages/membro/MembroPerfilPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/membro/MembroPerfilPage.tsx)
- [tests/e2e/pdf-member-edit.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/pdf-member-edit.spec.ts)

Evidência:
- [pdf-member-edit](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-member-edit>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 3. Mostra que tem documento mas não mostra onde

Problema:
A interface pública ainda usava linguagem ambígua de “arquivo/documento”, embora o fluxo real aceite apenas foto ou vídeo. Também não deixava claro onde a contribuição apareceria depois da aprovação.

Correção:
- O campo foi renomeado para `Foto ou Video da Memoria`.
- A tela passou a informar explicitamente que documentos não são aceitos nesse fluxo.
- A tela de envio e a tela de sucesso passaram a explicar que o material aprovado aparece na `Galeria da Comunidade` da página do evento.
- A página do evento também passou a reforçar esse destino.

Arquivos principais:
- [pages/eventos/EventoColaborarPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/eventos/EventoColaborarPage.tsx)
- [pages/eventos/EventoDetalhePage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/eventos/EventoDetalhePage.tsx)

Evidência:
- [pdf-media-location](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-media-location>)
- [pdf-media-preview](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-media-preview>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 4. Permissão de admin e diretoria aprovar alguém como membro e fornecer senha alterável depois

Problema:
O fluxo administrativo precisava garantir criação de conta, vínculo com perfil existente e orientação correta sobre senha. Havia também risco de a UI sugerir um comportamento diferente do real.

Correção:
- `admin` foi validado como superset de `editor`.
- O admin consegue criar conta a partir de pré-registo e conectar a um perfil persistido.
- O fluxo de recuperação de senha foi corrigido para não submeter o login por engano.
- O sistema ficou coerente com o comportamento real: a conta é criada e a redefinição de senha acontece pelo fluxo de recuperação.

Arquivos principais:
- [services/auth.service.ts](/H:/Workspace/fundacaolusobrasileira/services/auth.service.ts)
- [pages/auth/LoginPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/auth/LoginPage.tsx)
- [pages/auth/ResetPasswordPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/auth/ResetPasswordPage.tsx)

Evidência:
- [pdf-precadastro-admin-lock](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-precadastro-admin-lock>)
- [pdf-account-recovery](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-account-recovery>)
- [pdf-admin-roles-fixed](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-admin-roles-fixed>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 5. Definir limite de imagem da capa

Problema:
Era necessário deixar o limite claro e rejeitar arquivo acima do permitido.

Correção:
- O editor de eventos passou a exibir o limite da capa de forma explícita.
- Arquivo acima de `5MB` é rejeitado com mensagem visível.

Arquivos principais:
- [component.ui.tsx](/H:/Workspace/fundacaolusobrasileira/component.ui.tsx)
- [tests/e2e/pdf-cover-limit.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/pdf-cover-limit.spec.ts)

Evidência:
- [pdf-cover-limit](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-cover-limit>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 6. Criar aba carregando, não está mostrando prévia

Problema:
O fluxo de adicionar mídia por URL e a colaboração pública precisavam exibir prévia real antes da publicação.

Correção:
- O modal de adicionar URL passou a ter prévia real.
- O formulário público de colaboração também exibe prévia da imagem/vídeo.
- O teste valida a prévia antes da publicação e depois confirma a mídia pública.

Arquivos principais:
- [component.ui.tsx](/H:/Workspace/fundacaolusobrasileira/component.ui.tsx)
- [tests/e2e/pdf-media-preview.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/pdf-media-preview.spec.ts)

Evidência:
- [pdf-media-preview](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-media-preview>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 7. Já estou logado e pede novamente para colocar cadastro

Problema:
O modal inteligente de convite/cadastro podia reaparecer para utilizador já autenticado.

Correção:
- O modal passou a reagir ao estado de autenticação e não reaparece para utilizador logado.
- O comportamento foi validado em E2E.

Arquivos principais:
- [components/domain/SmartInviteModal.tsx](/H:/Workspace/fundacaolusobrasileira/components/domain/SmartInviteModal.tsx)
- [tests/e2e/admin-public-governance.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/admin-public-governance.spec.ts)

Evidência:
- [pdf-admin-public-governance](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-admin-public-governance>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 8. Não mostra preview nem dá para baixar

Problema:
A curadoria e a visualização pública precisavam permitir ver a mídia, aprová-la e depois encontrá-la de forma consistente.

Correção:
- A curadoria ganhou ações explícitas de `Ver` e `Baixar`.
- O dashboard de mídia foi corrigido para ler a galeria real do evento.
- A mídia aprovada passou a aparecer corretamente na área publicada e na página pública do evento.

Arquivos principais:
- [component.domain.tsx](/H:/Workspace/fundacaolusobrasileira/component.domain.tsx)
- [pages/dashboard/DashboardMediaPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/dashboard/DashboardMediaPage.tsx)
- [pages/eventos/EventoDetalhePage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/eventos/EventoDetalhePage.tsx)

Evidência:
- [pdf-community-media-dashboard](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-community-media-dashboard>)
- [pdf-media-preview](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-media-preview>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 9. Deveria abrir modal com comunicação da plataforma para colocar link e ver preview

Problema:
O fluxo de adicionar mídia por URL era frágil e pouco guiado.

Correção:
- O sistema passou a usar modal dedicado para adicionar URL.
- O modal mostra campo próprio, contexto claro e prévia antes de adicionar.

Arquivos principais:
- [component.ui.tsx](/H:/Workspace/fundacaolusobrasileira/component.ui.tsx)
- [tests/e2e/pdf-media-preview.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/pdf-media-preview.spec.ts)

Evidência:
- [pdf-media-preview](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-media-preview>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 10. Adicionei um novo membro como governança, não aparece no campo Pessoas e nem abre função para receber login/senha

Problema:
Membro de governança sem cargo/tier definido podia não aparecer corretamente na página de administração pública, o que gerava sensação de “sumiu”.

Correção:
- A governança pública foi ajustada para exibir membros sem cargo definido em área apropriada.
- O fluxo administrativo e a gestão de conta continuam separados por permissão correta.

Arquivos principais:
- [pages/administracao/AdminPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/administracao/AdminPage.tsx)
- [tests/e2e/admin-public-governance.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/admin-public-governance.spec.ts)

Evidência:
- [pdf-admin-public-governance](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-admin-public-governance>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 11. Aparece mesmo se logado, não deveria. Somente uma vez.

Problema:
Mesmo problema do modal inteligente reaparecendo sem respeitar autenticação e estado de exibição.

Correção:
- O modal só aparece quando faz sentido.
- O comportamento foi validado com utilizador autenticado.

Evidência:
- [pdf-admin-public-governance](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-admin-public-governance>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 12. Benefícios devem aparecer todos um ao lado do outro

Problema:
A apresentação de benefícios não seguia o arranjo esperado.

Correção:
- A página de benefícios foi ajustada para exibir os cards em sequência horizontal por parceiro.

Arquivos principais:
- [pages/beneficios/BeneficiosPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/beneficios/BeneficiosPage.tsx)

Evidência:
- [pdf-visual-pages](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-visual-pages>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 13. Colocar perfil em destaque não acontece nada

Problema:
O campo `featured` existia, mas não tinha efeito visível suficiente na experiência pública.

Correção:
- Perfis em destaque passaram a ganhar prioridade nas listagens públicas.
- Também passaram a receber selo visual claro.

Arquivos principais:
- [pages/parceiros/ParceirosPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/parceiros/ParceirosPage.tsx)
- [components/domain/PartnerCard.tsx](/H:/Workspace/fundacaolusobrasileira/components/domain/PartnerCard.tsx)
- [components/domain/MemberCard.tsx](/H:/Workspace/fundacaolusobrasileira/components/domain/MemberCard.tsx)

Evidência:
- [pdf-admin-public-governance](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-admin-public-governance>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 14. Trocar foto do presidente

Problema:
O bloco do presidente estava hardcoded e dependia de conteúdo fixo da página.

Correção:
- Home e Quem Somos passaram a ler foto e dados do membro ativo com `tier = presidente`.
- A troca agora é feita pelo dashboard, editando o membro-presidente.

Arquivos principais:
- [pages/home/HomePage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/home/HomePage.tsx)
- [pages/quem-somos/QuemSomosPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/quem-somos/QuemSomosPage.tsx)
- [component.ui.tsx](/H:/Workspace/fundacaolusobrasileira/component.ui.tsx)

Evidência:
- [pdf-visual-pages](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-visual-pages>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## 15. Ajustar posicionamento do nome

Problema:
O bloco visual do presidente precisava de melhor enquadramento e posicionamento do texto.

Correção:
- O bloco foi reajustado visualmente em Home e Quem Somos.
- Os testes foram alinhados ao comportamento dinâmico do presidente atual, sem depender de um nome fixo antigo.

Arquivos principais:
- [pages/home/HomePage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/home/HomePage.tsx)
- [pages/quem-somos/QuemSomosPage.tsx](/H:/Workspace/fundacaolusobrasileira/pages/quem-somos/QuemSomosPage.tsx)
- [tests/e2e/pdf-visual-pages.spec.ts](/H:/Workspace/fundacaolusobrasileira/tests/e2e/pdf-visual-pages.spec.ts)

Evidência:
- [pdf-visual-pages](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-visual-pages>)
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

## Evidência Consolidada

Suite consolidada do pacote do PDF:
- [pdf-client-suite](</H:/Workspace/fundacaolusobrasileira/test-results/pdf-client-suite>)

Resultado:
- 15 testes E2E passaram no Chromium
- vídeos, screenshots e traces foram gerados

## Observação Final

Este pacote fecha os itens do PDF que foram reproduzidos e corrigidos nesta rodada. O sistema também ficou com proteção adicional para limpeza dos artefatos de E2E, para não poluir a base remota com dados de teste.
