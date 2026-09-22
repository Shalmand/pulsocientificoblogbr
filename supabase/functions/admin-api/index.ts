// Função admin-api (Supabase Edge Function / Lovable Cloud)
//
// Porta de controle do banco para o Claude Code (via ferramentas/pulso.mjs).
// Não depende do painel do Lovable nem do dashboard do Supabase.
//
// Segurança:
//   - só aceita POST com o cabeçalho x-admin-chave igual ao segredo PULSO_ADMIN_KEY (mín. 40 caracteres);
//   - só mexe nas tabelas e ações da lista TABELAS abaixo (nada de SQL livre);
//   - apagar de verdade exige "confirmar": true; sem isso, arquiva/desativa;
//   - toda escrita fica registrada na tabela admin_log.
//
// Segredos (Lovable → Cloud → Secrets): PULSO_ADMIN_KEY
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type Acao =
  | "tabelas" | "listar" | "obter" | "contar" | "criar" | "atualizar" | "apagar"
  | "publicar" | "autorizar_acesso" | "listar_arquivos" | "enviar_arquivo" | "importar_imagem_url" | "apagar_arquivo"
  | "relatorio_anuncios";

type Op = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is";
type Filtro = string | number | boolean | null | { op: Op; valor: unknown };

type Pedido = {
  acao: Acao;
  tabela?: string;
  id?: string | number;
  filtros?: Record<string, Filtro>;
  dados?: Record<string, unknown> | Record<string, unknown>[];
  colunas?: string;
  ordem?: string;        // "criada_em.desc"
  limite?: number;       // padrão 50, máx 500
  pagina?: number;       // começa em 1
  confirmar?: boolean;
  // autorizar_acesso
  email?: string;
  papel?: "autor" | "autor_medico" | "parceiro" | "parceiro_publicidade" | "editor";
  assinatura?: string;   // nome de assinatura opcional ao autorizar
  // arquivos
  bucket?: string;
  caminho?: string;
  base64?: string;
  tipo_arquivo?: string;
  url?: string;          // importar_imagem_url
  de?: string;           // relatorio_anuncios (AAAA-MM-DD)
  ate?: string;
};

