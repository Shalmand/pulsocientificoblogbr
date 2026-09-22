# Auditoria — quem fez o quê no site

Painel → **Auditoria** (só o admin vê). Mostra, com dia e hora:

- **Entradas** de quem tem papel (admin, editor, autor, parceiro). Leitor comum não aparece.
- **Matérias**: criou, editou (e o que mudou), mandou para revisão, publicou, agendou (e para
  quando), tirou do ar, arquivou, apagou.
- **Acessos**: liberou um Gmail, mudou ou cancelou a liberação, deu ou tirou papel, primeiro
  acesso de alguém liberado.

Quem registra é o próprio banco, por gatilhos. Então vale para tudo: painel, agente, qualquer
caminho. Ninguém consegue fazer uma dessas ações sem deixar rastro, nem apagar o rastro: a tabela
`admin_log` não tem regra de escrita para ninguém do site, só leitura para o admin.

O que a API de admin (terminal) faz ela mesma registra, com origem `admin-api`; por isso os
gatilhos ignoram escritas do servidor, menos a matéria que o agente cria.

```sql
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
```
