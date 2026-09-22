// Função fotos-capa (Supabase Edge Function / Lovable Cloud)
//
// Usada pelo seletor de capa do editor. Três fontes, com regras diferentes:
//
//   Fonte     | Onde a capa fica                  | Crédito
//   ----------|-----------------------------------|---------------------------------------------
//   pexels    | link direto (hotlink), por padrão | "Foto: Nome / Pexels." (pedido, não obrigatório)
//   pixabay   | copiada para o bucket "capas"     | "Foto: Nome / Pixabay." (eles PROÍBEM hotlink)
//   unsplash  | link direto do Unsplash (hotlink) | "Foto de Nome no Unsplash", com links (obrigatório)
//
// O padrão do Pexels é hotlink porque foi o pedido: nada sobe para o nosso armazenamento.
// Para voltar a copiar (capa que não pode quebrar nunca), ligue o segredo COPIAR_PEXELS=1.
//
//   POST { acao: "buscar", fonte, termo, pagina? } -> fotos padronizadas, 3 marcadas como sugeridas
//   POST { acao: "usar", fonte, id, slug? }        -> { arquivo, alt, credito, legenda }
//
// Prioridade: Pexels > Pixabay > Unsplash. O painel abre no Pexels; o Unsplash nunca busca sozinho.
// Limite diário por fonte (site inteiro, dia de Brasília): Unsplash = 10 buscas. Busca repetida em 24 h vem do cache e não conta.
//
// Segredos: PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY (fonte sem chave aparece como "não conectada").
// Só usuários logados com papel podem chamar. As chaves nunca vão para o navegador.

import { createClient } from "npm:@supabase/supabase-js@2";

type Fonte = "pexels" | "pixabay" | "unsplash";
type Foto = {
  fonte: Fonte; id: string; largura: number; altura: number; alt: string; miniatura: string;
  fotografo: string; perfil: string; pagina: string;
};

const POR_PAGINA = 15;
const LIMITE_DIARIO: Record<Fonte, number | null> = { pexels: null, pixabay: null, unsplash: 10 };
const UTM = "utm_source=pulso_cientifico&utm_medium=referral";

// Filtros lidos na descrição/tags da foto
const PESSOA = /\b(homem|homens|mulher|mulheres|pessoa|pessoas|crian[cç]as?|menin[oa]s?|garot[oa]s?|pacientes?|idos[oa]s?|jovens?|adolescentes?|casal|fam[ií]lia|m[eé]dic[oa]s?|enfermeir[oa]s?|atleta|beb[eê]s?|man|woman|men|women|person|people|child|girl|boy|patient|doctor|nurse)\b/i;
const ROSTO = /\b(rosto|retrato|sorri\w*|sorriso|olhando para a c[aâ]mera|selfie|face|portrait|smil\w*|looking at camera)\b/i;
const TEXTO = /\b(texto|palavras?|letras|escrit[oa]s?|placa|cartaz|letreiro|text|word|letters|sign|typography)\b|['"“”‘’]/i;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);

  const servico = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: sessao } = await servico.auth.getUser(token);
  if (!sessao?.user) return json({ erro: "Entre no painel para buscar fotos." }, 401);
  const { count } = await servico.from("user_roles").select("*", { count: "exact", head: true }).eq("user_id", sessao.user.id);
  if (!count) return json({ erro: "Seu acesso ainda não foi liberado." }, 403);

  let c: { acao?: string; fonte?: Fonte; termo?: string; pagina?: number; id?: string; slug?: string };
  try {
    c = await req.json();
  } catch {
    return json({ erro: "Corpo precisa ser JSON." }, 400);
  }
  const fonte = c.fonte ?? "pexels";
  if (!["pexels", "pixabay", "unsplash"].includes(fonte)) return json({ erro: "fonte inválida." }, 400);
  const chave = Deno.env.get({ pexels: "PEXELS_API_KEY", pixabay: "PIXABAY_API_KEY", unsplash: "UNSPLASH_ACCESS_KEY" }[fonte]);
  if (!chave) return json({ erro: `${fonte} não conectado: falta a chave no servidor.`, nao_conectada: true }, 503);

  try {
    if (c.acao === "buscar") return json(await buscar(servico, fonte, chave, c.termo ?? "", c.pagina ?? 1));
    if (c.acao === "uso") return json(await uso(servico, fonte));
    if (c.acao === "usar") return json(await usar(servico, fonte, chave, String(c.id ?? ""), c.slug));
    return json({ erro: 'acao deve ser "buscar", "usar" ou "uso".' }, 400);
  } catch (e) {
    return json({ erro: (e as Error).message }, 502);
  }
});

