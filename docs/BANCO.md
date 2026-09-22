# Banco de dados, contas e publicação (Lovable Cloud)

## A ideia central: nenhuma matéria vira código

O site tem **um modelo de página de matéria** (`/:categoria/:slug`) e **um modelo de página de
autor** (`/autor/:slug`). Quando alguém abre o endereço, a página busca os dados no banco e
se monta na hora. Publicar é só gravar uma linha na tabela `materias`, seja pelo agente,
seja por um médico no painel. O Lovable não é acionado, então **não gasta crédito**.

Analogia: o site é uma revista com a diagramação pronta; o banco é a pasta de textos.
Colocar um texto novo na pasta não exige redesenhar a revista.

## Conteúdo inicial

O banco começa com **5 matérias publicadas** (uma por editoria) e o autor "Redação Pulso".
Texto, SEO, fonte e capa de cada uma estão em `banco/materias.json`. Para mudar alguma coisa
antes da importação: edite o JSON e rode `node ferramentas/banco-fixo.mjs`, que confere as
regras, gera `banco/seed-materias.sql` e atualiza o protótipo.

Estrutura da matéria no banco: **título**, **linha fina** (o resumo, até 160 caracteres, que também
vira a descrição no Google e no compartilhamento) e **corpo em rich text** (`corpo_html`).
Não existe campo separado de resumo nem de número em destaque: quem escreve formata tudo
dentro do corpo, pelo editor visual ou no modo HTML.

Tags e classes aceitas no `corpo_html` (o resto é removido ao salvar e ao exibir):
`p h2 h3 strong em u a ul ol li blockquote br table thead tbody tr th td`, mais `div`/`span` só com as classes
`texto-grande`, `caixa-destaque` e `numero-destaque`. O anúncio do meio do texto não fica
no corpo: o site insere antes do 2º título de seção (ou depois do 3º parágrafo).

**Limpeza obrigatória no site:** autores (não só o admin) escrevem o corpo, então o HTML passa
por um sanitizador com essa lista (DOMPurify) **ao salvar e ao exibir**. Sem isso, um autor
poderia colar um script que roda para todos os leitores.

## Papéis e funções de acesso (é o primeiro bloco a rodar no banco)

Todas as regras de acesso das outras tabelas chamam `has_role` e `is_staff`, então este bloco
precisa existir antes de qualquer `create policy`.

```sql
-- Papéis ficam numa tabela separada (nunca no perfil), para ninguém se promover a admin
--   autor        → escreve em todas as áreas, menos Saúde (não precisa de conselho)
--   autor_medico → escreve em todas, inclusive Saúde; confirma CRM no primeiro login
--   parceiro     → organização parceira (blog, grupo, instituto, veículo): conteúdo editorial
--                  próprio, marcado como "parceria editorial"
--   parceiro_publicidade → agência, anunciante, marca: conteúdo comercial, marcado como
--                  "Publicidade"; a redação não participa
--   nenhum dos dois entra em Saúde
create type papel as enum ('admin','editor','autor','autor_medico','parceiro','parceiro_publicidade');

create table user_roles (
  user_id  uuid references auth.users(id) on delete cascade,
  role     papel not null,
  primary key (user_id, role)
);

-- Função usada pelas regras de acesso (security definer evita recursão no RLS)
create or replace function has_role(_user uuid, _role papel)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = _user and role = _role)
$$;

create or replace function is_staff(_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select has_role(_user,'admin') or has_role(_user,'editor')
$$;

create or replace function escreve_saude(_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select has_role(_user,'autor_medico') or is_staff(_user)
$$;
```

## Categorias em 3 níveis

O Pulso Científico cobre ciência em geral (decisão de 17/09/2026): **Saúde, Inteligência Artificial,
Tecnologia, Espaço, Clima e Meio Ambiente e Natureza**. Cada categoria tem subcategorias, e cada
subcategoria pode ter microcategorias. Exemplo: Saúde › Doenças › Fígado.

- Lista inicial em `banco/categorias.json` (6 categorias, 25 subcategorias, 68 microcategorias).
- O admin cria, edita, reordena, move, oculta e exclui pelo painel (**Painel → Categorias**), sem mexer no código.
- Cor só na categoria principal; subcategorias e microcategorias herdam.
- Endereços: `/saude`, `/saude/doencas`, `/saude/doencas/figado`. A matéria fica em `/saude/<slug-da-materia>`.
- O endereço de cada categoria é único no site inteiro e não pode repetir rota reservada
  (`autor`, `painel`, `entrar`, `sobre`, `cookies`...) nem endereço de matéria.
- Não dá para excluir categoria com matérias ou com níveis dentro: é preciso mover antes ou ocultar.

```sql
create table categorias (
  slug       text primary key,
  nome       text not null,
  descricao  text check (char_length(descricao) <= 200),
  cor        text check (cor ~ '^#[0-9A-Fa-f]{6}$'),     -- só no nível 1
  pai        text references categorias(slug) on update cascade,
  nivel      int  not null check (nivel between 1 and 3),
  ordem      int  not null default 1,
  ativa      boolean not null default true,
  constraint nivel_coerente check ((nivel = 1 and pai is null and cor is not null) or (nivel > 1 and pai is not null))
);
alter table categorias enable row level security;
create policy "publico le categorias" on categorias for select using (true);
create policy "admin gerencia categorias" on categorias for all using (has_role(auth.uid(),'admin'));

-- Garante que o pai é exatamente um nível acima
create or replace function checar_nivel_categoria() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.pai is not null and (select nivel from categorias where slug = new.pai) <> new.nivel - 1 then
    raise exception 'A % precisa ficar dentro de um item do nível %.', case new.nivel when 2 then 'subcategoria' else 'microcategoria' end, new.nivel - 1;
  end if;
  return new;
end $$;
create trigger categorias_nivel before insert or update on categorias
  for each row execute function checar_nivel_categoria();

-- Na matéria, os três níveis precisam formar um caminho válido
create or replace function checar_categorias_materia() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if (select nivel from categorias where slug = new.editoria) <> 1 then
    raise exception 'editoria precisa ser uma categoria principal.';
  end if;
  if new.subcategoria is not null and (select pai from categorias where slug = new.subcategoria) <> new.editoria then
    raise exception 'A subcategoria não pertence à categoria escolhida.';
  end if;
  if new.microcategoria is not null and (new.subcategoria is null or (select pai from categorias where slug = new.microcategoria) <> new.subcategoria) then
    raise exception 'A microcategoria não pertence à subcategoria escolhida.';
  end if;
  return new;
end $$;
-- (o gatilho é criado depois, junto da tabela materias)
```

## Páginas institucionais

**Sobre nós** (`/sobre`), **Política editorial** (`/politica-editorial`), **Política de privacidade** (`/politica-de-privacidade`),
**Termos de uso** (`/termos-de-uso`) e **Política de cookies** (`/cookies`) ficam no banco, na tabela `paginas`,
e usam o mesmo modelo de página. Mudar o texto não mexe no código. O conteúdo inicial está em
`banco/paginas.json` e entra pelo mesmo `seed-materias.sql`. O e-mail de contato já está
preenchido (`blog.pulsocientifico@gmail.com`); falta só o `[CNPJ, se houver]` na privacidade,
se o projeto virar empresa.

```sql
create table paginas (
  slug          text primary key,              -- sobre, politica-editorial
  titulo        text not null,
  linha_fina    text check (char_length(linha_fina) <= 160),
  corpo_html    text not null,                 -- mesmo HTML limpo do corpo das matérias
  atualizada_em timestamptz not null default now()
);
alter table paginas enable row level security;
create policy "publico le paginas" on paginas for select using (true);
create policy "admin edita paginas" on paginas for all using (has_role(auth.uid(),'admin'));
```

## SEO automático

Ninguém preenche SEO à mão. O site monta tudo a partir da matéria, como fazem os portais de notícia:

| O que o Google vê | De onde vem |
|---|---|
| `<title>` e `og:title` | o **título** |
| `<meta name="description">` e `og:description` | a **linha fina** |
| endereço (`slug`) | o **título** em minúsculas, sem acento, com hífens (gerado pelo banco) |
| `og:image` | a **capa** |
| `keywords` e `NewsArticle.keywords` | a **palavra-chave principal** + as **tags** |

**Endereço:** acompanha o título enquanto a matéria nunca foi publicada. Na primeira publicação
fica **fixo para sempre**, para não quebrar links já compartilhados no WhatsApp e no Google.
Se dois títulos gerarem o mesmo endereço, o segundo ganha `-2`.

**Palavra-chave principal:** o editor sugere automaticamente. O algoritmo pontua expressões de
1 a 4 palavras pelo lugar onde aparecem (título 5, tags 4, linha fina 3, subtítulos 2, texto 1),
dá bônus para expressões compostas, ignora palavras vazias e verbos comuns, e só considera o que
está no título, na linha fina ou nas tags. O autor pode clicar em outra sugestão ou digitar;
se não mexer, vale a primeira sugestão. O editor também dá dicas (palavra-chave no título, na
linha fina, no primeiro parágrafo; título até 60 caracteres), que não bloqueiam o salvamento.

