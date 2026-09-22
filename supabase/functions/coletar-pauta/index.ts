// coletar-pauta — varre as fontes de cada área e devolve as pautas novas, já pontuadas.
//
// POST /functions/v1/coletar-pauta
//   Cabeçalho: x-agente-chave: <AGENTE_CHAVE>
//   Corpo (tudo opcional): { "editoria": "espaco", "fonte": "arxiv-ia", "limite": 10 }
//   Resposta: { total, candidatos: [{ fonte, id_externo, tipo, editoria, titulo, resumo,
//                                     autores, data, doi, url, nota, motivos }] }
//
// Só usa API pública e gratuita (ver FONTES.md):
//   pubmed     → E-utilities (saúde; sem chave)
//   arxiv      → export.arxiv.org/api/query (1 pedido a cada 3s; sem chave)
//   crossref   → api.crossref.org (sem chave; mandar CROSSREF_MAILTO entra no "polite pool")
//   openalex   → api.openalex.org (única com filtro por país; ver OPENALEX_API_KEY em FONTES.md)
//   europepmc  → ebi.ac.uk/europepmc (sem chave)
//   rss        → comunicado de agência (NASA etc.)
//
// O que já virou matéria ou foi descartado fica em pautas_processadas e não volta.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
// Cópia de banco/fontes.json; quem manda é o arquivo do banco (ferramentas/banco-fixo.mjs sincroniza)
import CFG from "./fontes.json" with { type: "json" };

type Fonte = {
  id: string; nome: string; api: string; tipo: string; editoria: string;
  ativa: boolean; consulta?: string; issn?: string[]; filtro?: string; dias: number; maximo: number;
};
type Pauta = {
  fonte: string; fonte_nome: string; id_externo: string; tipo: string; editoria: string;
  titulo: string; resumo: string; autores: string; data: string;
  doi?: string; url: string; revista?: string; nota?: number; motivos?: string[];
};

const PESO = CFG.peso as Record<string, number>;
const BRASIL: string[] = CFG.palavras_brasil;
const AGENTE = "PulsoCientifico/1.0 (+https://pulsocientifico.com.br; blog.pulsocientifico@gmail.com)";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  const chave = Deno.env.get("AGENTE_CHAVE") ?? "";
  if (chave.length < 40) return json({ erro: "AGENTE_CHAVE não configurada." }, 500);
  if ((req.headers.get("x-agente-chave") ?? "") !== chave) return json({ erro: "Chave inválida." }, 401);

  const p = await req.json().catch(() => ({}));
  const limite = Math.min(Number(p.limite) || 12, 50);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const fontes = (CFG.fontes as Fonte[]).filter((f) =>
    f.ativa && (!p.editoria || f.editoria === p.editoria) && (!p.fonte || f.id === p.fonte)
  );

  const achadas: Pauta[] = [];
  const falhas: Record<string, string> = {};
  for (const f of fontes) {
    try {
      achadas.push(...await buscar(f));
    } catch (e) {
      falhas[f.id] = (e as Error).message;   // uma fonte fora do ar não derruba a coleta
      console.error(`fonte ${f.id}:`, (e as Error).message);
    }
  }

  const novas = await semRepetir(db, achadas);
  const ranqueadas = novas.map(pontuar).sort((a, b) => b.nota! - a.nota!).slice(0, limite);
  return json({ total: ranqueadas.length, vistas: achadas.length, falhas, candidatos: ranqueadas });
});

// ---------------------------------------------------------------- buscadores

async function buscar(f: Fonte): Promise<Pauta[]> {
  if (f.api === "pubmed") return await doPubmed(f);
  if (f.api === "arxiv") return await doArxiv(f);
  if (f.api === "crossref") return await doCrossref(f);
  if (f.api === "europepmc") return await doEuropePmc(f);
  if (f.api === "openalex") return await doOpenAlex(f);
  if (f.api === "rss") return await doRss(f);
  throw new Error(`api "${f.api}" desconhecida`);
}

