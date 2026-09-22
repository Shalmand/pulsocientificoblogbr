// og — prévia de link para WhatsApp, Facebook, LinkedIn, X e Telegram.
//
// Por que existe: o site é montado no navegador (React). Os robôs dessas redes não rodam
// JavaScript, então leem só o index.html e mostram título e imagem genéricos em toda matéria.
// Esta função devolve uma página mínima com título, resumo e capa da matéria certa, e manda
// quem é gente de verdade para o endereço normal do site.
//
// GET /functions/v1/og?caminho=/saude/nome-da-materia
//
// Sozinha ela não muda nada: é preciso que o domínio mande os robôs para cá (regra no
// Cloudflare ou no provedor do domínio). O passo a passo está no README, em "Prévia de links".
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = (Deno.env.get("PULSO_DOMINIO") ?? "https://pulsocientifico.com.br").replace(/\/$/, "");
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const absoluta = (u: string | null | undefined) => (!u ? "" : /^https?:/i.test(u) ? u : DOMINIO + (u.startsWith("/") ? u : "/" + u));
// Pexels e Unsplash entregam a foto no tamanho pedido; 1200 px é o que as redes recomendam
const tamanho = (u: string) => {
  try {
    const x = new URL(u);
    if (x.hostname === "images.pexels.com") { x.search = "?auto=compress&cs=tinysrgb&w=1200"; return x.toString(); }
    if (x.hostname === "images.unsplash.com") { x.searchParams.set("w", "1200"); x.searchParams.set("q", "75"); return x.toString(); }
  } catch { /* relativo */ }
  return u;
};

interface Previa { titulo: string; descricao: string; imagem: string; tipo: "article" | "website" | "profile"; publicada?: string | null; autor?: string }

const PADRAO: Previa = {
  titulo: "Pulso Científico",
  descricao: "Ciência recente explicada em português simples, sempre com link para o estudo original.",
  imagem: `${DOMINIO}/marca/pulso-simbolo.svg`,
  tipo: "website",
};

Deno.serve(async (req) => {
  const bruto = new URL(req.url).searchParams.get("caminho") || "/";
  // Só caminhos do próprio site: evita virar redirecionador para qualquer endereço
  const caminho = "/" + bruto.replace(/^https?:\/\/[^/]+/i, "").replace(/[?#].*$/, "").split("/").filter((p) => /^[a-z0-9-]+$/i.test(p)).join("/");
  const partes = caminho.split("/").filter(Boolean);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let p: Previa = PADRAO;
  if (partes[0] === "autor" && partes[1]) {
    const { data: a } = await db.from("autores").select("nome, bio, foto_url").eq("slug", partes[1]).eq("ativo", true).maybeSingle();
    if (a) p = { titulo: `${a.nome} — Pulso Científico`, descricao: a.bio || PADRAO.descricao, imagem: absoluta(a.foto_url) || PADRAO.imagem, tipo: "profile" };
  } else if (partes.length >= 2) {
    // /categoria/materia ou /categoria/sub/materia: a matéria é sempre o último pedaço
    const { data: m } = await db.from("materias")
      .select("titulo, linha_fina, imagem_url, publicada_em, autor:autores(nome)")
      .eq("slug", partes[partes.length - 1]).eq("status", "publicada").lte("publicada_em", new Date().toISOString()).maybeSingle();
    if (m) {
      // Mesma regra do site: título da página = título da matéria; descrição = linha fina
      p = {
        titulo: m.titulo, descricao: m.linha_fina || PADRAO.descricao,
        imagem: m.imagem_url ? tamanho(absoluta(m.imagem_url)) : PADRAO.imagem, tipo: "article",
        publicada: m.publicada_em, autor: (m.autor as { nome?: string } | null)?.nome,
      };
    }
  }
  if (p === PADRAO && partes.length) {
    const { data: c } = await db.from("categorias").select("nome, descricao").eq("slug", partes[partes.length - 1]).maybeSingle();
    if (c) p = { ...PADRAO, titulo: `${c.nome} — Pulso Científico`, descricao: c.descricao || PADRAO.descricao };
  }

  const url = DOMINIO + (caminho === "/" ? "/" : caminho);
  const html = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${esc(p.titulo)}</title>
<meta name="description" content="${esc(p.descricao)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="Pulso Científico">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${p.tipo}">
<meta property="og:title" content="${esc(p.titulo)}">
<meta property="og:description" content="${esc(p.descricao)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(p.imagem)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.titulo)}">
<meta name="twitter:description" content="${esc(p.descricao)}">
<meta name="twitter:image" content="${esc(p.imagem)}">${p.publicada ? `
<meta property="article:published_time" content="${esc(p.publicada)}">` : ""}${p.autor ? `
<meta property="article:author" content="${esc(p.autor)}">` : ""}
<meta http-equiv="refresh" content="0; url=${esc(url)}">
</head><body><p><a href="${esc(url)}">${esc(p.titulo)}</a></p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600" } });
});