**Tags:** digitadas pelo autor junto com a capa (até 8). Organizam o site e contam como palavras-chave.

## Tipo de matéria e assinatura

**Dois tipos de matéria** (`materias.tipo`):
- `estudo` — parte de uma pesquisa publicada. `fonte` obrigatória (DOI e PMID puxados do PubMed),
  seção de limitações no texto, caixa "Fonte original" no fim da página. É o que o agente produz.
- `artigo` — texto próprio do autor, sem estudo de origem. `fonte` vazia, sem caixa de fonte,
  com a etiqueta "Artigo do autor" e aviso de artigo assinado. Pensado para médicos parceiros.

**A assinatura não é escolhida, é herdada.** O painel não tem campo de autor. O banco decide:
- matéria nova feita no painel → perfil de autor ligado ao usuário logado (médico: com CRM, UF e RQE);
- admin ou editor sem perfil pessoal → "Redação Pulso";
- matéria do agente → "Redação Pulso";
- depois de criada, **a assinatura nunca muda**, nem por admin. Editar a matéria de outra
  pessoa mantém o nome dela.

Na página da matéria, médicos aparecem com CRM no topo e com o bloco "Quem escreve" no fim
(nome, CRM-UF, especialidade e RQE), como pede a Resolução CFM 2.336/2023.

## Quem acessa o quê

| Papel | Quem é | Pode |
|---|---|---|
| (sem papel) | leitor | Curtir, salvar, seguir e comentar. Todo mundo começa aqui |
| `autor` | Jornalista, pesquisador, divulgador | Escrever e enviar para revisão em **todas as áreas, menos Saúde** |
| `autor_medico` | Médico parceiro | Tudo o que o autor faz **+ Saúde**; confirma CRM no primeiro login |
| `editor` | Revisor de conteúdo (futuro) | Revisar e publicar matérias de qualquer autor, editar perfis |
| `admin` | Victor | Tudo: publicar, liberar e remover acessos, mudar papéis |
| agente | Robô diário | Não tem login. Grava pela função `publicar-materia`, com chave secreta, como "Redação Pulso" |

**Login só com Google, para todo mundo.** Não existe e-mail e senha, link mágico nem qualquer
outro provedor — nem para leitor, nem para autor, nem para o admin.

**Não existe pedido de acesso.** Quem entra com o Google vira leitor e pronto. Para escrever, o
admin cadastra o Gmail antes em `acessos_autorizados`, com o papel: no primeiro login a pessoa
já recebe o papel **e o perfil público de autor**, criado pelo banco. Se a pessoa já era leitora,
o papel vale na hora (`autorizar_email`).

Por que Saúde é separada: matéria de saúde tem regra de conselho (CFM 2.336/2023) e é o conteúdo
que o Google olha com mais rigor. Quem não é médico escreve em Tecnologia, IA, Espaço, Clima e
Natureza sem precisar de registro nenhum — o banco recusa `editoria = 'saude'` para esses perfis.

Remover acesso = apagar o papel em `user_roles`. A conta Google continua existindo, mas a
pessoa volta a ser leitora. As matérias publicadas por ela continuam no site.

**No Lovable:** Cloud → Users → Authentication → ativar **Google** e desligar e-mail/senha,
link mágico, telefone e qualquer outro provedor da lista.
O Lovable Cloud já traz o login Google pronto; só se quiser a tela de consentimento com o
nome e logo do Pulso é preciso criar credenciais próprias no Google Cloud.

**Fluxo de status:** `rascunho` → `em_revisao` → `publicada` (ou `arquivada`).
Autor nunca publica sozinho; editor/admin publica. Matérias do agente entram como
`em_revisao` nas primeiras semanas e depois podem entrar direto como `publicada`.

## Tabelas

