// buscar-estudo — o botão "Buscar" do editor. Recebe um DOI, um PMID ou um link de arXiv
// e devolve título original, revista, autores e data, para preencher a ficha da fonte.
//
// GET /functions/v1/buscar-estudo?id=10.1001/jamanetworkopen.2026.29979
// GET /functions/v1/buscar-estudo?id=42640641
// GET /functions/v1/buscar-estudo?id=arXiv:2609.01234
// POST /functions/v1/buscar-estudo  { "id": "..." }   (é assim que o painel chama)
//
// Chamada pelo painel com o JWT de quem está logado: só quem escreve usa.
import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "PulsoCientifico/1.0 (+https://pulsocientifico.com.br; blog.pulsocientifico@gmail.com)";
const limpar = (t: string) =>
  t.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
   .replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const tags = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);
const tag1 = (xml: string, tag: string) => tags(xml, tag)[0] ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ erro: "Entre na sua conta antes." }, 401);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false },
  });
  const { data: sessao } = await anon.auth.getUser();
  if (!sessao?.user) return json({ erro: "Sessão inválida." }, 401);

  let bruto = (new URL(req.url).searchParams.get("id") ?? "").trim();
  if (!bruto && req.method === "POST") {
    try { bruto = String((await req.json())?.id ?? "").trim(); } catch { /* corpo vazio */ }
  }
  if (!bruto) return json({ erro: "Informe id (DOI, PMID ou arXiv)." }, 400);

  try {
    if (/^\d{6,9}$/.test(bruto)) return json(await porPubmed(bruto));
    const arxiv = bruto.match(/(?:arxiv[:/]|abs\/)\s*([\d.]+v?\d*)/i);
    if (arxiv) return json(await porArxiv(arxiv[1]));
    const doi = bruto.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    if (/^10\.\d{4,9}\//.test(doi)) return json(await porDoi(doi));
    return json({ erro: "Não reconheci: use DOI (10.xxxx/…), PMID (só números) ou arXiv." }, 400);
  } catch (e) {
    return json({ erro: (e as Error).message }, 502);
  }
});

async function pegar(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
  return r;
}

async function porPubmed(pmid: string) {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const chave = Deno.env.get("NCBI_API_KEY") ? `&api_key=${Deno.env.get("NCBI_API_KEY")}` : "";
  const j = await (await pegar(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}${chave}`)).json();
  const r = j.result?.[pmid];
  if (!r || r.error) throw new Error("PMID não encontrado no PubMed.");
  const xml = await (await pegar(`${base}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${pmid}${chave}`)).text();
  const autores = (r.authors ?? []).map((a: { name: string }) => a.name);
  return {
    tipo: "estudo",
    revista: r.fulljournalname ?? r.source,
    titulo_original: limpar(r.title ?? ""),
    autores: autores.slice(0, 3).join(", ") + (autores.length > 3 ? ", et al." : ""),
    data: (r.sortpubdate ?? "").slice(0, 10).replace(/\//g, "-"),
    citacao: `${r.fulljournalname ?? r.source}, ${r.pubdate ?? ""}${r.volume ? `; ${r.volume}` : ""}${r.issue ? `(${r.issue})` : ""}${r.pages ? `: ${r.pages}` : ""}`.trim(),
    doi: (r.articleids ?? []).find((x: { idtype: string }) => x.idtype === "doi")?.value ?? null,
    pmid,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    resumo: limpar(tags(xml, "AbstractText").join(" ")),
  };
}

async function porDoi(doi: string) {
  const mailto = Deno.env.get("CROSSREF_MAILTO");
  const j = await (await pegar(`https://api.crossref.org/works/${encodeURIComponent(doi)}${mailto ? `?mailto=${encodeURIComponent(mailto)}` : ""}`)).json();
  const m = j.message;
  if (!m) throw new Error("DOI não encontrado no Crossref.");
  const autores = (m.author ?? []).map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(" "));
  const partes = m.published?.["date-parts"]?.[0] ?? [];
  return {
    tipo: "estudo",
    revista: m["container-title"]?.[0] ?? m.publisher,
    titulo_original: limpar(m.title?.[0] ?? ""),
    autores: autores.slice(0, 3).join(", ") + (autores.length > 3 ? ", et al." : ""),
    data: partes.map((n: number) => String(n).padStart(2, "0")).join("-"),
    citacao: `${m["container-title"]?.[0] ?? ""}, ${partes.join("-")}`.trim(),
    doi: m.DOI, pmid: null,
    url: m.URL ?? `https://doi.org/${m.DOI}`,
    resumo: limpar(m.abstract ?? ""),
  };
}

async function porArxiv(id: string) {
  const xml = await (await pegar(`http://export.arxiv.org/api/query?id_list=${id}`)).text();
  const e = tags(xml, "entry")[0];
  if (!e) throw new Error("Identificador do arXiv não encontrado.");
  const autores = tags(e, "author").map((a) => limpar(tag1(a, "name")));
  return {
    tipo: "preprint",
    revista: "arXiv (preprint, sem revisão por pares)",
    titulo_original: limpar(tag1(e, "title")),
    autores: autores.slice(0, 3).join(", ") + (autores.length > 3 ? ", et al." : ""),
    data: limpar(tag1(e, "published")).slice(0, 10),
    citacao: `arXiv:${id}`,
    doi: limpar(tag1(e, "arxiv:doi")) || null,
    pmid: null,
    url: limpar(tag1(e, "id")),
    resumo: limpar(tag1(e, "summary")),
  };
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