// ---------------------------------------------------------------- busca
// deno-lint-ignore no-explicit-any
async function buscar(servico: any, fonte: Fonte, chave: string, termo: string, pagina: number) {
  termo = termo.trim().slice(0, 100);
  if (!termo) throw new Error("Digite um termo para buscar.");
  pagina = Math.max(1, Math.min(pagina, 20));

  // Cache de 24 h (exigido pelo Pixabay; economiza cota nas outras)
  const { data: cache } = await servico.from("cache_busca_fotos").select("resposta")
    .eq("fonte", fonte).eq("termo", termo.toLowerCase()).eq("pagina", pagina)
    .gte("criado_em", new Date(Date.now() - 864e5).toISOString()).maybeSingle();
  let resultado: { total: number; fotos: Foto[] } = cache?.resposta;

  let cota: { usadas: number; limite: number } | null = null;
  if (!resultado) {
    // Fontes com limite diário: reserva uma busca antes de chamar a API (atômico no banco)
    const limite = LIMITE_DIARIO[fonte];
    if (limite !== null) {
      const { data: usadas, error } = await servico.rpc("reservar_busca_foto", { _fonte: fonte, _limite: limite });
      if (error) throw new Error(error.message);
      if (usadas === -1) throw new Error(`Limite diário do ${fonte === "unsplash" ? "Unsplash" : fonte} atingido (${limite} buscas). Use Pexels ou Pixabay, ou volte amanhã.`);
      cota = { usadas, limite };
    }
    resultado = await ({ pexels: buscarPexels, pixabay: buscarPixabay, unsplash: buscarUnsplash }[fonte])(chave, termo, pagina);
    await servico.from("cache_busca_fotos").upsert(
      { fonte, termo: termo.toLowerCase(), pagina, resposta: resultado, criado_em: new Date().toISOString() },
      { onConflict: "fonte,termo,pagina" },
    );
  }

  const pontuadas = resultado.fotos.map((f, i) => {
    const razao = f.largura / f.altura;
    const alertas = { pessoa: PESSOA.test(f.alt), rosto: ROSTO.test(f.alt), texto: TEXTO.test(f.alt) };
    let nota = resultado.fotos.length - i;
    if (razao >= 1.4 && razao <= 1.9) nota += 2;
    if (f.largura >= 3000) nota += 1;
    if (alertas.pessoa) nota -= 1.5;
    if (alertas.rosto) nota -= 5;
    if (alertas.texto) nota -= 5;
    return { ...f, alertas, nota };
  });
  const sugeridas = pontuadas.filter((f) => !f.alertas.rosto && !f.alertas.texto).sort((a, b) => b.nota - a.nota).slice(0, 3).map((f) => f.id);
  if (!cota && LIMITE_DIARIO[fonte] !== null) cota = await uso(servico, fonte);
  return { fonte, termo, pagina, cota, do_cache: !!cache, total: resultado.total, fotos: pontuadas.map((f) => ({ ...f, sugerida: sugeridas.includes(f.id) })) };
}

// deno-lint-ignore no-explicit-any
async function uso(servico: any, fonte: Fonte) {
  const limite = LIMITE_DIARIO[fonte];
  if (limite === null) return null;
  const { data } = await servico.rpc("buscas_foto_hoje", { _fonte: fonte });
  return { usadas: data ?? 0, limite };
}

async function pedir(url: string, headers: Record<string, string>) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (r.status === 429 || r.status === 403) throw new Error("Limite de buscas desta fonte atingido. Tente em alguns minutos.");
  if (!r.ok) throw new Error(`A fonte respondeu ${r.status}.`);
  return r.json();
}

async function buscarPexels(chave: string, termo: string, pagina: number) {
  const q = new URLSearchParams({ query: termo, locale: "pt-BR", orientation: "landscape", per_page: String(POR_PAGINA), page: String(pagina) });
  const d = await pedir(`https://api.pexels.com/v1/search?${q}`, { Authorization: chave });
  // deno-lint-ignore no-explicit-any
  const fotos: Foto[] = (d.photos ?? []).map((f: any) => ({
    fonte: "pexels", id: String(f.id), largura: f.width, altura: f.height, alt: f.alt ?? "", miniatura: f.src.medium,
    fotografo: f.photographer, perfil: f.photographer_url, pagina: f.url,
  }));
  return { total: d.total_results ?? 0, fotos };
}

async function buscarPixabay(chave: string, termo: string, pagina: number) {
  const q = new URLSearchParams({
    key: chave, q: termo, lang: "pt", image_type: "photo", orientation: "horizontal",
    safesearch: "true", min_width: "1200", per_page: String(POR_PAGINA), page: String(pagina),
  });
  const d = await pedir(`https://pixabay.com/api/?${q}`, {});
  // deno-lint-ignore no-explicit-any
  const fotos: Foto[] = (d.hits ?? []).map((f: any) => ({
    fonte: "pixabay", id: String(f.id), largura: f.imageWidth, altura: f.imageHeight,
    alt: String(f.tags ?? ""), miniatura: f.webformatURL,
    fotografo: f.user, perfil: `https://pixabay.com/users/${f.user}-${f.user_id}/`, pagina: f.pageURL,
  }));
  return { total: d.totalHits ?? 0, fotos };
}