```sql
-- Perfil público do autor (é o que aparece em /autor/:slug)
create table autores (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete set null, -- null = Redação (agente)
  slug            text unique not null,                  -- helena-exemplo
  nome            text not null,                         -- "Dra. Helena Exemplo"
  tipo            text not null check (tipo in ('redacao','medico','profissional_saude','jornalista','organizacao','publicidade')),
  crm             text,                                  -- só números
  crm_situacao    text not null default 'nao_aplica'
                  check (crm_situacao in ('nao_aplica','pendente','verificado','divergente','nao_encontrado','conferido_a_mao')),
  crm_verificado_em timestamptz,
  crm_nome_conselho text,                                -- nome que o conselho devolveu, para comparar
  crm_uf          char(2),
  especialidade   text,
  rqe             text,                                  -- obrigatório se especialidade preenchida (CFM 2.336/2023)
  bio             text,
  formacao        text,                                  -- "Jornalista de ciência", "Médica de família"
  foto_url        text,
  declarou_em     timestamptz,                           -- aceite das regras no cadastro
  cadastro_completo_em timestamptz,                      -- preenchido por completar_cadastro
  links           jsonb not null default '{}'::jsonb,    -- redes do perfil, todas opcionais:
                                                         -- {site, instagram, youtube, tiktok, doctoralia, email}
                                                         -- guardadas como o autor digitou (@perfil ou URL);
                                                         -- o site monta o endereço e usa rel="noopener nofollow"
  ativo           boolean not null default true,
  -- Só para tipo = 'redacao': qual perfil o agente assina por padrão. Dá para ter mais de uma
  -- redação (ex.: uma por área), mas só uma é a principal.
  agente_padrao   boolean not null default false,
  criado_em       timestamptz not null default now(),
  -- o perfil de médico nasce inativo e sem CRM; para ficar ativo, o CRM precisa estar lá
  constraint medico_tem_crm check (tipo <> 'medico' or not ativo or (crm is not null and crm_uf is not null)),
  constraint especialidade_tem_rqe check (especialidade is null or tipo <> 'medico' or rqe is not null)
);

-- Uma redação principal por vez
create unique index uma_redacao_padrao on autores (agente_padrao) where agente_padrao;

create table materias (
  id               uuid primary key default gen_random_uuid(),
  autor_id         uuid not null references autores(id),   -- definido pelo banco (gatilho abaixo), nunca pelo formulário
  tipo             text not null default 'estudo' check (tipo in ('estudo','artigo')),
  slug             text unique not null,   -- gerado pelo banco a partir do título (gatilho materias_slug)
  editoria         text not null references categorias(slug) on update cascade,   -- nível 1 (ex.: saude)
  subcategoria     text references categorias(slug) on update cascade,            -- nível 2 (ex.: doencas)
  microcategoria   text references categorias(slug) on update cascade,            -- nível 3 (ex.: figado)
  titulo           text not null check (char_length(titulo) <= 65),
  linha_fina       text not null check (char_length(linha_fina) <= 160),  -- resumo; também é a descrição no Google
  corpo_html       text not null,
  seo              jsonb not null,   -- {palavra_chave, tags[]}; title = título, descrição = linha fina
  imagem_url       text,
  imagem_alt       text,
  imagem_credito   jsonb,            -- {fonte: pexels|pixabay|unsplash|upload|reserva, autor, link, perfil, id}; vira a legenda
  imagem_quebrada  boolean not null default false,  -- marcado pela checagem semanal (capas do Unsplash por link)
  fonte            jsonb,            -- {tipo: estudo|preprint|comunicado, revista, titulo_original,
                                     --  autores, data, url, doi?, pmid?}; só em tipo = estudo
  tempo_leitura    int  not null default 5,
  origem           text not null default 'painel' check (origem in ('painel','agente')),
  status           text not null default 'rascunho' check (status in ('rascunho','em_revisao','publicada','arquivada')),
  revisado_por     uuid references auth.users(id),   -- quem aprovou a publicação
  publicada_em     timestamptz,
  corrigida_em     timestamptz,                      -- só quando houve correção depois de publicada
  nota_correcao    text check (char_length(nota_correcao) <= 300),  -- o que mudou, em uma frase
  atualizada_em    timestamptz not null default now(),
  criada_em        timestamptz not null default now(),
  -- toda matéria do agente precisa de link para a origem; DOI e PMID quando existirem
  constraint fonte_por_tipo check (
    (tipo = 'estudo' and (fonte ? 'url' or fonte ? 'doi')) or (tipo = 'artigo' and fonte is null))
);

-- Assinatura: o banco escolhe o autor na criação e impede troca depois
create or replace function assinatura_materia() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  perfil autores;
begin
  if tg_op = 'UPDATE' then
    if new.autor_id <> old.autor_id then
      raise exception 'A assinatura de uma matéria não pode ser alterada.';
    end if;
    if auth.uid() is not null and not exists (select 1 from user_roles where user_id = auth.uid()) then
      raise exception 'Seu acesso para escrever foi removido. Fale com o admin.';
    end if;
  elsif auth.uid() is not null then            -- criada no painel (agente usa service role: auth.uid() nulo)
    -- o próprio perfil, mesmo inativo: médico com CRM em conferência escreve rascunho (a trava abaixo
    -- impede que ele envie ou publique). Sem papel em user_roles, o acesso foi removido: não escreve.
    select * into perfil from autores where user_id = auth.uid();
    if found and not exists (select 1 from user_roles where user_id = auth.uid()) then
      raise exception 'Seu acesso para escrever foi removido. Fale com o admin.';
    end if;
    if not found and is_staff(auth.uid()) then
      select * into perfil from autores where tipo = 'redacao' and agente_padrao limit 1;  -- redação principal
      if not found then select * into perfil from autores where slug = 'redacao-pulso'; end if;
    end if;
    if perfil.id is null then
      raise exception 'Seu usuário não tem perfil de autor. Peça ao admin para criar.';
    end if;
    new.autor_id := perfil.id;                  -- ignora qualquer autor enviado pelo formulário
  end if;

  select * into perfil from autores where id = new.autor_id;

  -- Ninguém escreve antes de completar o cadastro do seu papel
  if perfil.tipo <> 'redacao' and perfil.cadastro_completo_em is null then
    raise exception 'Complete o seu cadastro antes de criar matéria.';
  end if;

  -- Médico só envia para revisão ou publica com CRM confirmado e, se citar especialidade, RQE
  if perfil.tipo = 'medico' and new.status in ('em_revisao','publicada') then
    if perfil.crm is null or perfil.crm_uf is null then
      raise exception 'Confirme o seu CRM antes de enviar a matéria.';
    end if;
    if perfil.crm_situacao not in ('verificado','conferido_a_mao') then
      raise exception 'Seu CRM ainda está em conferência. Enquanto isso, a matéria fica em rascunho.';
    end if;
    if perfil.especialidade is not null and perfil.rqe is null then
      raise exception 'Especialidade preenchida exige o RQE (Resolução CFM 2.336/2023).';
    end if;
  end if;

  -- Saúde é área de autor médico. Jornalista, empresa parceira e afins ficam nas outras áreas.
  if new.editoria = 'saude' and perfil.tipo not in ('medico','redacao') then
    raise exception 'Matérias de Saúde só podem ser assinadas por autor médico ou pela Redação.';
  end if;
  return new;
end $$;

-- só quando o conteúdo muda: contadores (curtidas, comentários, leituras) não passam por aqui
create trigger materias_assinatura before insert or update of autor_id, status, editoria, titulo, linha_fina, corpo_html, fonte on materias
  for each row execute function assinatura_materia();

-- Agora que materias existe, liga o gatilho que confere o caminho das categorias
create trigger materias_categorias before insert or update of editoria, subcategoria, microcategoria on materias
  for each row execute function checar_categorias_materia();

-- Carimbo de hora: atualizada_em sempre vale; corrigida_em só quando a matéria já estava no ar
-- e o texto mudou. É o que vira "Corrigida em ..." no site e o dateModified no Google.
create or replace function tocar_materia() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.atualizada_em := now();
  if old.status = 'publicada' and new.status = 'publicada'
     and (new.corpo_html is distinct from old.corpo_html
       or new.titulo is distinct from old.titulo
       or new.linha_fina is distinct from old.linha_fina) then
    new.corrigida_em := now();
  end if;
  return new;
end $$;
create trigger materias_tocar before update of tipo, editoria, subcategoria, microcategoria, titulo, linha_fina,
  corpo_html, seo, imagem_url, imagem_alt, imagem_credito, fonte, status, nota_correcao on materias
  for each row execute function tocar_materia();

-- Endereço automático: título sem acento com hífens; fixo depois da primeira publicação
create extension if not exists unaccent;

create or replace function slugificar(t text) returns text language sql stable set search_path = public, extensions as $$
  select trim(both '-' from regexp_replace(lower(unaccent(t)), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function slug_materia() returns trigger language plpgsql set search_path = public, extensions as $$
declare
  base text;
  n int := 1;
begin
  if tg_op = 'UPDATE' and old.publicada_em is not null then
    new.slug := old.slug;                      -- publicada: o endereço não muda mais
    return new;
  end if;
  base := slugificar(new.titulo);
  new.slug := base;
  -- só numera quando o endereço já é de OUTRA matéria; com o mesmo título, deixa dar conflito
  -- (é o que faz o seed poder rodar de novo sem duplicar: on conflict (slug) do update)
  while exists (select 1 from materias where slug = new.slug and id <> new.id and titulo <> new.titulo) loop
    n := n + 1;
    new.slug := base || '-' || n;
  end loop;
  return new;
end $$;

create trigger materias_slug before insert or update of titulo, slug on materias
  for each row execute function slug_materia();

-- Tudo o que o agente já viu, de qualquer fonte, para não oferecer duas vezes.
-- id_externo vem com prefixo: pmid:123, arxiv:2609.01234, doi:10.1038/…, url:https://…
create table pautas_processadas (
  id_externo  text primary key,
  fonte       text not null,          -- id da fonte em banco/fontes.json
  tipo        text not null default 'estudo' check (tipo in ('estudo','preprint','comunicado')),
  editoria    text references categorias(slug) on update cascade,
  titulo      text,
  decisao     text not null check (decisao in ('publicado','descartado','reprovado_checagem')),
  motivo      text,
  materia_id  uuid references materias(id),
  criado_em   timestamptz not null default now()
);
create index pautas_por_fonte on pautas_processadas (fonte, criado_em desc);

-- Único caminho para escrever no site: o admin libera o Gmail ANTES do primeiro login.
-- Não existe pedido de acesso: quem entra sem estar aqui é leitor, e ponto.
create table acessos_autorizados (
  email           text primary key check (email = lower(email)),
  role            papel not null,
  nome_assinatura text,                  -- opcional; se vazio, usa o nome da conta Google
  autorizado_por  uuid references auth.users(id),
  usado_em        timestamptz,           -- preenchido quando a pessoa entra pela 1ª vez
  criado_em       timestamptz not null default now()
);

-- Admin da plataforma: a conta Google do projeto. No primeiro login com ela, já entra como admin.
insert into acessos_autorizados (email, role)
values ('blog.pulsocientifico@gmail.com', 'admin')
on conflict (email) do update set role = 'admin';

-- Ao entrar pela 1ª vez com Google: cria o perfil de leitor, aplica a autorização prévia (se
-- houver) e já monta o perfil de quem vai escrever. A função está inteira em "Comunidade".

-- Admin autoriza um Gmail (é o que a tela Painel → Acessos faz)
create or replace function autorizar_email(_email text, _role papel, _assinatura text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Só o admin libera acessos.'; end if;
  if _role = 'admin' then raise exception 'Papel admin não é liberado pela tela.'; end if;
  insert into acessos_autorizados (email, role, nome_assinatura, autorizado_por)
  values (lower(_email), _role, nullif(_assinatura,''), auth.uid())
  on conflict (email) do update
    set role = excluded.role, nome_assinatura = excluded.nome_assinatura, autorizado_por = auth.uid()
  where acessos_autorizados.usado_em is null;   -- quem já entrou muda pela tabela user_roles

  -- Se a pessoa já entrou no site como leitora, o papel vale na hora, já com o perfil de autor
  insert into user_roles (user_id, role)
  select l.user_id, _role from leitores l where l.email = lower(_email)
  on conflict do nothing;
  perform criar_perfil_autor(l.user_id, _role, _assinatura, l.foto_url)
     from leitores l where l.email = lower(_email);
  update acessos_autorizados set usado_em = now()
   where email = lower(_email) and usado_em is null
     and exists (select 1 from leitores where email = lower(_email));
end $$;

```

## Regras de acesso (RLS)

```sql
alter table user_roles enable row level security;
create policy "ver o proprio papel" on user_roles for select using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "admin gerencia papeis" on user_roles for all using (has_role(auth.uid(),'admin'));

alter table autores enable row level security;
create policy "perfis ativos sao publicos" on autores for select using (ativo or is_staff(auth.uid()));
-- O with check é obrigatório: sem ele, dá para salvar a linha em nome de outra conta
create policy "autor edita o proprio perfil" on autores for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff gerencia perfis" on autores for all using (is_staff(auth.uid()));

-- Quem escreve muda nome, bio, foto, CRM e links. Quem é (slug, tipo, dono da conta, ativo) só a
-- equipe muda: senão um autor se declararia médico, ou trocaria o dono do perfil.
create or replace function perfil_autor_protegido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) and auth.uid() is not null then
    new.user_id := old.user_id;
    new.slug    := old.slug;
    new.tipo    := old.tipo;
    new.ativo   := old.ativo;
  end if;
  return new;
end $$;
create trigger autores_protegido before update on autores
  for each row execute function perfil_autor_protegido();

alter table materias enable row level security;
-- publicada_em no futuro = publicação agendada: só aparece quando a hora chega
create policy "publico le publicadas" on materias for select using (status = 'publicada' and publicada_em <= now());
create policy "autor le as proprias" on materias for select
  using (autor_id in (select id from autores where user_id = auth.uid()));
create policy "autor cria as proprias" on materias for insert
  with check (autor_id in (select id from autores where user_id = auth.uid())
              and status in ('rascunho','em_revisao'));
create policy "autor edita as proprias nao publicadas" on materias for update
  using (autor_id in (select id from autores where user_id = auth.uid()) and status in ('rascunho','em_revisao'))
  with check (status in ('rascunho','em_revisao'));
create policy "staff faz tudo" on materias for all using (is_staff(auth.uid()));

alter table pautas_processadas enable row level security;
create policy "staff le" on pautas_processadas for select using (is_staff(auth.uid()));

alter table acessos_autorizados enable row level security;
create policy "admin gerencia autorizacoes" on acessos_autorizados for all using (has_role(auth.uid(),'admin'));

-- (a tabela solicitacoes_acesso deixou de existir: não há pedido de acesso, só autorização prévia)
```

