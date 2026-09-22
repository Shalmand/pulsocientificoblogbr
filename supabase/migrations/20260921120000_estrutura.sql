-- Pulso Científico — estrutura do banco (Lovable Cloud / Supabase)
-- Gerado por ferramentas/montar-schema.mjs em 2026-09-21. Não edite à mão:
-- o texto de verdade está em agente/banco-e-api.md, PUBLICIDADE.md, API-ADMIN.md e AUDITORIA.md.
--
-- Ordem das migrações: buckets (115900) → esta estrutura (120000) → conteúdo inicial (120100).
-- Não crie tabela, política ou gatilho por fora: tudo o que o site usa está aqui.
--
-- Tabelas: 23 · com RLS ligada: 23


-- ============================================================================
-- Estrutura, contas, comunidade e agente  (agente/banco-e-api.md)
-- ============================================================================

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

-- ============================================================================
-- Publicidade  (PUBLICIDADE.md)
-- ============================================================================

-- Configuração geral (uma linha só)
create table anuncios_config (
  id               int primary key default 1 check (id = 1),
  adsense_client   text check (adsense_client ~ '^ca-pub-\d{16}$'),
  adsense_situacao text not null default 'aguardando' check (adsense_situacao in ('aguardando','aprovada','pausada')),
  atualizado_em    timestamptz not null default now()
);
insert into anuncios_config default values;

create table espacos_anuncio (
  id               text primary key,               -- topo, entre, lateral, meio
  nome             text not null,
  largura          int, altura int,                -- desktop
  largura_mobile   int, altura_mobile int,
  modo             text not null default 'off' check (modo in ('adsense','interno','off')),
  html_anuncio     text,                           -- código colado, usado como está
  fallback_interno boolean not null default true,
  constraint adsense_tem_codigo check (modo <> 'adsense' or html_anuncio is not null)
);

create table campanhas_internas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  anunciante       text not null,
  link_url         text not null check (link_url ~ '^https://'),
  imagens          jsonb not null,   -- {"300x250": url, "728x90": url, "320x100": url}
  alt              text not null,
  espacos          text[] not null,  -- em quais espaços pode aparecer
  inicio           date,
  fim              date,
  peso             int not null default 1 check (peso between 1 and 10),  -- revezamento
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

-- Exibições e cliques dos anúncios internos (o AdSense tem relatório próprio)
create table eventos_anuncio (
  id           bigint generated always as identity primary key,
  campanha_id  uuid not null references campanhas_internas(id) on delete cascade,
  espaco       text not null references espacos_anuncio(id),
  tipo         text not null check (tipo in ('exibicao','clique')),
  criado_em    timestamptz not null default now()
);

-- Leitura pública só do necessário; escrita só admin
alter table anuncios_config enable row level security;
create policy "publico le config" on anuncios_config for select using (true);
create policy "admin edita config" on anuncios_config for all using (has_role(auth.uid(),'admin'));

alter table espacos_anuncio enable row level security;
create policy "publico le espacos" on espacos_anuncio for select using (true);
create policy "admin edita espacos" on espacos_anuncio for all using (has_role(auth.uid(),'admin'));

alter table campanhas_internas enable row level security;
create policy "publico le campanhas no ar" on campanhas_internas for select
  using (ativo and (inicio is null or inicio <= current_date) and (fim is null or fim >= current_date));
create policy "admin gerencia campanhas" on campanhas_internas for all using (has_role(auth.uid(),'admin'));

alter table eventos_anuncio enable row level security;
create policy "admin le eventos" on eventos_anuncio for select using (has_role(auth.uid(),'admin'));

-- Visitante registra evento só por esta função (não consegue ler nem apagar a tabela)
create or replace function registrar_evento_anuncio(_campanha uuid, _espaco text, _tipo text)
returns void language sql security definer set search_path = public as $$
  insert into eventos_anuncio (campanha_id, espaco, tipo)
  select _campanha, _espaco, _tipo
  where _tipo in ('exibicao','clique')
    and exists (select 1 from campanhas_internas where id = _campanha and ativo)
