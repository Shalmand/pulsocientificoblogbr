// Palavra-chave principal sugerida: pontua expressões de 1 a 4 palavras.
// Peso por onde aparecem: título 5, tags 4, linha fina 3, subtítulos 2, texto 1.
// Expressões com 2 a 4 palavras ganham bônus (são mais buscáveis que palavras soltas).
// Só concorre o que aparece no título, na linha fina ou nas tags; palavra solta precisa se repetir no texto.
import { semAcento } from "./formato";

const PARADAS = new Set(("a o os as um uma uns umas de do da dos das em no na nos nas num numa por pelo pela pelos pelas para pra com sem sob sobre entre ate apos e ou mas nem que se ao aos " +
  "foi era sao ser sera ter tem teve tinha como mais menos muito muita muitos muitas ja nao sim isso esse essa esses essas este esta estes estas aquele aquela seu sua seus suas ele ela eles elas " +
  "quem qual quais quando onde porque tambem so ainda depois antes pode podem vai vao ha cada todo toda todos todas outro outra outros outras mesmo mesma lhe voce " +
  "estudo estudos pesquisa pesquisas pesquisadores participantes participante grupo grupos resultado resultados mostrou mostra mostram diz dizem teste testes " +
  "vez vezes ano anos dia dias semana semanas mes meses hora horas pessoa pessoas novo nova ligado ligada contra casa melhor pior " +
  "usou usar tomar tomou fazer feito feita reduz reduziu aliviou piorou melhorou mudou muda mudar ajuda ajudou saber entenda veja " +
  "pacientes paciente adultos pode podem deve devem alguns algumas maior menor").split(/\s+/));

export function sugerirPalavrasChave(titulo: string, fina: string, corpoHtml: string, tags: string[]): string[] {
  const subt = [...corpoHtml.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map((x) => x[1]).join(". ");
  const corpo = corpoHtml.replace(/<[^>]+>/g, " ");
  const fontes: [string, number][] = [[titulo, 5], [tags.join(". "), 4], [fina, 3], [subt, 2], [corpo, 1]];
  type Cand = { texto: string; n: number; pontos: number; destaque: boolean; noTexto: number };
  const cand = new Map<string, Cand>();
  for (const [texto, peso] of fontes) {
    for (const trecho of String(texto || "").split(/[.,;:!?()"“”\n]+/)) {
      const tk = (trecho.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) || []).map((w) => ({ orig: w.toLowerCase(), base: semAcento(w) }));
      for (let n = 1; n <= 4; n++) for (let i = 0; i + n <= tk.length; i++) {
        const g = tk.slice(i, i + n);
        if (PARADAS.has(g[0].base) || PARADAS.has(g[n - 1].base)) continue;
        if (g.some((t) => /^\d+$/.test(t.base))) continue;
        if (n === 1 && g[0].base.length < 4) continue;
        const chave = g.map((t) => t.base).join(" ");
        const c = cand.get(chave) || { texto: g.map((t) => t.orig).join(" "), n, pontos: 0, destaque: false, noTexto: 0 };
        c.pontos += peso;
        if (peso >= 3) c.destaque = true;
        if (peso === 1) c.noTexto++;
        cand.set(chave, c);
      }
    }
  }
  const bonus: Record<number, number> = { 1: 1, 2: 1.8, 3: 2.2, 4: 2.4 };
  const ordem = [...cand.entries()].map(([k, c]) => ({ k, ...c, nota: c.pontos * bonus[c.n] }))
    .filter((c) => c.destaque && c.pontos >= 6 && (c.n > 1 || c.noTexto >= 2)).sort((a, b) => b.nota - a.nota);
  const escolhidas: typeof ordem = [];
  for (const c of ordem) {
    if (escolhidas.some((e) => (" " + e.k + " ").includes(" " + c.k + " ") || (" " + c.k + " ").includes(" " + e.k + " "))) continue;
    escolhidas.push(c);
    if (escolhidas.length === 5) break;
  }
  return escolhidas.map((c) => c.texto);
}

/** Palavras vetadas pela Resolução CFM 2.336/2023 (promessa e superlativo). */
export const VETADAS = ["cura", "curar", "milagre", "milagroso", "revolucionário", "revolucionária", "garantido", "garantida", "definitivo", "o melhor", "o mais eficaz", "100% eficaz"];
export const achaVetadas = (texto: string) =>
  VETADAS.filter((w) => new RegExp("(^|[^\\p{L}])" + w + "($|[^\\p{L}])", "u").test(texto.toLowerCase()));