## Comunidade: leitores, curtidas, salvos, seguidores e comentários

Qualquer pessoa entra com o Google e vira **leitor**: pode curtir, salvar, seguir e comentar.
Escrever no site continua sendo outra coisa — depende de papel em `user_roles`, liberado pelo admin.

```sql
-- Perfil de quem entra com Google (leitor, autor ou admin: todo mundo tem um)
create table leitores (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nome       text not null,
  foto_url   text,                      -- upload no bucket "perfis" ou a foto do Google
  bio        text check (char_length(bio) <= 320),
  bloqueado  boolean not null default false,   -- não comenta mais (decisão do admin)
  criado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Ao entrar pela 1ª vez: cria o perfil de leitor e aplica autorização prévia, se houver
create or replace function novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  previa     acessos_autorizados;
  assinatura text;
  endereco   text;
  n int := 1;
begin
  insert into leitores (user_id, email, nome, foto_url)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict do nothing;

  -- Papel só sai para conta Google com e-mail confirmado. Sem isso, quem soubesse o e-mail de
  -- um autor já autorizado poderia se cadastrar por e-mail/senha e receber o papel dele.
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'google' or new.email_confirmed_at is null then
    return new;
  end if;

  select * into previa from acessos_autorizados where email = lower(new.email) and usado_em is null;
  if not found then
    return new;                                  -- sem autorização prévia: fica leitor
  end if;

  insert into user_roles (user_id, role) values (new.id, previa.role) on conflict do nothing;
  update acessos_autorizados set usado_em = now() where email = previa.email;

  -- Quem vai escrever já ganha o perfil público, com endereço único
  if previa.role in ('autor','autor_medico','editor','parceiro','parceiro_publicidade') then
    assinatura := coalesce(nullif(previa.nome_assinatura,''),
                           new.raw_user_meta_data->>'full_name',
                           split_part(new.email,'@',1));
    endereco := slugificar(assinatura);
    while exists (select 1 from autores where slug = endereco) loop
      n := n + 1;
      endereco := slugificar(assinatura) || '-' || n;
    end loop;
    insert into autores (user_id, slug, nome, tipo, foto_url, ativo, crm_situacao)
    values (new.id, endereco, assinatura,
            case previa.role when 'autor_medico' then 'medico'
                             when 'parceiro' then 'organizacao'
                             when 'parceiro_publicidade' then 'publicidade' else 'jornalista' end,
            new.raw_user_meta_data->>'avatar_url',
            previa.role <> 'autor_medico',       -- médico só fica ativo depois de confirmar o CRM
            case when previa.role = 'autor_medico' then 'pendente' else 'nao_aplica' end);
  end if;
  return new;
end $$;

-- Agora que novo_usuario existe, liga o gatilho no cadastro de usuários do Supabase
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function novo_usuario();

create table curtidas (
  user_id    uuid references auth.users(id) on delete cascade,
  materia_id uuid references materias(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (user_id, materia_id)
);

create table salvos (
  user_id    uuid references auth.users(id) on delete cascade,
  materia_id uuid references materias(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (user_id, materia_id)
);

create table seguindo_autor (
  user_id   uuid references auth.users(id) on delete cascade,
  autor_id  uuid references autores(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, autor_id)
);

create table seguindo_categoria (
  user_id   uuid references auth.users(id) on delete cascade,
  categoria text references categorias(slug) on update cascade on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, categoria)
);

create table comentarios (
  id          uuid primary key default gen_random_uuid(),
  materia_id  uuid not null references materias(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  responde_a  uuid references comentarios(id) on delete cascade,   -- só um nível de resposta
  texto       text not null check (char_length(texto) between 2 and 1500),
  status      text not null default 'em_analise'
              check (status in ('em_analise','publicado','recusado')),
  denuncias   int not null default 0,
  criado_em   timestamptz not null default now(),
  editado_em  timestamptz
);
create index comentarios_da_materia on comentarios (materia_id, status, criado_em desc);

-- O que aparece num comentário: o perfil de autor tem prioridade, menos o da Redação (é coletivo)
-- A view roda com os poderes de quem a criou, então passa por cima do RLS de leitores: por isso
-- ela só devolve quem já aparece em público (comentou ou tem perfil de autor), nunca a base toda.
create view perfis_publicos as
select l.user_id,
       coalesce(case when a.tipo <> 'redacao' then a.nome end, l.nome)        as nome,
       coalesce(case when a.tipo <> 'redacao' then a.foto_url end, l.foto_url) as foto_url,
       case when a.tipo <> 'redacao' then a.slug end                          as autor_slug,
       is_staff(l.user_id)                                                    as equipe
  from leitores l
  left join autores a on a.user_id = l.user_id
 where a.id is not null
    or exists (select 1 from comentarios c where c.user_id = l.user_id and c.status = 'publicado');

create table denuncias_comentario (
  comentario_id uuid references comentarios(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  motivo        text,
  criado_em     timestamptz not null default now(),
  primary key (comentario_id, user_id)
);

-- Uma linha só, mexida no painel
create table comunidade_config (
  id                  int primary key default 1 check (id = 1),
  comentarios_ligados boolean not null default true,
  moderacao           text not null default 'previa' check (moderacao in ('previa','posterior')),
  palavras_bloqueadas text[] not null default '{}',
  atualizado_em       timestamptz not null default now()
);
insert into comunidade_config (id) values (1) on conflict do nothing;

-- Contadores na matéria (para ordenar por mais curtida sem varrer a tabela)
alter table materias add column curtidas_qtd int not null default 0;
alter table materias add column comentarios_qtd int not null default 0;

create or replace function contar_curtidas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update materias set curtidas_qtd = curtidas_qtd + (case when tg_op = 'INSERT' then 1 else -1 end)
   where id = coalesce(new.materia_id, old.materia_id);
  return null;
end $$;
create trigger curtidas_contador after insert or delete on curtidas
  for each row execute function contar_curtidas();

create or replace function contar_comentarios() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update materias m set comentarios_qtd = (
    select count(*) from comentarios c where c.materia_id = m.id and c.status = 'publicado')
   where m.id = coalesce(new.materia_id, old.materia_id);
  return null;
end $$;
create trigger comentarios_contador after insert or update or delete on comentarios
  for each row execute function contar_comentarios();

-- Entrada do comentário: decide se vai ao ar na hora ou fica em análise, e segura enxurrada
create or replace function ao_comentar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cfg comunidade_config;
  recentes int;
begin
  select * into cfg from comunidade_config where id = 1;
  if not cfg.comentarios_ligados then raise exception 'Os comentários estão desligados.'; end if;
  if exists (select 1 from leitores where user_id = new.user_id and bloqueado) then
    raise exception 'Esta conta está impedida de comentar.';
  end if;
  select count(*) into recentes from comentarios
   where user_id = new.user_id and criado_em > now() - interval '10 minutes';
  if recentes >= 5 then raise exception 'Muitos comentários seguidos. Tente de novo em alguns minutos.'; end if;

  if is_staff(new.user_id) then
    new.status := 'publicado';
  elsif cfg.moderacao = 'posterior'
    and not exists (select 1 from unnest(cfg.palavras_bloqueadas) p where new.texto ilike '%'||p||'%') then
    new.status := 'publicado';
  else
    new.status := 'em_analise';
  end if;
  return new;
end $$;
create trigger comentarios_entrada before insert on comentarios
  for each row execute function ao_comentar();

-- Edição: quem escreveu muda o texto; status, denúncias e autoria só a equipe mexe
create or replace function comentario_so_texto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then
    new.status := old.status; new.denuncias := old.denuncias;
    new.user_id := old.user_id; new.materia_id := old.materia_id;
    new.editado_em := now();
  end if;
  return new;
end $$;
create trigger comentarios_edicao before update on comentarios
  for each row execute function comentario_so_texto();

-- Denunciar: qualquer pessoa logada, uma vez por comentário
create or replace function denunciar_comentario(_id uuid, _motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entre para denunciar.'; end if;
  insert into denuncias_comentario (comentario_id, user_id, motivo) values (_id, auth.uid(), _motivo)
  on conflict do nothing;
  update comentarios set denuncias = (select count(*) from denuncias_comentario where comentario_id = _id)
   where id = _id;
end $$;
```