const desde = (dias: number) => new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
const limpar = (t: string) =>
  t.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
   .replace(/&quot;/g, '"').replace(/&#3[49];/g, "'").replace(/\s+/g, " ").trim();
const tags = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);
const tag1 = (xml: string, tag: string) => tags(xml, tag)[0] ?? "";

async function pegar(url: string, cabecalhos: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { "User-Agent": AGENTE, ...cabecalhos } });
  if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
  return r;
}

// ---- PubMed (saúde): esearch + esummary, como já fazia o agente
async function doPubmed(f: Fonte): Promise<Pauta[]> {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const busca = `${base}/esearch.fcgi?db=pubmed&retmode=json&retmax=${f.maximo}&sort=date` +
    `&term=${encodeURIComponent(f.consulta!)}&mindate=${desde(f.dias).replace(/-/g, "/")}&datetype=pdat`;
  const ids: string[] = (await (await pegar(busca)).json()).esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const resumo = await (await pegar(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`)).json();
  const detalhes = await (await pegar(`${base}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(",")}`)).text();
  const abstracts = new Map<string, string>();
  for (const art of tags(detalhes, "PubmedArticle")) {
    const pmid = limpar(tag1(art, "PMID"));
    abstracts.set(pmid, limpar(tags(art, "AbstractText").join(" ")));
  }
  return ids.map((id) => {
    const r = resumo.result?.[id] ?? {};
    return {
      fonte: f.id, fonte_nome: f.nome, id_externo: `pmid:${id}`, tipo: f.tipo, editoria: f.editoria,
      titulo: limpar(r.title ?? ""), resumo: abstracts.get(id) ?? "",
      autores: (r.authors ?? []).slice(0, 4).map((a: { name: string }) => a.name).join(", "),
      data: r.sortpubdate?.slice(0, 10).replace(/\//g, "-") ?? "",
      doi: (r.articleids ?? []).find((x: { idtype: string }) => x.idtype === "doi")?.value,
      revista: r.fulljournalname ?? r.source,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    };
  }).filter((x) => x.titulo && x.resumo);
}

// ---- arXiv (IA, tecnologia, espaço): Atom, sem chave, 1 pedido por vez
async function doArxiv(f: Fonte): Promise<Pauta[]> {
  const url = "http://export.arxiv.org/api/query?" +
    `search_query=${encodeURIComponent(`(${f.consulta})`)}` +
    `&sortBy=submittedDate&sortOrder=descending&max_results=${f.maximo}`;
  const xml = await (await pegar(url)).text();
  const corte = desde(f.dias);
  return tags(xml, "entry").map((e) => {
    const id = limpar(tag1(e, "id"));
    const doi = limpar(tag1(e, "arxiv:doi")) || undefined;
    return {
      fonte: f.id, fonte_nome: f.nome, id_externo: `arxiv:${id.split("/abs/")[1] ?? id}`,
      tipo: f.tipo, editoria: f.editoria,
      titulo: limpar(tag1(e, "title")), resumo: limpar(tag1(e, "summary")),
      autores: tags(e, "author").map((a) => limpar(tag1(a, "name"))).slice(0, 4).join(", "),
      data: limpar(tag1(e, "published")).slice(0, 10),
      doi, revista: "arXiv (preprint)", url: id,
    };
  }).filter((x) => x.data >= corte && x.titulo && x.resumo);
}

// ---- Crossref (Nature, Science e revistas de clima): metadados por ISSN
async function doCrossref(f: Fonte): Promise<Pauta[]> {
  const mailto = Deno.env.get("CROSSREF_MAILTO");   // entra no "polite pool", com limite melhor
  const saida: Pauta[] = [];
  for (const issn of f.issn ?? []) {
    const url = `https://api.crossref.org/journals/${issn}/works?` +
      `filter=from-pub-date:${desde(f.dias)},type:journal-article&sort=published&order=desc` +
      `&rows=${f.maximo}&select=DOI,title,abstract,author,published,container-title,URL` +
      (mailto ? `&mailto=${encodeURIComponent(mailto)}` : "");
    const itens = (await (await pegar(url)).json())?.message?.items ?? [];
    for (const it of itens) {
      const resumo = limpar(it.abstract ?? "");
      if (resumo.length < 280) continue;   // sem resumo não dá para escrever com honestidade
      saida.push({
        fonte: f.id, fonte_nome: f.nome, id_externo: `doi:${it.DOI}`, tipo: f.tipo, editoria: f.editoria,
        titulo: limpar(it.title?.[0] ?? ""), resumo,
        autores: (it.author ?? []).slice(0, 4).map((a: { given?: string; family?: string }) =>
          [a.given, a.family].filter(Boolean).join(" ")).join(", "),
        data: (it.published?.["date-parts"]?.[0] ?? []).map((n: number) => String(n).padStart(2, "0")).join("-"),
        doi: it.DOI, revista: it["container-title"]?.[0], url: it.URL ?? `https://doi.org/${it.DOI}`,
      });
    }
  }
  return saida.filter((x) => x.titulo);
}

