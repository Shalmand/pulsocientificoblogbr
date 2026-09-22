// Função gerar-capa (Supabase Edge Function / Lovable Cloud) — usada pelo AGENTE
//
// Escolhe a capa de uma matéria automática, nesta ordem:
//   1. Pexels  — busca em português pela palavra-chave e pelas tags; pega a melhor nota
//   2. Reserva — imagem aprovada previamente no bucket "capas-reserva/<editoria>/"
//
// O agente usa só o Pexels: o Pixabay proíbe busca automatizada e o Unsplash fica para o painel.
// A foto do Pexels fica por link (hotlink, permitido); COPIAR_PEXELS=1 volta a copiar para o bucket "capas".
//
// Segredos: AGENTE_CHAVE, PEXELS_API_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";

// editoria = slug de uma categoria principal (nível 1) da tabela categorias: saude, espaco, natureza…

type Pedido = {
  slug: string;
  editoria: string;
  imagem: {
    buscas: string[];   // em português, da mais específica para a mais ampla (palavra-chave, tags)
    alt: string;        // em português, descrição da imagem para leitores de tela
  };
};

const PESSOA = /\b(homem|homens|mulher|mulheres|pessoa|pessoas|crian[cç]as?|pacientes?|idos[oa]s?|jovens?|m[eé]dic[oa]s?)\b/i;
const ROSTO = /\b(rosto|retrato|sorri\w*|sorriso|olhando para a c[aâ]mera|selfie)\b/i;
const TEXTO = /\b(texto|palavras?|letras|escrit[oa]s?|placa|cartaz|letreiro)\b|['"“”‘’]/i;
const VETADAS = /\b(sangue|ferida|cirurgia|cad[aá]ver|antes e depois|logo|marca)\b/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (req.headers.get("x-agente-chave") !== Deno.env.get("AGENTE_CHAVE")) return json({ erro: "Chave do agente inválida." }, 401);

  let p: Pedido;
  try {
    p = await req.json();
  } catch {
    return json({ erro: "Corpo precisa ser JSON." }, 400);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p?.slug ?? "")) return json({ erro: "slug inválido." }, 400);
  if (!p.imagem?.buscas?.length || !p.imagem.alt) return json({ erro: "imagem precisa de buscas e alt." }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cat } = await db.from("categorias").select("slug").eq("slug", p.editoria ?? "").eq("nivel", 1).maybeSingle();
  if (!cat) return json({ erro: "editoria inválida: use o slug de uma categoria principal." }, 400);
  const tentativas: string[] = [];

  // 1. Pexels
  const chave = Deno.env.get("PEXELS_API_KEY");
  for (const termo of p.imagem.buscas.slice(0, 3)) {
    if (!chave) { tentativas.push("pexels: sem chave"); break; }
    if (VETADAS.test(termo)) { tentativas.push(`"${termo}": termo vetado`); continue; }
    try {
      const q = new URLSearchParams({ query: termo, locale: "pt-BR", orientation: "landscape", per_page: "15" });
      const r = await fetch(`https://api.pexels.com/v1/search?${q}`, { headers: { Authorization: chave }, signal: AbortSignal.timeout(15_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { photos = [] } = await r.json();
      // deno-lint-ignore no-explicit-any
      const melhor = photos.map((f: any, i: number) => {
        const alt = f.alt ?? "", razao = f.width / f.height;
        if (ROSTO.test(alt) || TEXTO.test(alt) || VETADAS.test(alt)) return null;
        let nota = photos.length - i;
        if (razao >= 1.4 && razao <= 1.9) nota += 2;
        if (f.width >= 3000) nota += 1;
        if (PESSOA.test(alt)) nota -= 1.5;
        return { f, nota };
      // deno-lint-ignore no-explicit-any
      }).filter(Boolean).sort((a: any, b: any) => b.nota - a.nota)[0];
      if (!melhor) { tentativas.push(`"${termo}": nenhuma foto passou nos filtros`); continue; }

      // Por padrão a capa fica no link do Pexels (permitido por eles; nada sobe para o nosso
      // armazenamento). Com o segredo COPIAR_PEXELS=1, volta a copiar para o bucket "capas".
      let url = melhor.f.src.large2x as string;
      if (Deno.env.get("COPIAR_PEXELS") === "1") {
        const img = await fetch(melhor.f.src.large2x, { signal: AbortSignal.timeout(30_000) });
        const bytes = new Uint8Array(await img.arrayBuffer());
        const caminho = `${p.slug}-pexels-${melhor.f.id}.jpg`;
        const { error } = await db.storage.from("capas").upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error(error.message);
        url = db.storage.from("capas").getPublicUrl(caminho).data.publicUrl;
      }
      return json({
        url,
        alt: p.imagem.alt,
        credito: { fonte: "pexels", autor: melhor.f.photographer, link: melhor.f.url, id: melhor.f.id },
        legenda: `Foto: ${melhor.f.photographer} / Pexels.`,
        busca_usada: termo,
        tentativas,
      });
    } catch (e) {
      tentativas.push(`"${termo}": ${(e as Error).message}`);
    }
  }

  // 2. Reserva aprovada da editoria
  const { data } = await db.storage.from("capas-reserva").list(p.editoria, { limit: 100 });
  const arquivos = (data ?? []).filter((f: { name: string }) => /\.(jpe?g|png|webp)$/i.test(f.name));
  if (arquivos.length) {
    const nome = arquivos[Math.floor(Math.random() * arquivos.length)].name;
    return json({
      url: db.storage.from("capas-reserva").getPublicUrl(`${p.editoria}/${nome}`).data.publicUrl,
      alt: p.imagem.alt, credito: { fonte: "reserva" }, legenda: "Imagem ilustrativa.", tentativas,
    });
  }
  return json({ erro: "Nenhuma capa disponível. A matéria fica em revisão sem capa.", tentativas }, 502);
});

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