### Regras de acesso da comunidade

```sql
alter table leitores enable row level security;
create policy "leitor le o proprio perfil" on leitores for select using (user_id = auth.uid() or is_staff(auth.uid()));
create policy "leitor edita o proprio perfil" on leitores for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update (bloqueado) on leitores from authenticated;   -- ninguém se desbloqueia
create policy "leitor apaga a propria conta" on leitores for delete using (user_id = auth.uid());
create policy "staff gerencia leitores" on leitores for all using (is_staff(auth.uid()));
-- O nome e a foto que aparecem no comentário saem da view perfis_publicos:
grant select on perfis_publicos to anon, authenticated;

alter table curtidas enable row level security;
create policy "ver curtidas" on curtidas for select using (true);
create policy "curtir em nome proprio" on curtidas for insert with check (user_id = auth.uid());
create policy "descurtir o proprio" on curtidas for delete using (user_id = auth.uid());

alter table salvos enable row level security;
create policy "so o dono ve os salvos" on salvos for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table seguindo_autor enable row level security;
create policy "ver quem segue" on seguindo_autor for select using (true);
create policy "seguir em nome proprio" on seguindo_autor for insert with check (user_id = auth.uid());
create policy "deixar de seguir" on seguindo_autor for delete using (user_id = auth.uid());

alter table seguindo_categoria enable row level security;
create policy "ver quem segue categoria" on seguindo_categoria for select using (true);
create policy "seguir categoria" on seguindo_categoria for insert with check (user_id = auth.uid());
create policy "deixar categoria" on seguindo_categoria for delete using (user_id = auth.uid());

alter table comentarios enable row level security;
create policy "publico le os publicados" on comentarios for select using (status = 'publicado');
create policy "cada um ve os proprios" on comentarios for select using (user_id = auth.uid() or is_staff(auth.uid()));
create policy "comentar em nome proprio" on comentarios for insert with check (user_id = auth.uid());
create policy "editar o proprio por 15 min" on comentarios for update
  using (user_id = auth.uid() and criado_em > now() - interval '15 minutes')
  with check (user_id = auth.uid());   -- o gatilho comentarios_edicao protege status e denúncias
create policy "apagar o proprio" on comentarios for delete using (user_id = auth.uid());
create policy "staff modera" on comentarios for all using (is_staff(auth.uid()));

alter table denuncias_comentario enable row level security;
create policy "denunciar logado" on denuncias_comentario for insert with check (user_id = auth.uid());
create policy "staff le denuncias" on denuncias_comentario for select using (is_staff(auth.uid()));

alter table comunidade_config enable row level security;
create policy "todos leem a config" on comunidade_config for select using (true);
create policy "admin muda a config" on comunidade_config for all using (has_role(auth.uid(),'admin'));
-- O filtro de palavras não é público (um spammer leria a lista para desviar dela).
-- Por causa disso, o site precisa pedir as colunas pelo nome: select * aqui dá erro de permissão.
revoke select (palavras_bloqueadas) on comunidade_config from anon, authenticated;
```

### Bucket das fotos de perfil

`perfis` (público, leitura livre). O arquivo é sempre `<user_id>.jpg`, quadrado de 256×256,
recortado no navegador antes de subir. Quem não envia foto fica com a do Google (o link vem do
login) ou com as iniciais.

**Os buckets também precisam de regra.** Sem isso, qualquer pessoa logada pode trocar a capa de
uma matéria ou a foto de outro leitor:

```sql
-- Leitura pública em todos os buckets do site
create policy "ver arquivos do site" on storage.objects for select
  using (bucket_id in ('capas','capas-reserva','anuncios','autores','perfis'));

-- Cada leitor mexe só no arquivo com o próprio id
create policy "propria foto: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'perfis' and name = auth.uid()::text || '.jpg');
create policy "propria foto: trocar" on storage.objects for update to authenticated
  using (bucket_id = 'perfis' and name = auth.uid()::text || '.jpg')
  with check (bucket_id = 'perfis' and name = auth.uid()::text || '.jpg');
create policy "propria foto: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'perfis' and name = auth.uid()::text || '.jpg');

-- Capas, banners e fotos de autor: só a equipe (e as funções, que usam service role)
create policy "equipe manda arquivo" on storage.objects for insert to authenticated
  with check (bucket_id in ('capas','capas-reserva','anuncios','autores') and is_staff(auth.uid()));
create policy "equipe troca arquivo" on storage.objects for update to authenticated
  using (bucket_id in ('capas','capas-reserva','anuncios','autores') and is_staff(auth.uid()));
create policy "equipe apaga arquivo" on storage.objects for delete to authenticated
  using (bucket_id in ('capas','capas-reserva','anuncios','autores') and is_staff(auth.uid()));
```

Se o Lovable criar sozinho uma regra do tipo `for all using (true)` em `storage.objects`, apague:
ela deixa qualquer conta logada escrever em qualquer bucket.

## Autor médico e a confirmação de CRM

Quando o admin libera um Gmail como **autor médico**, o perfil nasce com `tipo = 'medico'`,
`ativo = false` e `crm_situacao = 'pendente'`. No primeiro login, antes de qualquer outra tela, a
pessoa cai em **Complete o seu cadastro** e preenche o que o papel exige — para o médico, isso
inclui **CRM e UF**. Enquanto o CRM não estiver confirmado, ela escreve rascunho, mas o banco
recusa `em_revisao` e `publicada` (gatilho `materias_assinatura`).

| `crm_situacao` | O que significa | O autor publica? |
|---|---|---|
| `nao_aplica` | não é médico | sim (fora de Saúde) |
| `pendente` | ainda não informou o CRM | não |
| `verificado` | o conselho confirmou número, UF e nome | sim |
| `divergente` | o registro existe, mas o nome não bate com o da conta | não, até o admin decidir |
| `nao_encontrado` | o conselho não achou o registro | não |
| `conferido_a_mao` | o admin conferiu no portal do CFM e liberou | sim |

### A tela "Complete o seu cadastro" (`/completar`)

No primeiro login, quem tem papel de escrever cai nesta tela antes do painel, com os campos do
seu papel. Ela grava tudo de uma vez, pela função abaixo — o cliente não escreve direto nessas
colunas, senão daria para pular campo ou se marcar como verificado.

| Campo | `autor` | `autor_medico` |
|---|---|---|
| Foto, nome de assinatura, minibiografia (≥ 80 caracteres), formação | obrigatório | obrigatório |
| Link profissional | opcional | opcional |
| CRM + UF | — | **obrigatório** |
| Especialidade | — | opcional, mas **exige RQE** se preenchida (CFM 2.336/2023) |
| Aceite das regras | obrigatório | obrigatório, com menção à Resolução CFM |

```sql
-- Completa o cadastro do próprio perfil. Valida o que o papel exige e deixa o CRM em conferência.
create or replace function completar_cadastro(
  _nome text, _bio text, _formacao text, _links jsonb, _declara boolean,
  _crm text default null, _uf char(2) default null,
  _especialidade text default null, _rqe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  perfil autores;
  medico boolean := has_role(auth.uid(),'autor_medico');
begin
  select * into perfil from autores where user_id = auth.uid();
  if not found then raise exception 'Você não tem perfil de autor.'; end if;
  if not _declara then raise exception 'É preciso aceitar as regras para concluir.'; end if;
  if char_length(trim(_nome)) < 5  then raise exception 'Escreva o nome de assinatura completo.'; end if;
  if char_length(trim(_bio))  < 80 then raise exception 'A minibiografia precisa de pelo menos 80 caracteres.'; end if;

  if medico then
    if coalesce(_crm,'') !~ '^[0-9]{4,7}$' then raise exception 'CRM deve ter de 4 a 7 números.'; end if;
    if _uf is null or _uf !~ '^[A-Z]{2}$'  then raise exception 'Informe a UF do CRM.'; end if;
    if _especialidade is not null and coalesce(_rqe,'') = '' then
      raise exception 'Especialidade exige o RQE (Resolução CFM 2.336/2023).';
    end if;
  end if;

  update autores set
    nome = trim(_nome), bio = trim(_bio), formacao = nullif(trim(_formacao),''),
    links = coalesce(_links,'{}'::jsonb) - (select coalesce(array_agg(k),'{}')
              from jsonb_object_keys(coalesce(_links,'{}'::jsonb)) k
             where k not in ('site','instagram','youtube','tiktok','doctoralia','email')),
    especialidade = case when medico then nullif(trim(_especialidade),'') else especialidade end,
    rqe           = case when medico then nullif(trim(_rqe),'')           else rqe end,
    crm           = case when medico then _crm else crm end,
    crm_uf        = case when medico then _uf  else crm_uf end,
    -- CRM novo ou trocado volta para a fila de conferência
    crm_situacao  = case when not medico then crm_situacao
                         when crm is distinct from _crm or crm_uf is distinct from _uf then 'pendente'
                         else crm_situacao end,
    crm_verificado_em = case when medico and (crm is distinct from _crm or crm_uf is distinct from _uf)
                             then null else crm_verificado_em end,
    -- médico só fica ativo com o CRM confirmado; quem já foi confirmado e não trocou o número continua no ar
    ativo = not medico or (crm is not distinct from _crm and crm_uf is not distinct from _uf
                           and crm_situacao in ('verificado','conferido_a_mao')),
    declarou_em = now(),
    cadastro_completo_em = now()
  where id = perfil.id;
end $$;

-- Só a equipe (e a função verificar-crm, que usa service role) mexe na situação do CRM
revoke update (crm, crm_uf, crm_situacao, crm_verificado_em, crm_nome_conselho, cadastro_completo_em)
  on autores from authenticated;
```

