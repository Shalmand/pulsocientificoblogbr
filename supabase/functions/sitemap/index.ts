// sitemap — lista para o Google o que existe no site. Pública, sem chave.
//
// GET /functions/v1/sitemap        → sitemap.xml com matérias, categorias, autores e páginas
// GET /functions/v1/sitemap?tipo=robots → robots.txt apontando para ele
//
// No Lovable, aponte /sitemap.xml e /robots.txt para esta função.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = (Deno.env.get("PULSO_DOMINIO") ?? "https://pulsocientifico.com.br").replace(/\/$/, "");

Deno.serve(async (req) => {
  const tipo = new URL(req.url).searchParams.get("tipo");
  if (tipo === "robots") {
    return texto(`User-agent: *
Allow: /
Disallow: /painel
Disallow: /conta
Disallow: /completar

Sitemap: ${DOMINIO}/sitemap.xml

# Resumo do site em texto puro, para quem lê com IA:
# ${DOMINIO}/llms.txt
`, "text/plain");
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const [materias, categorias, autores, paginas] = await Promise.all([
    db.from("materias").select("slug, editoria, titulo, atualizada_em, publicada_em").eq("status", "publicada").lte("publicada_em", new Date().toISOString())
      .order("publicada_em", { ascending: false }).limit(5000),
    db.from("categorias").select("slug, pai, nivel").eq("ativa", true),
    db.from("autores").select("slug, criado_em").eq("ativo", true),
    db.from("paginas").select("slug, atualizada_em"),
  ]);

  const cats = categorias.data ?? [];
  const caminho = (slug: string): string => {
    const c = cats.find((x) => x.slug === slug);
    if (!c) return slug;
    return c.pai ? `${caminho(c.pai)}/${c.slug}` : c.slug;
  };

  const urls: { loc: string; data?: string; prioridade: string }[] = [
    { loc: "", prioridade: "1.0" },
    ...(materias.data ?? []).map((m) => ({
      loc: `${m.editoria}/${m.slug}`, data: m.atualizada_em ?? m.publicada_em, prioridade: "0.9",
    })),
    ...cats.map((c) => ({ loc: caminho(c.slug), prioridade: c.nivel === 1 ? "0.7" : "0.5" })),
    ...(autores.data ?? []).map((a) => ({ loc: `autor/${a.slug}`, prioridade: "0.5" })),
    ...(paginas.data ?? []).map((p) => ({ loc: p.slug, data: p.atualizada_em, prioridade: "0.3" })),
    { loc: "parceiros", prioridade: "0.3" },
  ];

  // O Google News quer as matérias das últimas 48 h num bloco próprio, com data e hora cheias
  const doisDias = Date.now() - 2 * 864e5;
  const noticias = (materias.data ?? []).filter((m) => m.publicada_em && +new Date(m.publicada_em) > doisDias);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls.map((u) => `  <url>
    <loc>${DOMINIO}/${u.loc}</loc>${u.data ? `
    <lastmod>${String(u.data).slice(0, 10)}</lastmod>` : ""}
    <priority>${u.prioridade}</priority>
  </url>`).join("\n")}
${noticias.map((m) => `  <url>
    <loc>${DOMINIO}/${m.editoria}/${m.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Pulso Científico</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>${m.publicada_em}</news:publication_date>
      <news:title>${escaparXml(m.titulo ?? "")}</news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>
`;
  return texto(xml, "application/xml");
});

// & < > " nunca entram crus num XML
const escaparXml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function texto(corpo: string, tipo: string) {
  return new Response(corpo, {
    headers: { "Content-Type": `${tipo}; charset=utf-8`, "Cache-Control": "public, max-age=3600" },
  });
}