// ---- Europe PMC (biologia, natureza): resumo completo, sem chave
async function doEuropePmc(f: Fonte): Promise<Pauta[]> {
  const url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core" +
    `&pageSize=${f.maximo}&sort=P_PDATE_D%20desc` +
    `&query=${encodeURIComponent(`${f.consulta} AND FIRST_PDATE:[${desde(f.dias)} TO ${desde(0)}]`)}`;
  const itens = (await (await pegar(url)).json())?.resultList?.result ?? [];
  return itens.map((it: Record<string, string>) => ({
    fonte: f.id, fonte_nome: f.nome, id_externo: `pmcid:${it.id}`, tipo: f.tipo, editoria: f.editoria,
    titulo: limpar(it.title ?? ""), resumo: limpar(it.abstractText ?? ""),
    autores: it.authorString ?? "", data: it.firstPublicationDate ?? "",
    doi: it.doi, revista: it.journalTitle,
    url: it.doi ? `https://doi.org/${it.doi}` : `https://europepmc.org/article/${it.source}/${it.id}`,
  })).filter((x: Pauta) => x.titulo && x.resumo.length > 280);
}

// ---- OpenAlex: a única base aberta com filtro por país da instituição (ex.: pesquisa da China)
async function doOpenAlex(f: Fonte): Promise<Pauta[]> {
  const chave = Deno.env.get("OPENALEX_API_KEY");   // opcional hoje; eles anunciaram cobrança por crédito
  const filtro = `${f.filtro},from_publication_date:${desde(f.dias)},has_abstract:true,type:article`;
  const url = "https://api.openalex.org/works?" +
    `filter=${filtro}&sort=publication_date:desc&per-page=${f.maximo}` +
    "&select=id,doi,title,publication_date,abstract_inverted_index,primary_location,authorships" +
    (chave ? `&api_key=${chave}` : "");
  const itens = (await (await pegar(url)).json())?.results ?? [];
  return itens.map((it: Record<string, unknown>) => {
    const local = it.primary_location as { source?: { display_name?: string }; landing_page_url?: string } | null;
    const autores = (it.authorships as { author?: { display_name?: string } }[] ?? [])
      .slice(0, 4).map((a) => a.author?.display_name ?? "").filter(Boolean).join(", ");
    const doi = String(it.doi ?? "").replace("https://doi.org/", "");
    return {
      fonte: f.id, fonte_nome: f.nome, id_externo: doi ? `doi:${doi}` : `openalex:${it.id}`,
      tipo: f.tipo, editoria: f.editoria,
      titulo: limpar(String(it.title ?? "")),
      resumo: doResumoInvertido(it.abstract_inverted_index as Record<string, number[]> | null),
      autores, data: String(it.publication_date ?? ""), doi: doi || undefined,
      revista: local?.source?.display_name,
      url: doi ? `https://doi.org/${doi}` : (local?.landing_page_url ?? String(it.id)),
    };
  }).filter((x: Pauta) => x.titulo && x.resumo.length > 280);
}