Depois do cadastro, tudo isso continua editável em **Minha conta** — menos CRM e UF, que só o
admin troca (e a troca manda o registro de volta para conferência).

### A função `verificar-crm`

`POST /functions/v1/verificar-crm` com o JWT de quem está logado e `{ "crm": "123456", "uf": "SP" }`.
Ela grava o CRM, consulta o provedor configurado e devolve a situação. Configuração por segredo:

| Segredo | Valor |
|---|---|
| `CRM_PROVEDOR` | `nenhum` (padrão), `infosimples` ou `cfm` |
| `CRM_API_CHAVE` | token do provedor, quando houver |

Sem provedor (`nenhum`), o CRM fica `pendente` e aparece na tela de Acessos como **"a conferir"**:
o admin abre o portal do CFM, confere e libera com um clique (`conferido_a_mao`). Com provedor
configurado, a função compara o nome devolvido pelo conselho com o nome do autor (sem acento, sem
"Dr."/"Dra.") e grava `verificado` ou `divergente`.

### Onde dá para consultar CRM de verdade

| Caminho | Como é | Custo |
|---|---|---|
| **Webservice oficial do CFM** ("Lista de Médicos", Resolução CFM 2.129/15) | consulta por CRM + UF, devolve nome, situação da inscrição e especialidade; cadastro pelo SEI-Medicina e chave de acesso | **R$ 948/ano** para empresa privada; gratuito para órgão público; pagamento por depósito |
| **Revendas (Infosimples, consultacrm.com.br e afins)** | REST/JSON, integra em minutos, consulta por CRM+UF ou nome | pago por consulta, com teste grátis |
| **Portal "Busca por médicos" do CFM** | tela pública, para conferir na mão | grátis |
| **CNES / dados abertos do SUS** | serve para estabelecimento e vínculo, não para validar registro | grátis |

Para o volume do Pulso Científico — alguns médicos por ano, todos liberados um a um pelo admin —
a conferência manual resolve, e o campo fica pronto para plugar a API quando fizer sentido. Raspar
o portal do CFM não entra: além de frágil, vai contra os termos do serviço.

**Um limite honesto:** qualquer uma dessas consultas responde "este CRM existe e está ativo, e o
nome é este". Nenhuma prova que quem digitou é o dono do registro. Por isso a comparação de nome
com a conta Google e, principalmente, o fato de o admin liberar cada e-mail antes.

## Perfis de empresa: dois tipos

Empresa que publica no site entra pelo mesmo caminho dos autores — o admin libera o e-mail e, no
primeiro login, ela completa o cadastro. O perfil é o mesmo `autores`, só que com dois tipos bem
diferentes:

| | **Organização parceira** (`parceiro` → `tipo = 'organizacao'`) | **Empresa de publicidade** (`parceiro_publicidade` → `tipo = 'publicidade'`) |
|---|---|---|
| Quem é | blog, grupo de pesquisa, instituto, veículo | agência, anunciante, marca |
| O que publica | conteúdo editorial próprio, sem contrapartida comercial | conteúdo comercial |
| Como a matéria aparece | etiqueta **Parceria editorial** + aviso "produzido por X, organização parceira, sem contrapartida comercial" | etiqueta **Publicidade** + aviso "conteúdo comercial, a redação não participou" |
| Saúde | não | não |

Em qualquer um dos dois, os campos são os do autor com outro nome:

| Campo do autor | Na empresa |
|---|---|
| foto | logo (quadrado) |
| nome de assinatura | nome da empresa |
| formação | ramo de atuação |
| minibiografia | descrição |
| redes | as mesmas: site, Instagram, YouTube, TikTok, Doctoralia, e-mail |

- Página pública em `/autor/<slug>` com o rótulo do tipo, e listagem em `/parceiros` (link no
  rodapé), separada em dois grupos.
- **A marcação é automática**, vem do `tipo` do perfil: ninguém precisa lembrar de marcar. Conteúdo
  comercial sem identificação é problema com o leitor, com o Google e com o CONAR.
- Nenhum dos dois escreve em Saúde (mesma regra do autor não médico).
- Se a empresa de publicidade for da área de saúde (clínica, laboratório), o texto ainda precisa
  respeitar as normas do conselho do profissional responsável — e continua sendo publicidade.

## Candidaturas: quem quer escrever no site

A página `/parceria` ("Escreva com a gente") é pública e aberta a quem não tem conta. Ela **não
cria papel nem conta**: grava uma linha aqui, e quem libera continua sendo o admin, na tela de
Acessos (que já traz o e-mail e o papel preenchidos ao aprovar).

```sql
create table candidaturas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,   -- preenchido se já era leitor
  nome         text not null check (char_length(nome) between 3 and 70),
  email        text not null check (email = lower(email)),
  perfil       text not null check (perfil in ('autor','autor_medico','organizacao','publicidade')),
  areas        text[] not null default '{}',
  sobre        text not null check (char_length(sobre) between 80 and 1200),
  link         text,
  crm          text,
  crm_uf       char(2),
  status       text not null default 'nova' check (status in ('nova','lida','aprovada','recusada')),
  decidido_por uuid references auth.users(id),
  decidido_em  timestamptz,
  criado_em    timestamptz not null default now()
);
create index candidaturas_abertas on candidaturas (status, criado_em desc);

-- Trava de enxurrada: uma candidatura aberta por e-mail, e no máximo 3 por e-mail a cada 30 dias
create or replace function ao_candidatar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(trim(new.email));
  if exists (select 1 from candidaturas where email = new.email and status in ('nova','lida')) then
    raise exception 'Já existe uma candidatura sua esperando resposta.';
  end if;
  if (select count(*) from candidaturas
       where email = new.email and criado_em > now() - interval '30 days') >= 3 then
    raise exception 'Muitas candidaturas com este e-mail neste mês.';
  end if;
  if new.perfil = 'autor_medico' and (new.crm is null or new.crm_uf is null) then
    raise exception 'Para autor médico, informe CRM e UF.';
  end if;
  new.user_id := auth.uid();      -- se estiver logada, fica ligada à conta
  return new;
end $$;
create trigger candidaturas_entrada before insert on candidaturas
  for each row execute function ao_candidatar();

alter table candidaturas enable row level security;
create policy "qualquer pessoa se candidata" on candidaturas for insert with check (true);
create policy "ver a propria candidatura" on candidaturas for select
  using (user_id = auth.uid() or is_staff(auth.uid()));
create policy "staff decide" on candidaturas for all using (is_staff(auth.uid()));
```

O formulário também tem um campo-armadilha (invisível): se vier preenchido, o site descarta antes
de chamar o banco. É o suficiente para robô de formulário; se um dia virar problema de verdade,
o passo seguinte é exigir login com Google para se candidatar.

## Funções do painel (usadas pelo site React)

O painel nunca escreve direto nas colunas protegidas (papel, CRM, bloqueio): passa por estas
funções, que conferem quem está pedindo. Todas são `security definer` e começam checando o papel.

