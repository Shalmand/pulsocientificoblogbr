// publicar-materia — a única porta de entrada do agente. Não existe login por tela para ele.
//
// POST /functions/v1/publicar-materia
//   Cabeçalho: x-agente-chave: <AGENTE_CHAVE>
//   Corpo: o JSON do prompt-redacao.md + a pauta que deu origem:
//   {
//     "pauta": { "id_externo": "pmid:42640641", "fonte": "pubmed-jama", "tipo": "estudo" },
//     "titulo": "...", "linha_fina": "...", "editoria": "saude",
//     "subcategoria": "doencas", "microcategoria": "infecciosas",
//     "corpo_html": "<p>…</p>", "seo": { "palavra_chave": "...", "tags": ["..."] },
//     "fonte": { "revista": "...", "titulo_original": "...", "autores": "...", "data": "...",
//                "url": "...", "doi": "...", "pmid": "..." },
//     "imagem": { "url": "...", "alt": "...", "credito": {...} },
//     "status": "em_revisao",
//     "assinatura": "redacao-pulso"   ← opcional: qual perfil de redação assina
//   }
//
// Para registrar uma pauta descartada, sem escrever matéria:
//   { "pauta": {...}, "decisao": "descartado", "motivo": "..." }
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const TAGS = ["p","h2","h3","strong","b","em","i","u","a","ul","ol","li","blockquote","br","div","span","figure","figcaption","img","table","thead","tbody","tr","th","td"];
const CLASSES = ["texto-grande", "caixa-destaque", "numero-destaque", "img-materia", "video"];
const TROCA: Record<string, string> = { b: "strong", i: "em" };
const VETADAS = /(^|[^\p{L}])(cura|curar|milagre|milagroso|revolucionári[oa]|garantid[oa]|definitivo|o melhor|o mais eficaz|100% eficaz)($|[^\p{L}])/iu;
const DOMINIO = Deno.env.get("PULSO_DOMINIO") ?? "https://pulsocientifico.com.br";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  const chave = Deno.env.get("AGENTE_CHAVE") ?? "";
  if (chave.length < 40) return json({ erro: "AGENTE_CHAVE não configurada (mínimo 40 caracteres)." }, 500);
  if ((req.headers.get("x-agente-chave") ?? "") !== chave) return json({ erro: "Chave inválida." }, 401);

  let p: Record<string, any>;
  try { p = await req.json(); } catch { return json({ erro: "Corpo precisa ser JSON." }, 400); }

  const pauta = p.pauta ?? {};
  if (!pauta.id_externo || !pauta.fonte) return json({ erro: "Informe pauta.id_externo e pauta.fonte." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // a mesma pauta nunca vira duas matérias
  const { data: jaViu } = await db.from("pautas_processadas").select("decisao, materia_id")
    .eq("id_externo", pauta.id_externo).maybeSingle();
  if (jaViu) return json({ erro: `Pauta já processada (${jaViu.decisao}).`, materia_id: jaViu.materia_id }, 409);

  // caminho curto: só registrar que foi descartada
  if (p.decisao && p.decisao !== "publicado") {
    await db.from("pautas_processadas").insert({
      id_externo: pauta.id_externo, fonte: pauta.fonte, tipo: pauta.tipo ?? "estudo",
      editoria: p.editoria ?? null, titulo: p.titulo ?? pauta.titulo ?? null,
      decisao: p.decisao, motivo: p.motivo ?? null,
    });
    // Aparece no painel, no quadro "Agente de publicação"
    await db.from("admin_log").insert({
      origem: "agente", acao: "descartar", tabela: "pautas_processadas", registros: [],
      dados: { pauta: pauta.id_externo, fonte: pauta.fonte, titulo: p.titulo ?? pauta.titulo ?? null, decisao: p.decisao, motivo: p.motivo ?? null },
    });
    return json({ ok: true, registrado: p.decisao });
  }

  const erros = validar(p);
  if (erros.length) return json({ erro: "Matéria reprovada na entrada.", problemas: erros }, 422);

  // Assinatura: o perfil pedido no corpo, senão a redação marcada como padrão, senão a original.
  const pedido = typeof p.assinatura === "string" ? p.assinatura : null;
  const redacoes = () => db.from("autores").select("id, slug").eq("tipo", "redacao").eq("ativo", true);
  let { data: redacao } = pedido
    ? await redacoes().eq("slug", pedido).maybeSingle()
    : await redacoes().eq("agente_padrao", true).maybeSingle();
  if (!redacao) ({ data: redacao } = await redacoes().eq("slug", "redacao-pulso").maybeSingle());
  if (!redacao) return json({ erro: "Nenhum perfil de redação ativo no banco." }, 500);

  const status = ["rascunho", "em_revisao", "publicada"].includes(p.status) ? p.status : "em_revisao";
  const corpo = limparHtml(String(p.corpo_html));
  const palavras = corpo.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  const { data: materia, error } = await db.from("materias").insert({
    autor_id: redacao.id,
    tipo: "estudo",
    slug: "",                                  // o banco gera a partir do título
    editoria: p.editoria,
    subcategoria: p.subcategoria ?? null,
    microcategoria: p.microcategoria ?? null,
    titulo: p.titulo,
    linha_fina: p.linha_fina,
    corpo_html: corpo,
    seo: p.seo,
    imagem_url: p.imagem?.url ?? null,
    imagem_alt: p.imagem?.alt ?? null,
    imagem_credito: p.imagem?.credito ?? null,
    fonte: { tipo: pauta.tipo ?? "estudo", ...p.fonte },
    tempo_leitura: Math.max(1, Math.round(palavras / 200)),
    origem: "agente",
    status,
    publicada_em: status === "publicada" ? new Date().toISOString() : null,
  }).select("id, slug, editoria, status").single();

  if (error) return json({ erro: error.message }, 400);

  await db.from("pautas_processadas").insert({
    id_externo: pauta.id_externo, fonte: pauta.fonte, tipo: pauta.tipo ?? "estudo",
    editoria: p.editoria, titulo: p.fonte?.titulo_original ?? p.titulo,
    decisao: "publicado", materia_id: materia.id,
  });
  // O registro na auditoria (admin_log) é feito pelo gatilho materias_auditoria do banco.

  return json({ ok: true, id: materia.id, status: materia.status, url: `${DOMINIO}/${materia.editoria}/${materia.slug}` });
});

