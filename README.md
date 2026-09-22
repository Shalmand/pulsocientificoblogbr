# Pulso Científico

Site brasileiro de notícias de ciência — saúde, inteligência artificial, tecnologia, espaço, clima e
meio ambiente, natureza. Cada matéria parte de uma pesquisa publicada e traz o link para a fonte.

---

## ⚠️ Para o agente do Lovable (ou qualquer IA): leia antes de mexer

**Este repositório já é o site pronto.** Ele foi construído fora do Lovable, tela por tela, a partir
de um protótipo aprovado pelo dono do projeto (`docs/prototipo.html`). Não é um ponto de partida,
não é um rascunho e não precisa ser "melhorado". Siga exatamente o que está aqui.

1. **Não redesenhe nada.** O visual está em `src/styles/pulso.css` e é o design system do site
   (ver `docs/DESIGN-SYSTEM.md`). Não converta para Tailwind, não troque por componentes do shadcn,
   não mude fontes, cores, espaçamentos, raios, ícones, ordem das seções nem textos da interface.
2. **Não mexa no banco por fora.** Todas as tabelas, regras de acesso (RLS), gatilhos e funções estão
   em `supabase/migrations/`. Não crie tabela, coluna, política ou função nova, e não "simplifique"
   as que existem. Se algo parecer faltar, **pergunte** antes.
3. **Não invente.** Nenhuma tela, seção, texto, dado de exemplo, pessoa fictícia ou imagem que não
   esteja no código. O conteúdo vem do banco.
4. **Não mude as rotas.** `src/App.tsx` define os endereços em português; o sitemap, o agente de
   publicação e os links já compartilhados dependem deles.
5. **Papel de usuário só pelo banco.** Quem é admin, editor ou autor vem da tabela `user_roles`
   (funções `has_role`, `is_staff`, `escreve_saude`). Nunca do perfil, do JWT, de campo de
   formulário ou do `localStorage`.
6. **Login só com Google.** Não ative e-mail/senha, link mágico nem outro provedor.
7. **Chaves secretas só em Lovable Cloud → Secrets.** Nenhuma chave de API vai para o código que
   roda no navegador. As funções em `supabase/functions/` leem as chaves no servidor.
8. **O que você pode (e deve) ajustar sozinho:**
   - `src/integrations/supabase/client.ts`: pode regerar com o endereço e a chave pública do
     projeto, desde que continue exportando `supabase`.
   - Se o login gerenciado do Lovable Cloud exigir um helper próprio, troque **só o corpo** da função
     `entrarComGoogle()` em `src/lib/auth.tsx`.
   - A linha `project_id` em `supabase/config.toml`.
9. **Avisos de segurança do Supabase (Advisors/Security scan):** dois são esperados e não devem ser
   "corrigidos" — a view `perfis_publicos` (Security Definer View) e a extensão `unaccent` no schema
   public. Ver o passo 9 do guia abaixo.
10. **Na dúvida, pergunte.** É melhor responder uma pergunta do que desfazer uma tela.

---

## Como está organizado

```
src/
  styles/pulso.css        visual do site (veio do protótipo, sem alteração)
  styles/site.css         poucos complementos para os anúncios de verdade
  App.tsx                 rotas
  lib/                    banco (db.ts), login (auth.tsx), datas, SEO, limpeza de HTML, redes sociais
  components/             cabeçalho, rodapé, cookies, anúncios, comentários, moldura do painel, aviso de erro
  components/editor/      editor de texto, seletor de categoria, seletor de capa
  pages/                  telas públicas (home, categoria, matéria, autor, páginas, conta…)
  pages/painel/           painel (matérias, editor, acessos, categorias, publicidade, comentários, auditoria)
public/
  marca/                  logotipos oficiais (SVG) — não alterar
  capas/                  capas das 5 matérias de estreia
supabase/
  migrations/             banco inteiro, em 3 arquivos, na ordem do nome
  functions/              12 funções do servidor (pautas, capa e gravação para o agente, fotos de capa, CRM, sitemap, feed RSS, prévia de links…)
  config.toml             quais funções exigem login
docs/                     especificação: banco, auditoria, comunidade, publicidade, fontes, imagens, protótipo
                          (consulta; o que vale é o código. Caminhos citados lá como ferramentas/,
                          banco/ e agente/ ficam no computador do dono e NÃO fazem parte deste
                          repositório: não crie essas pastas)
```

### Rotas