```sql
-- Cria o perfil público de quem vai escrever, se ainda não existir (endereço único a partir do nome)
create or replace function criar_perfil_autor(_user uuid, _role papel, _assinatura text default null, _foto text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  nome_base text;
  endereco  text;
  n int := 1;
begin
  if _role not in ('autor','autor_medico','editor','parceiro','parceiro_publicidade') then return; end if;
  if exists (select 1 from autores where user_id = _user) then return; end if;
  select coalesce(nullif(_assinatura,''), l.nome, split_part(l.email,'@',1)) into nome_base
    from leitores l where l.user_id = _user;
  nome_base := coalesce(nome_base, 'Autor');
  endereco := slugificar(nome_base);
  while exists (select 1 from autores where slug = endereco) loop
    n := n + 1;
    endereco := slugificar(nome_base) || '-' || n;
  end loop;
  insert into autores (user_id, slug, nome, tipo, foto_url, ativo, crm_situacao)
  values (_user, endereco, nome_base,
          case _role when 'autor_medico' then 'medico' when 'parceiro' then 'organizacao'
                     when 'parceiro_publicidade' then 'publicidade' else 'jornalista' end,
          _foto, _role <> 'autor_medico',
          case when _role = 'autor_medico' then 'pendente' else 'nao_aplica' end);
end $$;
revoke execute on function criar_perfil_autor(uuid, papel, text, text) from public, anon, authenticated;

-- Tabela "Quem tem acesso": papéis, perfis e o último login, numa consulta só
create or replace function lista_acessos()
returns table (user_id uuid, email text, nome text, papel papel, autor_id uuid, autor_slug text,
               crm text, crm_uf char(2), crm_situacao text, cadastro_completo boolean, ultimo_acesso timestamptz)
language sql stable security definer set search_path = public as $$
  select r.user_id, l.email, coalesce(a.nome, l.nome), r.role, a.id, a.slug,
         a.crm, a.crm_uf, coalesce(a.crm_situacao, 'nao_aplica'), a.cadastro_completo_em is not null,
         u.last_sign_in_at
    from user_roles r
    join leitores l on l.user_id = r.user_id
    left join autores a on a.user_id = r.user_id
    left join auth.users u on u.id = r.user_id
   where has_role(auth.uid(),'admin')
  union all
  select null, x.email, x.nome_assinatura, x.role, null, null, null, null, 'nao_aplica', false, null
    from acessos_autorizados x
   where has_role(auth.uid(),'admin') and x.usado_em is null
$$;

-- Trocar o papel de quem já entrou (o admin não se rebaixa pela tela)
create or replace function definir_papel(_user uuid, _role papel)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Só o admin muda papéis.'; end if;
  if _role = 'admin' or has_role(_user,'admin') then raise exception 'O papel de admin não muda pela tela.'; end if;
  delete from user_roles where user_id = _user;
  insert into user_roles (user_id, role) values (_user, _role);
  perform criar_perfil_autor(_user, _role, null, (select foto_url from leitores where user_id = _user));
  update autores set
    tipo = case _role when 'autor_medico' then 'medico' when 'parceiro' then 'organizacao'
                      when 'parceiro_publicidade' then 'publicidade'
                      else case when tipo in ('medico','organizacao','publicidade') then 'jornalista' else tipo end end,
    crm_situacao = case when _role = 'autor_medico'
                        then case when crm_situacao in ('verificado','conferido_a_mao') then crm_situacao else 'pendente' end
                        else 'nao_aplica' end,
    ativo = _role <> 'autor_medico' or crm_situacao in ('verificado','conferido_a_mao')
  where user_id = _user;
end $$;

-- Remover acesso: volta a ser leitor. As matérias continuam no site com a assinatura dela.
create or replace function remover_acesso(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Só o admin remove acessos.'; end if;
  if has_role(_user,'admin') then raise exception 'O admin não é removido pela tela.'; end if;
  delete from user_roles where user_id = _user;
end $$;

-- Autorização que ainda não foi usada (a pessoa não entrou): o admin pode desfazer
create or replace function cancelar_autorizacao(_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'admin') then raise exception 'Só o admin cancela autorizações.'; end if;
  delete from acessos_autorizados where email = lower(_email) and usado_em is null and role <> 'admin';
end $$;

-- "Conferi no CFM, liberar": o admin confirma o CRM na mão
create or replace function liberar_crm(_autor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'Só a equipe libera CRM.'; end if;
  update autores set crm_situacao = 'conferido_a_mao', crm_verificado_em = now(), ativo = true
   where id = _autor and tipo = 'medico' and crm is not null and crm_uf is not null;
  if not found then raise exception 'Perfil sem CRM e UF preenchidos.'; end if;
end $$;

-- Bloquear leitor (o campo bloqueado não aceita update direto de ninguém)
create or replace function bloquear_leitor(_user uuid, _bloquear boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then raise exception 'Só a equipe bloqueia.'; end if;
  if is_staff(_user) then raise exception 'Não dá para bloquear alguém da equipe.'; end if;
  update leitores set bloqueado = _bloquear where user_id = _user;
end $$;

-- A lista de palavras que segura comentário não é pública; a equipe lê por aqui
create or replace function palavras_bloqueadas()
returns text[] language sql stable security definer set search_path = public as $$
  select palavras_bloqueadas from comunidade_config where id = 1 and is_staff(auth.uid())
$$;

-- Quem escreve sempre enxerga o próprio perfil, mesmo inativo (médico com CRM em conferência).
-- Sem isso, o painel não acha o perfil e as regras de "autor lê as próprias matérias" falham.
create policy "autor le o proprio perfil" on autores for select using (user_id = auth.uid());

-- Quem apagou a conta volta a ter perfil de leitor no próximo login
create policy "leitor cria o proprio perfil" on leitores for insert
  with check (user_id = auth.uid() and not bloqueado);

-- Capa e imagens do texto enviadas por quem escreve: só na pasta com o próprio id, no bucket capas
create policy "autor envia imagem na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from autores where user_id = auth.uid()));
create policy "autor troca imagem da propria pasta" on storage.objects for update to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "autor apaga imagem da propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);
```

## Busca, tags, leituras e novidades de quem segue

Recursos de portal de notícia que o site usa: busca sem acento, página por tag, contagem de
leituras para "Mais lidas" e a aba "Novidades" de quem segue autor ou categoria.

```sql
-- Leituras: contam uma vez por visita (o site guarda na sessão do navegador). Alimentam "Mais lidas".
-- Os gatilhos de conteúdo da matéria não disparam aqui, então a data de atualização não muda.
alter table materias add column leituras_qtd int not null default 0;
create index materias_no_ar on materias (status, publicada_em desc);

create or replace function registrar_leitura(_materia uuid) returns void
language sql security definer set search_path = public as $$
  update materias set leituras_qtd = leituras_qtd + 1
   where id = _materia and status = 'publicada' and publicada_em <= now()
$$;
grant execute on function registrar_leitura(uuid) to anon, authenticated;

-- Busca: todas as palavras precisam aparecer (título, linha fina, tags ou texto), sem acento.
-- Título pesa mais que linha fina e tags, que pesam mais que o corpo. Roda com o RLS de quem busca.
create or replace function buscar_materias(_q text, _limite int default 40)
returns table (id uuid, peso int)
language sql stable set search_path = public, extensions as $$
  with termos as (
    select array_agg(p) as ps
      from unnest(regexp_split_to_array(unaccent(lower(trim(coalesce(_q, '')))), '\s+')) p
     where char_length(p) >= 2
  ), base as (
    select m.id, m.publicada_em,
           unaccent(lower(m.titulo)) as ti,
           unaccent(lower(m.linha_fina || ' ' || coalesce(m.seo->>'tags', ''))) as li,
           unaccent(lower(regexp_replace(m.corpo_html, '<[^>]+>', ' ', 'g'))) as co
      from materias m
     where m.status = 'publicada' and m.publicada_em <= now()
  )
  select b.id,
         (select sum(case when b.ti like '%' || p || '%' then 5
                          when b.li like '%' || p || '%' then 3 else 1 end)::int
            from unnest(t.ps) p) as peso
    from base b, termos t
   where t.ps is not null
     and not exists (select 1 from unnest(t.ps) p
                      where (b.ti || ' ' || b.li || ' ' || b.co) not like '%' || p || '%')
   order by peso desc, b.publicada_em desc
   limit least(coalesce(_limite, 40), 100)
$$;
grant execute on function buscar_materias(text, int) to anon, authenticated;

-- Página de tag (/tag/<endereço>): a tag é comparada pelo mesmo endereço sem acento do site
create or replace function materias_da_tag(_tag text)
returns table (id uuid, tag text)
language sql stable set search_path = public, extensions as $$
  select m.id, t.valor
    from materias m, jsonb_array_elements_text(coalesce(m.seo->'tags', '[]'::jsonb)) t(valor)
   where m.status = 'publicada' and m.publicada_em <= now() and slugificar(t.valor) = _tag
   order by m.publicada_em desc
   limit 200
$$;
grant execute on function materias_da_tag(text) to anon, authenticated;

-- Novidades: matérias de quem a pessoa segue (autor ou categoria em qualquer nível).
-- O número no menu da conta conta o que saiu depois da última visita à aba.
alter table leitores add column novidades_vistas_em timestamptz not null default now();

create or replace function minhas_novidades(_limite int default 30)
returns table (id uuid, publicada_em timestamptz, motivo text)
language sql stable set search_path = public as $$
  select m.id, m.publicada_em,
         case when m.autor_id in (select autor_id from seguindo_autor where user_id = auth.uid())
              then 'autor' else 'categoria' end
    from materias m
   where auth.uid() is not null
     and m.status = 'publicada' and m.publicada_em <= now()
     and (m.autor_id in (select autor_id from seguindo_autor where user_id = auth.uid())
       or m.editoria in (select categoria from seguindo_categoria where user_id = auth.uid())
       or m.subcategoria in (select categoria from seguindo_categoria where user_id = auth.uid())
       or m.microcategoria in (select categoria from seguindo_categoria where user_id = auth.uid()))
   order by m.publicada_em desc
   limit least(coalesce(_limite, 30), 100)
$$;
grant execute on function minhas_novidades(int) to authenticated;
```

