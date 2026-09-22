// feed — RSS 2.0 com as 30 matérias mais recentes. Público, sem chave.
// Serve para leitores de RSS, agregadores e o Google Notícias (Publisher Center aceita feed).
//
// GET /functions/v1/feed                 → todas as áreas
// GET /functions/v1/feed?categoria=saude → só uma categoria principal
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = (Deno.env.get("PULSO_DOMINIO") ?? "https://pulsocientifico.com.br").replace(/\/$/, "");
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const absoluta = (u: string | null) => (!u ? "" : /^https?:/i.test(u) ? u : DOMINIO + (u.startsWith("/") ? u : "/" + u));

Deno.serve(async (req) => {
  const categoria = new URL(req.url).searchParams.get("categoria");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let q = db.from("materias")
    .select("slug, editoria, titulo, linha_fina, imagem_url, imagem_alt, publicada_em, corrigida_em, seo, autor:autores(nome)")
    .eq("status", "publicada").lte("publicada_em", new Date().toISOString())
    .order("publicada_em", { ascending: false }).limit(30);
  if (categoria) q = q.eq("editoria", categoria);
  const [{ data: materias }, { data: cats }] = await Promise.all([q, db.from("categorias").select("slug, nome").eq("nivel", 1)]);
  const nomeCat = (s: string) => cats?.find((c) => c.slug === s)?.nome ?? s;

  const itens = (materias ?? []).map((m) => {
    const link = `${DOMINIO}/${m.editoria}/${m.slug}`;
    const autor = (m.autor as { nome?: string } | null)?.nome ?? "Redação Pulso";
    const img = absoluta(m.imagem_url);
    return `    <item>
      <title>${esc(m.titulo)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${esc(m.linha_fina)}</description>
      <dc:creator>${esc(autor)}</dc:creator>
      <category>${esc(nomeCat(m.editoria))}</category>
${((m.seo as { tags?: string[] })?.tags ?? []).map((t) => `      <category>${esc(t)}</category>`).join("\n")}
      <pubDate>${new Date(m.publicada_em!).toUTCString()}</pubDate>${img ? `
      <media:content url="${esc(img)}" medium="image"><media:description>${esc(m.imagem_alt)}</media:description></media:content>` : ""}
    </item>`;
  }).join("\n");

  const titulo = categoria ? `${nomeCat(categoria)} — Pulso Científico` : "Pulso Científico";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(titulo)}</title>
    <link>${DOMINIO}${categoria ? `/${categoria}` : ""}</link>
    <description>Pesquisas recentes de saúde, inteligência artificial, tecnologia, espaço e meio ambiente, explicadas em português e sempre com link para o estudo original.</description>
    <language>pt-BR</language>
    <atom:link href="${esc(req.url)}" rel="self" type="application/rss+xml" />
    <image><url>${DOMINIO}/marca/pulso-simbolo.svg</url><title>${esc(titulo)}</title><link>${DOMINIO}</link></image>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itens}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
});