$$;
grant execute on function registrar_evento_anuncio to anon, authenticated;

-- Os quatro espaços do site. Começam no anúncio interno: sem campanha paga, aparece o anúncio
-- da casa ("Sua marca perto de quem lê ciência"). Troque para AdSense no painel quando aprovar.
insert into espacos_anuncio (id, nome, largura, altura, largura_mobile, altura_mobile, modo, fallback_interno) values
  ('topo',    'Topo da home',             728, 90,  320, 100, 'interno', true),
  ('entre',   'Entre seções da home',     728, 90,  320, 100, 'interno', true),
  ('lateral', 'Lateral (home e matéria)', 300, 250, 300, 250, 'interno', true),
  ('meio',    'Meio do texto da matéria', 336, 280, 300, 250, 'interno', true)
on conflict (id) do nothing;

-- Exibições e cliques por campanha, para a tabela do painel (só o admin lê eventos_anuncio)
create or replace function resumo_campanhas()
returns table (campanha_id uuid, exibicoes bigint, cliques bigint)
language sql stable security definer set search_path = public as $$
  select campanha_id,
         count(*) filter (where tipo = 'exibicao'),
         count(*) filter (where tipo = 'clique')
    from eventos_anuncio
   where has_role(auth.uid(),'admin')
   group by campanha_id
$$;

-- ============================================================================
-- Histórico da API de admin  (API-ADMIN.md)
-- ============================================================================

create table admin_log (
  id         bigint generated always as identity primary key,
  origem     text not null,              -- admin-api, painel, agente
  acao       text not null,              -- criar, atualizar, arquivar, apagar, publicar, enviar_arquivo...
  tabela     text not null,
  registros  jsonb not null default '[]'::jsonb,
  dados      jsonb,                      -- resumo do que mudou (textos longos cortados)
  criado_em  timestamptz not null default now()
);
alter table admin_log enable row level security;
create policy "admin le historico" on admin_log for select using (has_role(auth.uid(),'admin'));

-- ============================================================================
-- Auditoria (quem fez o quê)  (AUDITORIA.md)
-- ============================================================================

-- Quem fez: o usuário logado no momento da ação (nulo = servidor)
alter table admin_log add column if not exists ator uuid references auth.users(id) on delete set null;
create index if not exists admin_log_recentes on admin_log (criado_em desc);
create index if not exists admin_log_por_ator on admin_log (ator, criado_em desc);

-- Matérias: uma linha por ação, com o que mudou
create or replace function auditar_materia() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  quem  uuid := auth.uid();
  acao  text;
  mudou text[] := '{}';