## Checklist de segurança (rodar depois de importar para o Lovable)

Quem entra com o Google vira **leitor** e nada mais. O papel de autor, editor ou admin vive só na
tabela `user_roles`, onde a única regra de escrita exige `has_role(auth.uid(),'admin')` — nem o
`liberar_acesso` entrega papel de admin. Leitor também não consegue criar linha em `autores`. Para
que isso continue verdade depois da importação:

1. **Só Google.** No painel de autenticação do Supabase/Lovable, desligue e-mail/senha, links
   mágicos e qualquer outro provedor. O gatilho `novo_usuario` já ignora quem não vem do Google com
   e-mail confirmado, mas provedor desligado é uma porta a menos.
2. **Confira as regras que o Lovable criar sozinho.** Ele costuma gerar políticas amplas
   (`for all using (true)`) em tabelas novas e em `storage.objects`. Apague e use as daqui.
3. **RLS ligada em toda tabela nova**, sem exceção: sem RLS, qualquer conta logada lê e escreve.
4. **A chave `service_role` e a `PULSO_ADMIN_KEY` nunca vão para o navegador.** Elas passam por
   cima de toda regra de acesso. Só edge function e o terminal daqui.
5. **`acessos_autorizados` é a única porta:** quem entra nessa lista ganha o papel no primeiro
   login (e o perfil de autor sai pronto). Só admin escreve nela — confira depois de importar.
6. Rode o **linter do Supabase** (Database → Advisors) e resolva o que ele apontar de RLS e de
   função sem `search_path`.
7. Depois de subir, teste com uma conta Google qualquer: tentar `insert` em `user_roles`,
   `autores` e `acessos_autorizados` pelo cliente tem que dar erro de permissão, e `update` em
   `autores` não pode mexer em `crm_situacao`.

## Função `publicar-materia` (usada só pelo agente)

- **Endereço:** `POST https://<projeto>.supabase.co/functions/v1/publicar-materia`
- **Cabeçalho obrigatório:** `x-agente-chave: <segredo AGENTE_CHAVE>`. Sem ele, responde 401.
- **Corpo:** o JSON que sai do `prompt-redacao.md`, mais `fonte`, `imagem_url` e `status`. Sempre `tipo = 'estudo'`.

O que ela faz:
1. Confere a chave.
2. Recusa se o `id_externo` da pauta já estiver em `pautas_processadas` (409).
3. Valida: `titulo` ≤ 65, `linha_fina` ≤ 160, pelo menos 1 tag, e limpa o `corpo_html` com a lista de tags e classes aceitas. O endereço é gerado pelo banco a partir do título.
4. Grava em `materias` com `autor_id` = autor "Redação Pulso" e `origem = 'agente'`.
5. Grava a pauta em `pautas_processadas`, com a decisão.
6. Responde `{ "id": "...", "url": "https://<dominio>/<editoria>/<slug>" }`.

Para registrar pautas descartadas: `{ "id_externo": "arxiv:2609.01234", "fonte": "arxiv-ia",
"decisao": "descartado", "motivo": "..." }`.

## Função `coletar-pauta` (usada pelo agente, todo dia)

`POST /functions/v1/coletar-pauta` com `x-agente-chave`. Varre as fontes ativas de
`banco/fontes.json` — PubMed (saúde), arXiv (IA, tecnologia, espaço), Europe PMC e Crossref
(natureza e clima) e o RSS da NASA (espaço) —, tira o que já está em `pautas_processadas`, dá nota
a cada candidata e devolve as melhores com os motivos. Detalhes, limites e licenças em
`FONTES.md`.

## Funções de capa

- `gerar-capa` (agente): Pexels → reserva aprovada. Sem IA.
- `fotos-capa` (painel): busca em Pexels, Pixabay e Unsplash e aplica a foto escolhida.
- `verificar-capas` (semanal): confere as capas do Unsplash, que ficam por link, e marca `imagem_quebrada`.

Detalhes e regras de cada fonte em `IMAGENS.md`. Buckets públicos: `capas` e `capas-reserva`.

```sql
-- Buscas de fotos guardadas por 24 h (o Pixabay exige; poupa cota das outras fontes)
create table cache_busca_fotos (
  fonte      text not null check (fonte in ('pexels','pixabay','unsplash')),
  termo      text not null,
  pagina     int  not null default 1,
  resposta   jsonb not null,
  criado_em  timestamptz not null default now(),
  primary key (fonte, termo, pagina)
);
alter table cache_busca_fotos enable row level security;   -- só as funções (service role) acessam

-- Limite diário por fonte (Unsplash: 10 buscas/dia no site todo; dia de Brasília)
create table uso_busca_fotos (
  fonte   text not null,
  dia     date not null,
  buscas  int  not null default 0,
  primary key (fonte, dia)
);
alter table uso_busca_fotos enable row level security;

-- Reserva 1 busca se ainda houver cota; devolve quantas foram usadas ou -1 se acabou (atômico)
create or replace function reservar_busca_foto(_fonte text, _limite int) returns int
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  n int;
begin
  insert into uso_busca_fotos (fonte, dia) values (_fonte, hoje) on conflict do nothing;
  update uso_busca_fotos set buscas = buscas + 1
   where fonte = _fonte and dia = hoje and buscas < _limite
   returning buscas into n;
  return coalesce(n, -1);
end $$;

create or replace function buscas_foto_hoje(_fonte text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select buscas from uso_busca_fotos
                    where fonte = _fonte and dia = (now() at time zone 'America/Sao_Paulo')::date), 0)
$$;

revoke execute on function reservar_busca_foto(text, int) from public, anon, authenticated;  -- só a função fotos-capa
```

## Função `buscar-estudo` (usada pelo painel)

`GET /functions/v1/buscar-estudo?id=<DOI ou PMID>` → consulta o PubMed e devolve título
original, revista, autores e data. É o botão "Buscar" do editor.

## Sitemap, robots e llms.txt

Função `sitemap` (GET, pública):

- `/functions/v1/sitemap` → **sitemap.xml** com matérias, categorias (nos 3 níveis), autores,
  páginas institucionais e a lista de parceiros. As matérias das **últimas 48 h** saem também no
  formato do Google News (`news:news`), que é o que coloca o site na aba Notícias.
- `/functions/v1/sitemap?tipo=robots` → **robots.txt**, bloqueando painel, conta e cadastro, e
  apontando para o sitemap e para o llms.txt.

Função `llms` (GET, pública): **llms.txt**, um resumo do site em texto puro para quem lê com IA —
o que o site é, como o conteúdo é produzido (inclusive a parte automatizada), as áreas, as páginas
que explicam o projeto, como citar e as matérias recentes. `?tipo=full` devolve a versão longa,
com 100 matérias. Não substitui o robots.txt: é explicação, não permissão.

Os endereços ficam nas próprias funções (`https://SEU_PROJETO.supabase.co/functions/v1/sitemap`, `…/llms`, `…/feed`). O `public/robots.txt` já aponta o sitemap para lá, e é esse endereço que vai no Google Search Console. **Não crie** rotas, arquivos estáticos nem redirecionamentos no site para `/sitemap.xml` ou `/llms.txt`: a hospedagem do Lovable não repassa caminhos para funções. Se um dia quiser esses endereços no domínio, isso se faz no Cloudflare, fora do código.

## Páginas do site (rotas)

| Rota | Lê do banco |
|---|---|
| `/` | últimas matérias publicadas |
| `/:categoria`, `/:categoria/:sub`, `/:categoria/:sub/:micro` | matérias daquele nível, com botões para os níveis de dentro |
| `/:editoria/:slug` | uma matéria + autor |
| `/autor/:slug` | perfil + matérias publicadas do autor |
| `/sobre`, `/politica-editorial`, `/politica-de-privacidade`, `/termos-de-uso`, `/cookies` | uma linha da tabela `paginas` |
| `/entrar` | botão "Entrar com Google"; sem papel → tela "Aguardando liberação" |
| `/painel` | matérias do usuário; staff vê todas + fila de revisão |
| `/painel/nova` e `/painel/materia/:id` | editor |
| `/painel/acessos` | só admin: liberar Gmail com papel, conferir CRM de autor médico, mudar papel, remover acesso |
| `/completar` | primeiro login de quem escreve: cadastro conforme o papel (médico informa CRM e UF) |
| `/parceiros` | organizações parceiras e empresas de publicidade, em grupos separados |
| `/painel/comentarios` | staff: fila de moderação, denúncias, bloquear leitor e configuração da comunidade |
| `/conta` | perfil do leitor (foto, nome, bio), salvos, seguindo e comentários |