// O OpenAlex guarda o resumo como índice invertido (palavra → posições); aqui ele volta a ser texto
function doResumoInvertido(inv: Record<string, number[]> | null): string {
  if (!inv) return "";
  const partes: string[] = [];
  for (const [palavra, posicoes] of Object.entries(inv)) for (const i of posicoes) partes[i] = palavra;
  return limpar(partes.join(" "));
}

// ---- RSS de agência (NASA, ESA): comunicado oficial, texto próprio da instituição
async function doRss(f: Fonte): Promise<Pauta[]> {
  const xml = await (await pegar(f.consulta!)).text();
  const corte = new Date(Date.now() - f.dias * 864e5);
  return tags(xml, "item").slice(0, f.maximo).map((it) => {
    const link = limpar(tag1(it, "link"));
    const data = new Date(limpar(tag1(it, "pubDate")) || Date.now());
    return {
      fonte: f.id, fonte_nome: f.nome, id_externo: `url:${link}`, tipo: f.tipo, editoria: f.editoria,
      titulo: limpar(tag1(it, "title")), resumo: limpar(tag1(it, "description")),
      autores: f.nome, data: isNaN(+data) ? "" : data.toISOString().slice(0, 10),
      revista: f.nome, url: link, _quando: data,
    } as Pauta & { _quando: Date };
  }).filter((x) => x.titulo && (x as Pauta & { _quando: Date })._quando >= corte);
}

// ------------------------------------------------------------- dedup e nota

async function semRepetir(db: SupabaseClient, lista: Pauta[]) {
  if (!lista.length) return lista;
  const ids = [...new Set(lista.map((x) => x.id_externo))];
  const { data } = await db.from("pautas_processadas").select("id_externo").in("id_externo", ids);
  const vistos = new Set((data ?? []).map((r: { id_externo: string }) => r.id_externo));
  const novas: Pauta[] = [];
  const repetido = new Set<string>();
  for (const p of lista) {
    // mesmo trabalho aparece duas vezes quando há preprint e versão publicada: corta por título também
    const chaveTitulo = "t:" + p.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60);
    if (vistos.has(p.id_externo) || repetido.has(p.id_externo) || repetido.has(chaveTitulo)) continue;
    repetido.add(p.id_externo);
    repetido.add(chaveTitulo);
    novas.push(p);
  }
  return novas;
}

function pontuar(p: Pauta): Pauta {
  const texto = `${p.titulo} ${p.resumo}`.toLowerCase();
  const motivos: string[] = [];
  let nota = 0;

  const dias = p.data ? (Date.now() - +new Date(p.data)) / 864e5 : 9;
  const recencia = Math.max(0, 1 - dias / 7);
  nota += recencia * PESO.recencia;
  if (dias <= 2) motivos.push("publicado nos últimos 2 dias");

  if (BRASIL.some((w) => texto.includes(w))) { nota += PESO.brasil; motivos.push("tem ligação com o Brasil"); }

  const n = texto.match(/([\d.,]{3,})\s*(participants|patients|people|pacientes|participantes)/);
  if (n) { nota += PESO.tamanho_do_estudo; motivos.push(`estudo com ${n[1]} participantes`); }

  if (/random(ised|ized)|meta-analysis|ensaio clínico|phase (2|3|ii|iii)/.test(texto)) {
    nota += PESO.revisao_por_pares; motivos.push("ensaio clínico ou meta-análise");
  }
  if (p.tipo === "preprint") { nota -= 0.5; motivos.push("preprint: a matéria precisa dizer isso"); }
  if (p.tipo === "comunicado") { nota += 0.5; motivos.push("comunicado oficial da agência"); }

  if (/first|unprecedented|breakthrough|inédit|pela primeira vez/.test(texto)) {
    nota += PESO.tema_quente; motivos.push("resultado inédito");
  }
  if (p.resumo.length > 900) { nota += 0.3; motivos.push("resumo detalhado"); }

  return { ...p, nota: Math.round(nota * 100) / 100, motivos };
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}