begin
  if tg_op = 'DELETE' then
    if quem is null then return null; end if;
    insert into admin_log (origem, acao, tabela, registros, dados, ator)
    values ('painel', 'apagar', 'materias', jsonb_build_array(old.id),
            jsonb_build_object('titulo', old.titulo, 'status_antes', old.status), quem);
    return null;
  end if;
  -- escrita do servidor: só a matéria nova do agente entra aqui (a admin-api registra o resto)
  if quem is null and not (tg_op = 'INSERT' and new.origem = 'agente') then
    return null;
  end if;

  if tg_op = 'INSERT' then
    acao := case when new.status = 'publicada' and new.publicada_em > now() then 'agendar'
                 when new.status = 'publicada' then 'publicar'
                 when new.status = 'em_revisao' then 'enviar_revisao'
                 else 'criar' end;
  else
    if new.status is distinct from old.status then
      acao := case new.status
                when 'publicada'  then case when new.publicada_em > now() then 'agendar' else 'publicar' end
                when 'em_revisao' then 'enviar_revisao'
                when 'arquivada'  then 'arquivar'
                else case when old.status = 'publicada' then 'despublicar' else 'voltar_rascunho' end
              end;
    elsif new.status = 'publicada' and new.publicada_em is distinct from old.publicada_em then
      acao := case when new.publicada_em > now() then 'agendar' else 'publicar' end;
    end if;
    if new.titulo is distinct from old.titulo then mudou := mudou || 'título'::text; end if;
    if new.linha_fina is distinct from old.linha_fina then mudou := mudou || 'linha fina'::text; end if;
    if new.corpo_html is distinct from old.corpo_html then mudou := mudou || 'texto'::text; end if;
    if (new.editoria, new.subcategoria, new.microcategoria) is distinct from (old.editoria, old.subcategoria, old.microcategoria)
      then mudou := mudou || 'categoria'::text; end if;
    if (new.imagem_url, new.imagem_alt) is distinct from (old.imagem_url, old.imagem_alt) then mudou := mudou || 'capa'::text; end if;
    if new.seo is distinct from old.seo then mudou := mudou || 'palavra-chave e tags'::text; end if;
    if new.fonte is distinct from old.fonte then mudou := mudou || 'fonte'::text; end if;
    if new.nota_correcao is distinct from old.nota_correcao then mudou := mudou || 'nota de correção'::text; end if;
    if new.autor_id is distinct from old.autor_id then mudou := mudou || 'assinatura'::text; end if;
    if acao is null then
      if cardinality(mudou) = 0 then return null; end if;   -- salvou sem mudar nada
      acao := 'editar';
    end if;
  end if;

  insert into admin_log (origem, acao, tabela, registros, dados, ator)
  values (case when quem is null then 'agente' else 'painel' end, acao, 'materias', jsonb_build_array(new.id),
          jsonb_build_object('titulo', new.titulo, 'status', new.status, 'publicada_em', new.publicada_em,
                             'status_antes', case when tg_op = 'UPDATE' then old.status end,
                             'campos', to_jsonb(mudou)),
          quem);
  return null;
end $$;

-- Só as colunas de conteúdo e situação: curtidas, comentários e leituras não disparam
create trigger materias_auditoria
  after insert or delete or update of status, publicada_em, titulo, linha_fina, corpo_html, editoria,
    subcategoria, microcategoria, imagem_url, imagem_alt, seo, fonte, nota_correcao, autor_id
  on materias for each row execute function auditar_materia();

-- Entradas: o Supabase atualiza last_sign_in_at a cada login (renovar a sessão não conta)
create or replace function auditar_login() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.last_sign_in_at is not distinct from old.last_sign_in_at then return new; end if;
  if not exists (select 1 from user_roles where user_id = new.id) then return new; end if;  -- leitor não entra
  insert into admin_log (origem, acao, tabela, registros, dados, ator)
  values ('login', 'login', 'auth', jsonb_build_array(new.id),
          jsonb_build_object('email', new.email, 'provedor', new.raw_app_meta_data->>'provider'), new.id);
  return new;
exception when others then
  return new;   -- registrar nunca pode impedir ninguém de entrar
end $$;

create trigger ao_entrar after update of last_sign_in_at on auth.users
  for each row execute function auditar_login();

-- Acessos: liberar Gmail, mudar papel, cancelar, primeiro acesso
create or replace function auditar_acesso() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  quem  uuid := auth.uid();
  alvo  uuid;
  mail  text;
begin
  if tg_table_name = 'user_roles' then
    alvo := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    select u.email into mail from auth.users u where u.id = alvo;
    if quem is null and tg_op = 'INSERT' then
      -- papel entregue pelo cadastro automático: é o primeiro login de alguém liberado
      insert into admin_log (origem, acao, tabela, registros, dados, ator)
      values ('login', 'primeiro_acesso', 'user_roles', jsonb_build_array(alvo),
              jsonb_build_object('email', mail, 'papel', new.role::text), alvo);
    elsif quem is not null then
      insert into admin_log (origem, acao, tabela, registros, dados, ator)
      values ('painel',
              case tg_op when 'INSERT' then 'papel_dado' when 'DELETE' then 'papel_removido' else 'papel_trocado' end,
              'user_roles', jsonb_build_array(alvo),
              jsonb_build_object('email', mail,
                                 'papel', case when tg_op = 'DELETE' then old.role::text else new.role::text end,
                                 'papel_antes', case when tg_op = 'UPDATE' then old.role::text end),
              quem);
    end if;
    return null;
  end if;

  -- acessos_autorizados: só ações de alguém logado (o consumo no 1º login fica no primeiro_acesso)
  if quem is null then return null; end if;
  if tg_op = 'UPDATE' and new.role is not distinct from old.role then return null; end if;
  insert into admin_log (origem, acao, tabela, registros, dados, ator)
  values ('painel',
          case tg_op when 'INSERT' then 'acesso_liberado' when 'DELETE' then 'autorizacao_cancelada' else 'acesso_alterado' end,
          'acessos_autorizados', '[]'::jsonb,
          jsonb_build_object('email', case when tg_op = 'DELETE' then old.email else new.email end,
                             'papel', case when tg_op = 'DELETE' then old.role::text else new.role::text end,
                             'papel_antes', case when tg_op = 'UPDATE' then old.role::text end),
          quem);
  return null;