| Endereço | Tela |
|---|---|
| `/` | home |
| `/saude`, `/saude/doencas`, `/saude/doencas/figado` | categoria nos 3 níveis |
| `/saude/<endereço-da-matéria>` | matéria (o 2º pedaço vira matéria quando não é subcategoria) |
| `/autor/<endereço>` | página do autor ou da redação |
| `/busca?q=<termo>` | busca (ignora acento e maiúscula; procura em título, linha fina e tags) |
| `/tag/<tag>` | matérias com aquela tag |
| `/sobre`, `/politica-editorial`, `/politica-de-privacidade`, `/termos-de-uso`, `/cookies` | páginas institucionais (texto na tabela `paginas`) |
| `/parceiros`, `/parceria` | parceiros e "Escreva com a gente" |
| `/entrar`, `/conta`, `/completar` | login Google, minha conta (salvos, seguindo, novidades), primeiro cadastro de quem escreve |
| `/painel`, `/painel/nova`, `/painel/materia/<id>` | matérias e editor |
| `/painel/acessos`, `/painel/categorias`, `/painel/publicidade`, `/painel/comentarios` | administração |
| `/painel/auditoria` | auditoria: entradas da equipe e tudo o que foi feito com matérias e acessos (só admin) |

---

## Colocar no ar — passo a passo

### 1. Criar o projeto no Lovable a partir do GitHub
Lovable → **New project → Import from GitHub** → escolha este repositório.

### 2. Colar o "conhecimento do projeto"
No Lovable: **Project settings → Knowledge** (conhecimento do projeto). Cole o texto abaixo. É o que o
agente do Lovable relê a cada mensagem — assim ele não esquece as regras.

```
Este projeto é o site Pulso Científico já pronto, importado do GitHub. Siga o README.md à risca.
Não redesenhe, não troque o CSS (src/styles/pulso.css) por Tailwind ou shadcn, não invente telas,
textos ou dados, não mude rotas. Não crie nem altere tabelas, políticas, gatilhos ou funções do
banco fora de supabase/migrations. Papel de usuário só por user_roles/has_role. Login só Google.
Chaves secretas só em Cloud → Secrets, nunca no navegador. Em dúvida, pergunte antes de mudar.
```

### 3. Ligar o Lovable Cloud e criar o banco
1. Ligue o **Lovable Cloud** no projeto.
2. Mande esta mensagem ao agente do Lovable (é a única tarefa dele nesta etapa):

   > Aplique as migrações de `supabase/migrations/` exatamente como estão, na ordem do nome do
   > arquivo, sem alterar nada. Não crie tabelas, políticas ou funções além delas. Depois, confira e me
   > diga quantas tabelas existem no schema public e se todas estão com RLS ligada (devem ser 23).

   Se preferir fazer à mão: Cloud → **SQL Editor**, cole e rode os 3 arquivos, um de cada vez, na
   ordem `…115900_buckets`, `…120000_estrutura`, `…120100_conteudo_inicial`.
3. Confira: 23 tabelas, todas com o cadeado de RLS; 99 categorias; 5 matérias; 5 páginas.

### 4. Login com Google (e só ele)
Cloud → **Users → Authentication → Providers**: ligue **Google**; desligue e-mail/senha, link
mágico, telefone e o resto. Em URL Configuration, coloque o endereço do site.

### 5. Entrar como admin
O banco já deixa **blog.pulsocientifico@gmail.com** liberado como admin. Entre com essa conta:
você cai direto no painel.

### 6. Segredos
Cloud → **Secrets**:

| Segredo | Para quê |
|---|---|
| `AGENTE_CHAVE` | 50+ caracteres aleatórios; o agente usa para publicar (obrigatório) |
| `PULSO_ADMIN_KEY` | 50+ caracteres aleatórios; administração pelo terminal (obrigatório) |
| `PULSO_DOMINIO` | `https://pulsocientifico.com.br`, sem barra no fim (obrigatório) |
| `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY` | busca de fotos de capa no editor |
| `CROSSREF_MAILTO`, `NCBI_API_KEY`, `OPENALEX_API_KEY` | opcionais (ver `docs/FONTES.md`) |
| `CRM_PROVEDOR`, `CRM_API_URL`, `CRM_API_CHAVE` | opcionais; sem eles o admin confere o CRM na mão |
| `COPIAR_PEXELS` | opcional: `1` copia as fotos do Pexels para o armazenamento em vez de usar o link |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` o Cloud já cria sozinho: não cadastre.

O domínio usado no canonical e no Open Graph já vem como `https://pulsocientifico.com.br`
(`src/lib/dados.ts`). Só precisa da variável `VITE_SITE_URL` se o domínio mudar.