async function buscarUnsplash(chave: string, termo: string, pagina: number) {
  const q = new URLSearchParams({ query: termo, lang: "pt", orientation: "landscape", content_filter: "high", per_page: String(POR_PAGINA), page: String(pagina) });
  const d = await pedir(`https://api.unsplash.com/search/photos?${q}`, { Authorization: `Client-ID ${chave}`, "Accept-Version": "v1" });
  const fotos: Foto[] = (d.results ?? [])
    // deno-lint-ignore no-explicit-any
    .filter((f: any) => !f.premium && !f.plus)               // Unsplash+ é pago: fica de fora
    // deno-lint-ignore no-explicit-any
    .map((f: any) => ({
      fonte: "unsplash", id: f.id, largura: f.width, altura: f.height,
      alt: f.alt_description ?? f.description ?? "", miniatura: f.urls.small,
      fotografo: f.user.name, perfil: `${f.user.links.html}?${UTM}`, pagina: `${f.links.html}?${UTM}`,
    }));
  return { total: d.total ?? 0, fotos };
}

// ---------------------------------------------------------------- escolha
// deno-lint-ignore no-explicit-any
async function usar(servico: any, fonte: Fonte, chave: string, id: string, slug?: string) {
  if (!/^[\w-]{1,40}$/.test(id)) throw new Error("id inválido.");
  const nome = /^[a-z0-9-]{3,120}$/.test(slug ?? "") ? slug : `rascunho-${crypto.randomUUID()}`;

  if (fonte === "unsplash") {
    const f = await pedir(`https://api.unsplash.com/photos/${id}`, { Authorization: `Client-ID ${chave}`, "Accept-Version": "v1" });
    if (f.premium || f.plus) throw new Error("Foto do Unsplash+ (paga). Escolha outra.");
    // Regra do Unsplash: avisar o "download" quando a foto é escolhida
    await fetch(`${f.links.download_location}&client_id=${chave}`, { signal: AbortSignal.timeout(10_000) }).catch(() => {});
    const autor = f.user.name;
    return {
      arquivo: `${f.urls.raw}&w=1600&q=80&fm=jpg&fit=crop&ar=16:9`, // exibida direto do Unsplash; o site troca o w= por tamanho de tela
      hotlink: true,
      alt: f.alt_description ?? "",
      credito: { fonte: "unsplash", autor, perfil: `${f.user.links.html}?${UTM}`, link: `${f.links.html}?${UTM}`, id: f.id },
      legenda: `Foto de ${autor} no Unsplash.`,
    };
  }

  let origem: string, alt: string, autor: string, link: string;
  if (fonte === "pexels") {
    const f = await pedir(`https://api.pexels.com/v1/photos/${id}`, { Authorization: chave });
    origem = f.src.large2x; alt = f.alt ?? ""; autor = f.photographer; link = f.url;
    // Hotlink: o Pexels permite, e é o que evita subir arquivo para o nosso armazenamento.
    // Se o fotógrafo apagar a foto, a capa quebra — quem avisa é a função verificar-capas.
    if (Deno.env.get("COPIAR_PEXELS") !== "1") {
      return {
        arquivo: origem,
        hotlink: true,
        alt,
        credito: { fonte: "pexels", autor, link, id },
        legenda: `Foto: ${autor} / Pexels.`,
      };
    }
  } else {
    const d = await pedir(`https://pixabay.com/api/?${new URLSearchParams({ key: chave, id })}`, {});
    const f = d.hits?.[0];
    if (!f) throw new Error("Foto não encontrada no Pixabay.");
    origem = f.largeImageURL; alt = String(f.tags ?? ""); autor = f.user; link = f.pageURL;
  }

  // Chega aqui o Pixabay (que proíbe hotlink permanente) e o Pexels quando COPIAR_PEXELS=1
  const img = await fetch(origem, { signal: AbortSignal.timeout(30_000) });
  if (!img.ok) throw new Error("Não consegui baixar a foto.");
  const bytes = new Uint8Array(await img.arrayBuffer());
  const caminho = `${nome}-${fonte}-${id}.jpg`;
  const { error } = await servico.storage.from("capas").upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`Armazenamento: ${error.message}`);
  const nomeFonte = fonte === "pexels" ? "Pexels" : "Pixabay";
  return {
    arquivo: servico.storage.from("capas").getPublicUrl(caminho).data.publicUrl,
    hotlink: false,
    alt: fonte === "pixabay" ? "" : alt, // tags do Pixabay não servem de descrição: o autor escreve
    credito: { fonte, autor, link, id },
    legenda: `Foto: ${autor} / ${nomeFonte}.`,
  };
}

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