// ---------------------------------------------------------------- validação
// As mesmas regras de ferramentas/banco-fixo.mjs e do editor: o agente não é exceção.
function validar(p: Record<string, any>): string[] {
  const e: string[] = [];
  const texto = [p.titulo, p.linha_fina, p.corpo_html].filter(Boolean).join(" ");
  if (!p.titulo || p.titulo.length > 65) e.push("título vazio ou com mais de 65 caracteres");
  if (!p.linha_fina || p.linha_fina.length > 160) e.push("linha fina vazia ou com mais de 160 caracteres");
  if (!p.editoria) e.push("sem editoria");
  if (!p.corpo_html || p.corpo_html.length < 600) e.push("corpo muito curto");
  if (!Array.isArray(p.seo?.tags) || !p.seo.tags.length) e.push("sem tags");
  if (!p.seo?.palavra_chave) e.push("sem palavra-chave");
  if (!p.imagem?.alt) e.push("imagem sem texto alternativo");
  if (!p.fonte?.url && !p.fonte?.doi) e.push("fonte sem link nem DOI");
  if (!/O que o estudo ainda não diz|limitaç/i.test(String(p.corpo_html))) e.push("falta a seção de limitações");
  const vetada = texto.match(VETADAS);
  if (vetada) e.push(`palavra vetada: "${vetada[0].trim()}"`);
  if (p.pauta?.tipo === "preprint" && !/preprint|revis(ão|ao) por pares/i.test(String(p.corpo_html))) {
    e.push("preprint sem o aviso de que ainda não passou por revisão por pares");
  }
  if (p.editoria === "saude" && p.pauta?.tipo === "preprint") e.push("preprint não vira matéria de saúde");
  return e;
}

// Sanitizador simples: só as tags e classes da lista. O site sanitiza de novo ao exibir.
function limparHtml(sujo: string): string {
  let saida = sujo.replace(/<!--[\s\S]*?-->/g, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  saida = saida.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (todo, tagBruta: string, atributos: string) => {
    const tag = TROCA[tagBruta.toLowerCase()] ?? tagBruta.toLowerCase();
    if (!TAGS.includes(tag)) return "";
    const fecha = todo.startsWith("</");
    if (fecha) return `</${tag}>`;
    if (tag === "a") {
      const href = atributos.match(/href\s*=\s*"([^"]*)"/i)?.[1] ?? "";
      if (!/^(https?:|mailto:|\/|#)/i.test(href)) return "<a>";
      const externo = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${href}"${externo}>`;
    }
    const classes = (atributos.match(/class\s*=\s*"([^"]*)"/i)?.[1] ?? "")
      .split(/\s+/).filter((c) => CLASSES.includes(c));
    if ((tag === "div" || tag === "span") && !classes.length) return "";
    return classes.length ? `<${tag} class="${classes.join(" ")}">` : `<${tag}>`;
  });
  return saida.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}