end $$;

create trigger user_roles_auditoria after insert or update or delete on user_roles
  for each row execute function auditar_acesso();
create trigger acessos_auditoria after insert or update or delete on acessos_autorizados
  for each row execute function auditar_acesso();

-- Leitura para a tela: só o admin; junta nome, e-mail e papel de quem fez
create or replace function auditoria(_tipo text default null, _dias int default 30, _ator uuid default null,
                                     _antes bigint default null, _limite int default 50)
returns table (id bigint, criado_em timestamptz, origem text, acao text, tabela text, registros jsonb, dados jsonb,
               ator uuid, ator_nome text, ator_email text, ator_papel text)
language sql stable security definer set search_path = public, extensions as $$
  select g.id, g.criado_em, g.origem, g.acao, g.tabela, g.registros, g.dados, g.ator,
         coalesce(a.nome, l.nome, u.email), coalesce(l.email, u.email),
         (select string_agg(r.role::text, ',' order by r.role) from user_roles r where r.user_id = g.ator)
    from admin_log g
    left join leitores l on l.user_id = g.ator
    left join autores a on a.user_id = g.ator and a.tipo <> 'redacao'
    left join auth.users u on u.id = g.ator
   where has_role(auth.uid(), 'admin')
     and g.criado_em > now() - make_interval(days => greatest(1, least(coalesce(_dias, 30), 365)))
     and (_ator is null or g.ator = _ator)
     and (_antes is null or g.id < _antes)
     and case _tipo
           when 'login'    then g.origem = 'login'
           when 'materias' then g.tabela = 'materias'
           when 'acessos'  then g.tabela in ('user_roles', 'acessos_autorizados')
           when 'outros'   then g.origem = 'admin-api' or g.tabela not in ('materias', 'auth', 'user_roles', 'acessos_autorizados')
           else true
         end
   order by g.id desc
   limit greatest(1, least(coalesce(_limite, 50), 200))
$$;
revoke all on function auditoria(text, int, uuid, bigint, int) from public, anon;
grant execute on function auditoria(text, int, uuid, bigint, int) to authenticated;

-- Números do topo da tela
create or replace function auditoria_resumo(_dias int default 7)
returns table (entradas bigint, pessoas bigint, criadas bigint, publicadas bigint, editadas bigint, agendadas_no_ar bigint)
language sql stable security definer set search_path = public, extensions as $$
  with j as (
    select * from admin_log
     where has_role(auth.uid(), 'admin')
       and criado_em > now() - make_interval(days => greatest(1, least(coalesce(_dias, 7), 365)))
  )
  select (select count(*) from j where acao = 'login'),
         (select count(distinct ator) from j where acao = 'login'),
         (select count(*) from j where tabela = 'materias' and acao in ('criar', 'enviar_revisao', 'publicar', 'agendar') and dados->>'status_antes' is null),
         (select count(*) from j where tabela = 'materias' and acao = 'publicar'),
         (select count(*) from j where tabela = 'materias' and acao = 'editar'),
         (select count(*) from materias where has_role(auth.uid(), 'admin') and status = 'publicada' and publicada_em > now())
$$;
revoke all on function auditoria_resumo(int) from public, anon;
grant execute on function auditoria_resumo(int) to authenticated;