**Google Analytics (opcional):** crie a variável `VITE_GA_ID` com o código `G-XXXXXXXXXX`. Ela é
pública (vai para o navegador), por isso não é um segredo. O Analytics só carrega para quem aceitar
"Estatísticas" no aviso de cookies; sem a variável, nada do Google é carregado.

### 7. Funções do servidor
As 12 pastas de `supabase/functions/` sobem com o Cloud. `supabase/config.toml` já diz quais são
abertas (sitemap, llms, feed, og, e as chamadas pelo agente com chave própria) e quais exigem login.

### 8. Sitemap, feed e robôs
Em `public/robots.txt`, troque `SEU_PROJETO` pelo código do projeto no Cloud. No Google Search
Console, envie o endereço `https://SEU_PROJETO.supabase.co/functions/v1/sitemap`.

O feed RSS fica em `https://SEU_PROJETO.supabase.co/functions/v1/feed` (uma área só:
`…/feed?categoria=saude`). O rodapé já aponta para ele. Serve para leitores de RSS, para o Google
Notícias (Publisher Center → adicionar feed) e para agregadores.

### 9. Conferir antes de abrir ao público
- [ ] Entrar com blog.pulsocientifico@gmail.com → painel, como admin.
- [ ] Entrar com outra conta Google → vira leitor, sem painel.
- [ ] Em **Acessos**, liberar um Gmail de teste como **autor médico** → no primeiro login ele cai em
      "Complete o seu cadastro"; salva rascunho, mas não envia para revisão até o CRM ser liberado.
- [ ] Comentar como leitor → fica "em análise" (moderação prévia é o padrão).
- [ ] Publicidade: os 4 espaços começam no anúncio interno; a lateral mostra o anúncio da casa.
- [ ] Cloud → Database → **Advisors**: resolver o que aparecer, **menos** o aviso "Security Definer
      View" em `perfis_publicos`. Esse é de propósito: a view mostra só nome e foto de quem já
      comentou ou escreve (nunca e-mail), para os comentários exibirem o autor. Trocar para
      `security_invoker` apaga os nomes dos comentários. Também não mexa no aviso "Extension in
      Public" do `unaccent`: a busca e os endereços das matérias usam a extensão onde ela está.

### 10. Agente de publicação (uma matéria por dia)
O site **não tem IA dentro dele** e não precisa de chave da Anthropic. Quem escolhe a pauta, escreve
e checa é uma **tarefa agendada no app do Claude**, no computador do dono do site. Ela usa só três
funções do site, todas trancadas pela `AGENTE_CHAVE`:

| Função | O que faz |
|---|---|
| `coletar-pauta` | busca estudos novos nas fontes e devolve os candidatos, já sem repetidos |
| `gerar-capa` | escolhe a foto de capa no Pexels (ou uma reserva aprovada) |
| `publicar-materia` | confere a matéria de novo (tags, palavras vetadas, categorias) e grava |

Cada envio fica registrado e aparece no painel, no quadro **Agente de publicação** (só o admin vê).
As instruções da rotina ficam fora deste repositório, na pasta de trabalho do dono do site
(`agente/ROTINA-DIARIA.md`). Por padrão a matéria chega **em revisão** e espera alguém publicar.

Para agendar a verificação semanal das capas (confere se as fotos por link ainda abrem):
Cloud → Database → **Extensions**: ligue `pg_cron` e `pg_net`. No **SQL Editor**, rode trocando
`SEU_PROJETO` e `SUA_AGENTE_CHAVE` (a chave fica no cofre do banco, não no texto do agendamento):

```sql
select vault.create_secret('SUA_AGENTE_CHAVE', 'agente_chave');

-- Toda segunda às 7h de Brasília
select cron.schedule('verificar-capas', '0 10 * * 1', $$
  select net.http_post(
    url     := 'https://SEU_PROJETO.supabase.co/functions/v1/verificar-capas',
    headers := jsonb_build_object('Content-Type', 'application/json',
               'x-agente-chave', (select decrypted_secret from vault.decrypted_secrets where name = 'agente_chave')),
    body    := '{}'::jsonb);
$$);
```

### 11. Prévia de links no WhatsApp e nas redes (opcional, depois do domínio)
O site é montado no navegador. Os robôs do WhatsApp, Facebook, LinkedIn e X não rodam JavaScript,
então, sem este passo, todo link compartilhado mostra o título e a imagem gerais do site. O Google
não tem esse problema (ele roda JavaScript).