// Tabelas liberadas: chave primária, ações permitidas e como "apagar" sem confirmar
const TABELAS: Record<string, { chave: string; acoes: Acao[]; arquivar?: Record<string, unknown> }> = {
  materias:            { chave: "id",   acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar", "publicar"], arquivar: { status: "arquivada" } },
  autores:             { chave: "id",   acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"], arquivar: { ativo: false } },
  pautas_processadas:  { chave: "id_externo", acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"] },
  user_roles:          { chave: "user_id", acoes: ["listar", "contar", "criar", "apagar"] },
  acessos_autorizados: { chave: "email", acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"] },
  anuncios_config:     { chave: "id",   acoes: ["listar", "obter", "atualizar"] },
  espacos_anuncio:     { chave: "id",   acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"], arquivar: { modo: "off" } },
  campanhas_internas:  { chave: "id",   acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"], arquivar: { ativo: false } },
  eventos_anuncio:     { chave: "id",   acoes: ["listar", "contar"] },
  admin_log:           { chave: "id",   acoes: ["listar", "contar"] },
  paginas:             { chave: "slug", acoes: ["listar", "obter", "atualizar"] },
  categorias:          { chave: "slug", acoes: ["listar", "obter", "contar", "criar", "atualizar", "apagar"], arquivar: { ativa: false } },
  leitores:            { chave: "user_id", acoes: ["listar", "obter", "contar", "atualizar"] },   // bloquear/desbloquear
  candidaturas:        { chave: "id",   acoes: ["listar", "obter", "contar", "atualizar", "apagar"] },  // quem quer escrever
  comentarios:         { chave: "id",   acoes: ["listar", "obter", "contar", "atualizar", "apagar"] },  // moderar
  denuncias_comentario:{ chave: "comentario_id", acoes: ["listar", "contar"] },
  comunidade_config:   { chave: "id",   acoes: ["listar", "obter", "atualizar"] },
  curtidas:            { chave: "user_id", acoes: ["contar"] },
  salvos:              { chave: "user_id", acoes: ["contar"] },
  seguindo_autor:      { chave: "user_id", acoes: ["listar", "contar"] },
  seguindo_categoria:  { chave: "user_id", acoes: ["listar", "contar"] },
};

const BUCKETS = ["capas", "capas-reserva", "anuncios", "autores", "perfis"];
const OPS: Op[] = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is"];
const COLUNA = /^[a-z_][a-z0-9_]*$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);

  const segredo = Deno.env.get("PULSO_ADMIN_KEY") ?? "";
  if (segredo.length < 40) return json({ erro: "PULSO_ADMIN_KEY não configurada (mínimo 40 caracteres)." }, 500);
  if (!(await iguais(req.headers.get("x-admin-chave") ?? "", segredo))) return json({ erro: "Chave inválida." }, 401);

  let p: Pedido;
  try {
    p = await req.json();
  } catch {
    return json({ erro: "Corpo precisa ser JSON." }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    const resultado = await executar(db, p);
    return json({ ok: true, ...resultado });
  } catch (e) {
    const err = e as Error & { status?: number };
    return json({ ok: false, erro: err.message }, err.status ?? 400);
  }
});

async function executar(db: SupabaseClient, p: Pedido) {
  switch (p.acao) {
    case "tabelas":
      return { tabelas: Object.fromEntries(Object.entries(TABELAS).map(([t, c]) => [t, c.acoes])), buckets: BUCKETS };
    case "autorizar_acesso":
      return await autorizarAcesso(db, p);
    case "listar_arquivos":
    case "enviar_arquivo":
    case "importar_imagem_url":
    case "apagar_arquivo":
      return await arquivos(db, p);
    case "relatorio_anuncios":
      return await relatorioAnuncios(db, p);
  }

  const cfg = p.tabela ? TABELAS[p.tabela] : undefined;
  if (!cfg) throw erro(`Tabela não liberada. Use uma de: ${Object.keys(TABELAS).join(", ")}.`);
  if (!cfg.acoes.includes(p.acao)) throw erro(`Ação "${p.acao}" não permitida em ${p.tabela}.`);
  const tabela = p.tabela!;

  switch (p.acao) {
    case "listar": {
      const limite = Math.min(Math.max(p.limite ?? 50, 1), 500);
      const pagina = Math.max(p.pagina ?? 1, 1);
      let q = db.from(tabela).select(p.colunas ?? "*", { count: "exact" });
      q = aplicarFiltros(q, p.filtros);
      if (p.ordem) {
        const [col, dir] = p.ordem.split(".");
        if (!COLUNA.test(col)) throw erro("Coluna de ordem inválida.");
        q = q.order(col, { ascending: dir !== "desc" });
      }
      const de = (pagina - 1) * limite;
      const { data, count, error } = await q.range(de, de + limite - 1);
      if (error) throw erro(error.message);
      return { total: count, pagina, limite, registros: data };
    }
    case "obter": {
      exigirId(p);
      const { data, error } = await db.from(tabela).select(p.colunas ?? "*").eq(cfg.chave, p.id!).maybeSingle();
      if (error) throw erro(error.message);
      if (!data) throw erro("Registro não encontrado.", 404);
      return { registro: data };
    }
    case "contar": {
      const q = aplicarFiltros(db.from(tabela).select("*", { count: "exact", head: true }), p.filtros);
      const { count, error } = await q;
      if (error) throw erro(error.message);
      return { total: count };
    }
    case "criar": {
      if (!p.dados) throw erro("Informe dados.");
      const { data, error } = await db.from(tabela).insert(p.dados).select();
      if (error) throw erro(error.message);
      await registrar(db, "criar", tabela, data?.map((r: Record<string, unknown>) => r[cfg.chave]), p.dados);
      return { registros: data };
    }
    case "atualizar": {
      if (!p.dados || Array.isArray(p.dados)) throw erro("Informe dados como objeto.");
      if (p.id === undefined && !p.filtros) throw erro("Informe id ou filtros (atualizar a tabela inteira não é permitido).");
      let q = db.from(tabela).update(p.dados);
      q = p.id !== undefined ? q.eq(cfg.chave, p.id) : aplicarFiltros(q, p.filtros);
      const { data, error } = await q.select();
      if (error) throw erro(error.message);
      await registrar(db, "atualizar", tabela, data?.map((r: Record<string, unknown>) => r[cfg.chave]), p.dados);
      return { alterados: data?.length ?? 0, registros: data };
    }
    case "apagar": {
      if (p.id === undefined && !p.filtros) throw erro("Informe id ou filtros.");
      if (!p.confirmar && cfg.arquivar) {
        let q = db.from(tabela).update(cfg.arquivar);
        q = p.id !== undefined ? q.eq(cfg.chave, p.id) : aplicarFiltros(q, p.filtros);
        const { data, error } = await q.select(cfg.chave);
        if (error) throw erro(error.message);
        await registrar(db, "arquivar", tabela, data?.map((r: Record<string, unknown>) => r[cfg.chave]), cfg.arquivar);
        return { arquivados: data?.length ?? 0, aviso: "Arquivado, não apagado. Para apagar de vez, envie confirmar: true." };
      }
      if (!p.confirmar) throw erro("Apagar de vez exige confirmar: true.");
      let q = db.from(tabela).delete();
      q = p.id !== undefined ? q.eq(cfg.chave, p.id) : aplicarFiltros(q, p.filtros);
      const { data, error } = await q.select(cfg.chave);
      if (error) throw erro(error.message);
      await registrar(db, "apagar", tabela, data?.map((r: Record<string, unknown>) => r[cfg.chave]), null);
      return { apagados: data?.length ?? 0 };
    }
    case "publicar": {
      exigirId(p);
      const { data: atual, error: e1 } = await db.from("materias").select("publicada_em").eq("id", p.id!).maybeSingle();
      if (e1) throw erro(e1.message);
      if (!atual) throw erro("Matéria não encontrada.", 404);
      const dados = { status: "publicada", publicada_em: atual.publicada_em ?? new Date().toISOString(), atualizada_em: new Date().toISOString() };
      const { data, error } = await db.from("materias").update(dados).eq("id", p.id!).select("id, slug, editoria, status, publicada_em");
      if (error) throw erro(error.message);
      await registrar(db, "publicar", "materias", [p.id], dados);
      return { registro: data?.[0] };
    }
  }
  throw erro(`Ação desconhecida: ${p.acao}`);
}

// deno-lint-ignore no-explicit-any
function aplicarFiltros(q: any, filtros?: Record<string, Filtro>) {
  for (const [coluna, f] of Object.entries(filtros ?? {})) {
    if (!COLUNA.test(coluna)) throw erro(`Coluna inválida: ${coluna}`);
    if (f !== null && typeof f === "object") {
      if (!OPS.includes(f.op)) throw erro(`Operador inválido: ${f.op}`);
      q = f.op === "in" ? q.in(coluna, f.valor as unknown[]) : q[f.op](coluna, f.valor);
    } else {
      q = f === null ? q.is(coluna, null) : q.eq(coluna, f);
    }
  }
  return q;
}

async function autorizarAcesso(db: SupabaseClient, p: Pedido) {
  // Login é só com Google e não existe pedido de acesso: autorizar = deixar o e-mail liberado.
  // Se a pessoa já entrou como leitora, o papel vale na hora.
  if (!p.email) throw erro("Informe email.");
  const email = p.email.trim().toLowerCase();
  const role = p.papel ?? "autor";
  const PAPEIS = ["autor", "autor_medico", "parceiro", "parceiro_publicidade", "editor"];
  if (!PAPEIS.includes(role)) throw erro(`papel deve ser um de: ${PAPEIS.join(", ")}.`);

  const { error } = await db.from("acessos_autorizados")
    .upsert({ email, role, nome_assinatura: p.assinatura ?? null, usado_em: null }, { onConflict: "email" });
  if (error) throw erro(error.message);
  await registrar(db, "autorizar_email", "acessos_autorizados", [email], { role });

  const { data: leitor } = await db.from("leitores").select("user_id").eq("email", email).maybeSingle();
  if (leitor) {
    const { error: e2 } = await db.from("user_roles").upsert({ user_id: leitor.user_id, role }, { onConflict: "user_id,role" });
    if (e2) throw erro(e2.message);
    await registrar(db, "liberar_acesso", "user_roles", [leitor.user_id], { email, role });
    return { situacao: "liberado", email, papel: role, aviso: "Essa conta já existia como leitora; o papel vale no próximo carregamento." };
  }
  return { situacao: "autorizado_antes_do_login", email, papel: role, aviso: "Quando entrar com este Gmail, já cai no painel com o perfil criado." };
}

async function arquivos(db: SupabaseClient, p: Pedido) {
  if (!p.bucket || !BUCKETS.includes(p.bucket)) throw erro(`Bucket inválido. Use: ${BUCKETS.join(", ")}.`);
  const b = db.storage.from(p.bucket);
  if (p.acao === "listar_arquivos") {
    const { data, error } = await b.list(p.caminho ?? "", { limit: Math.min(p.limite ?? 100, 1000) });
    if (error) throw erro(error.message);
    return { arquivos: data };
  }
  if (!p.caminho || p.caminho.includes("..")) throw erro("Caminho inválido.");
  if (p.acao === "enviar_arquivo") {
    if (!p.base64 || !p.tipo_arquivo) throw erro("Informe base64 e tipo_arquivo.");
    const bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
    if (bytes.length > 8 * 1024 * 1024) throw erro("Arquivo maior que 8 MB.");
    const { error } = await b.upload(p.caminho, bytes, { contentType: p.tipo_arquivo, upsert: true });
    if (error) throw erro(error.message);
    await registrar(db, "enviar_arquivo", `storage:${p.bucket}`, [p.caminho], { bytes: bytes.length });
    return { url: b.getPublicUrl(p.caminho).data.publicUrl };
  }
  if (p.acao === "importar_imagem_url") {
    if (!p.url || !/^https:\/\//.test(p.url)) throw erro("Informe url começando com https://.");
    const resp = await fetch(p.url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) throw erro(`Não consegui baixar a imagem (HTTP ${resp.status}).`);
    const tipo = (resp.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(tipo)) throw erro(`O link não é uma imagem (tipo recebido: ${tipo || "desconhecido"}).`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw erro("Imagem maior que 8 MB.");
    const { error } = await b.upload(p.caminho, bytes, { contentType: tipo, upsert: true });
    if (error) throw erro(error.message);
    await registrar(db, "importar_imagem_url", `storage:${p.bucket}`, [p.caminho], { origem: p.url, bytes: bytes.length });
    return { url: b.getPublicUrl(p.caminho).data.publicUrl, tipo, bytes: bytes.length };
  }
  if (!p.confirmar) throw erro("Apagar arquivo exige confirmar: true.");
  const { error } = await b.remove([p.caminho]);
  if (error) throw erro(error.message);
  await registrar(db, "apagar_arquivo", `storage:${p.bucket}`, [p.caminho], null);
  return { apagado: p.caminho };
}

async function relatorioAnuncios(db: SupabaseClient, p: Pedido) {
  const de = p.de ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const ate = p.ate ?? new Date().toISOString().slice(0, 10);
  const { data: campanhas, error } = await db.from("campanhas_internas").select("id, nome, anunciante, espacos, inicio, fim, ativo");
  if (error) throw erro(error.message);
  const linhas = [];
  for (const c of campanhas ?? []) {
    const contar = async (tipo: string) => {
      const { count, error: e } = await db.from("eventos_anuncio").select("*", { count: "exact", head: true })
        .eq("campanha_id", c.id).eq("tipo", tipo).gte("criado_em", `${de}T00:00:00Z`).lte("criado_em", `${ate}T23:59:59Z`);
      if (e) throw erro(e.message);
      return count ?? 0;
    };
    const [exibicoes, cliques] = await Promise.all([contar("exibicao"), contar("clique")]);
    linhas.push({ ...c, exibicoes, cliques, ctr: exibicoes ? `${((cliques / exibicoes) * 100).toFixed(2)}%` : "—" });
  }
  return { periodo: { de, ate }, campanhas: linhas };
}

async function registrar(db: SupabaseClient, acao: string, tabela: string, ids: unknown[] | undefined, dados: unknown) {
  const resumo = dados === null ? null : JSON.parse(JSON.stringify(dados, (_k, v) =>
    typeof v === "string" && v.length > 300 ? `${v.slice(0, 300)}… (${v.length} caracteres)` : v));
  await db.from("admin_log").insert({ origem: "admin-api", acao, tabela, registros: ids ?? [], dados: resumo });
}

async function iguais(a: string, b: string) {
  // comparação em tempo constante (evita descobrir a chave medindo o tempo de resposta)
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}

function exigirId(p: Pedido) {
  if (p.id === undefined || p.id === null || p.id === "") throw erro("Informe id.");
}

function erro(msg: string, status = 400) {
  return Object.assign(new Error(msg), { status });
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
