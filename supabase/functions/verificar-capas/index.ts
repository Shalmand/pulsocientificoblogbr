// Função verificar-capas (Supabase Edge Function / Lovable Cloud)
//
// Roda uma vez por semana (agendamento do Supabase ou chamada do agente).
// Confere se as capas que vêm por link externo (Unsplash) ainda abrem.
// Confere as capas que ficam por link (Unsplash e Pexels, que não sobem para o nosso armazenamento).
// Se o fotógrafo apagou a foto, marca a matéria com imagem_quebrada = true,
// e o painel mostra o aviso "Capa fora do ar" para alguém trocar.
//
// Segredo: AGENTE_CHAVE (mesmo do agente).

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.headers.get("x-agente-chave") !== Deno.env.get("AGENTE_CHAVE")) {
    return new Response(JSON.stringify({ erro: "Chave inválida." }), { status: 401 });
  }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: materias, error } = await db.from("materias")
    .select("id, slug, imagem_url, imagem_quebrada")
    .in("imagem_credito->>fonte", ["unsplash", "pexels"]);   // as duas ficam por link
  if (error) return new Response(JSON.stringify({ erro: error.message }), { status: 500 });

  const quebradas: string[] = [];
  for (const m of materias ?? []) {
    let ok = false;
    try {
      const r = await fetch(m.imagem_url, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
      ok = r.ok;
    } catch { /* fora do ar */ }
    if (!ok) quebradas.push(m.slug);
    if (ok === m.imagem_quebrada) {
      await db.from("materias").update({ imagem_quebrada: !ok }).eq("id", m.id);
    }
  }
  return new Response(JSON.stringify({ verificadas: materias?.length ?? 0, quebradas }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