A função `og` já devolve a prévia certa de cada matéria, autor e categoria:
`https://SEU_PROJETO.supabase.co/functions/v1/og?caminho=/saude/endereco-da-materia`. Falta o
domínio mandar os robôs para ela. Com o domínio no Cloudflare, crie um Worker com esta regra:
se o `User-Agent` contém `WhatsApp`, `facebookexternalhit`, `LinkedInBot`, `Twitterbot`,
`TelegramBot`, `Slackbot` ou `Discordbot`, buscar
`…/functions/v1/og?caminho=<caminho pedido>` e devolver a resposta; senão, seguir normal.
Pessoas nunca passam pela função.

---

## O que o site faz além do protótipo

- **Busca** (`/busca`): a lupa do cabeçalho abre. Procura sem ligar para acento ou maiúscula.
- **Tags clicáveis** (`/tag/<tag>`) no pé de cada matéria.
- **Leituras**: cada matéria conta uma leitura por visita (uma vez por aba). "Mais lidas" na home usa
  isso (últimos 30 dias), e o painel mostra a coluna **Leituras**.
- **Novidades para quem segue**: quem segue um autor ou uma categoria vê um número no ícone da conta
  quando sai matéria nova, e a lista em Minha conta → **Novidades**. O aviso é dentro do site (sem
  e-mail).
- **Agendar publicação**: no editor, admin e editor escolhem "Publicar em" com data futura; a matéria
  só aparece no site (e no sitemap e no feed) a partir desse horário.
- **Aviso de alterações não salvas** ao sair do editor.
- **Auditoria** (Painel → Auditoria, só admin): cada entrada de quem tem papel, e cada vez que alguém
  cria, edita (com o que mudou), envia para revisão, publica, agenda, tira do ar, arquiva ou apaga
  matéria, libera acesso ou muda papel. Quem grava é o banco, por gatilhos, então vale para qualquer
  caminho; dá para filtrar por tipo, período e pessoa e baixar em planilha. Ver `docs/AUDITORIA.md`.
- **Feed RSS**, **Google Analytics com consentimento** e **prévia de links** (passos 6, 8 e 11).
- **Imagens no tamanho certo**: fotos do Pexels e do Unsplash vêm menores nas listas e grandes na
  matéria.
- Se uma tela der erro, aparece "Algo não carregou direito" com botão de recarregar, e o resto do
  site continua funcionando.

## Ainda não existe (pendências conhecidas)

- **`public/ads.txt`**: entra quando a conta do AdSense existir (precisa do ID `pub-…`).
- **Aviso por e-mail** para quem segue: hoje o aviso é só dentro do site.
- **Prévia de links**: a função existe; falta a regra no domínio (passo 11).
- A rotina diária do Claude é montada depois que o site estiver no ar (precisa do endereço do
  projeto e da `AGENTE_CHAVE`).

## Diferenças em relação ao protótipo (decididas, não esquecidas)

- Todo conteúdo vem do banco: saíram as pessoas, comentários e números de exemplo do protótipo.
- **Anúncio da casa** ("Sua marca perto de quem lê ciência") não é uma campanha no banco: aparece
  sozinho na lateral quando não há anúncio vendido, e o botão abre um e-mail para
  blog.pulsocientifico@gmail.com. Por isso o campo "Tipo" do anúncio interno saiu, e cada espaço
  reveza as campanhas pelo peso (sem escolher uma fixa).
- No painel de Publicidade, o selo "ads.txt no ar" é conferido de verdade; o número de bloqueador de
  anúncio (que era exemplo) saiu.
- Botões de compartilhar funcionam (WhatsApp, Facebook, X, copiar link).
- "Mais lidas" ordena por leituras dos últimos 30 dias.
- Configurações de comentários (ligar, moderação, palavras) só o admin muda; o editor modera.
- Editar comentário vale nos primeiros 15 minutos (regra do banco).
- Admin sem perfil de autor próprio assina como a redação principal.

## Segurança (regras que continuam valendo)

- O arquivo `.env` nunca vai para o GitHub (está no `.gitignore`). Chaves só em Cloud → Secrets.
- Nenhuma chave secreta no navegador; o site usa só a chave pública do Supabase, protegida pelo RLS.
- Papel de usuário muda só pelas funções do banco (`autorizar_email`, `definir_papel`,
  `remover_acesso`), que conferem se quem pede é admin.

## Rodar no computador (opcional)

```bash
npm install
npm run dev
```

Precisa de um arquivo `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do
projeto (ver `.env.example`).
