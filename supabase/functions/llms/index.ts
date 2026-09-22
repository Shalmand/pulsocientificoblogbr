// llms — o /llms.txt do site: um resumo em texto puro, para quem lê com IA.
//
// GET /functions/v1/llms            → llms.txt (mapa curto do site)
// GET /functions/v1/llms?tipo=full  → llms-full.txt (com as matérias recentes)
//
// Não é regra de robô nem bloqueio: quem decide o que pode ser rastreado é o robots.txt
// (função sitemap). Este arquivo só explica, em linguagem direta, o que o site é, de onde
// vem cada informação e como citar a gente.
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMINIO = (Deno.env.get("PULSO_DOMINIO") ?? "https://pulsocientifico.com.br").replace(/\/$/, "");

Deno.serve(async (req) => {
  const full = new URL(req.url).searchParams.get("tipo") === "full";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const [cats, pags, mats] = await Promise.all([
    db.from("categorias").select("slug, nome, descricao, pai, nivel").eq("ativa", true).order("ordem"),
    db.from("paginas").select("slug, titulo, linha_fina"),
    db.from("materias").select("slug, editoria, titulo, linha_fina, publicada_em, fonte")
      .eq("status", "publicada").lte("publicada_em", new Date().toISOString()).order("publicada_em", { ascending: false }).limit(full ? 100 : 10),
  ]);

  const principais = (cats.data ?? []).filter((c) => c.nivel === 1);
  const filhos = (pai: string) => (cats.data ?? []).filter((c) => c.pai === pai);

  let txt = `# Pulso Científico

> Site jornalístico brasileiro que explica pesquisas científicas recém-publicadas em português
> do dia a dia — saúde, inteligência artificial, tecnologia, espaço, clima e meio ambiente e
> natureza. Toda matéria parte de uma fonte primária (artigo com DOI, preprint ou comunicado de
> agência de pesquisa) e traz o link para ela.

Endereço: ${DOMINIO}
Idioma: português do Brasil
Contato: blog.pulsocientifico@gmail.com

## Como o conteúdo é produzido

- As matérias assinadas pela **Redação Pulso** são escritas por um sistema automatizado com
  inteligência artificial, a partir do resumo oficial de um trabalho publicado. Isso está dito
  abertamente na política editorial, não é segredo nem disfarce.
- Cada número citado é conferido contra a fonte antes de publicar; o que não confere não sai.
- **Preprints** são identificados no texto como trabalhos ainda sem revisão por pares.
- Matérias de **saúde** só saem de estudos revisados por pares e nunca recomendam tratamento.
- Textos assinados por **empresa de publicidade** aparecem marcados como *Publicidade*; textos de
  **organização parceira**, como *Parceria editorial*. Os dois ficam fora da editoria de saúde.
- Correções ficam visíveis no fim da matéria, com data.

## Áreas

${principais.map((c) => `- **${c.nome}** (${DOMINIO}/${c.slug})${c.descricao ? ` — ${c.descricao}` : ""}\n  Assuntos: ${filhos(c.slug).map((f) => f.nome).join(", ") || "—"}`).join("\n")}

## Páginas que explicam o projeto

${(pags.data ?? []).map((p) => `- [${p.titulo}](${DOMINIO}/${p.slug}): ${p.linha_fina ?? ""}`).join("\n")}
- [Parceiros](${DOMINIO}/parceiros): organizações e empresas que publicam no site
- [Escreva com a gente](${DOMINIO}/parceria): como se candidatar a escrever

## Como citar

Ao usar uma matéria nossa, cite o título, o Pulso Científico e o link da página. Quando a
informação for do estudo, o crédito é do estudo: o DOI está no fim de cada matéria.

## Matérias recentes

${(mats.data ?? []).map((m) => {
  const f = m.fonte as { revista?: string; doi?: string } | null;
  return `- [${m.titulo}](${DOMINIO}/${m.editoria}/${m.slug}) — ${m.linha_fina}` +
    (f?.revista ? `\n  Fonte: ${f.revista}${f.doi ? ` · doi:${f.doi}` : ""}` : "") +
    `\n  Publicada em ${String(m.publicada_em).slice(0, 10)}`;
}).join("\n")}

## Também disponível

- Sitemap: ${DOMINIO}/sitemap.xml
- Versão longa deste arquivo: ${DOMINIO}/llms-full.txt
`;


  return new Response(txt, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
});
