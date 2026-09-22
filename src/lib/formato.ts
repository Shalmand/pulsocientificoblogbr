// Datas, nomes e endereços — as mesmas regras do protótipo.

const p2 = (n: number) => String(n).padStart(2, "0");

/** 17/09/2026 ou 17/09/2026 14:30, sempre no horário de Brasília (UTC-3). */
export function data(iso: string | null | undefined, hora = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  const br = new Date(d.getTime() - 3 * 3600e3);
  return `${p2(br.getUTCDate())}/${p2(br.getUTCMonth() + 1)}/${br.getUTCFullYear()}` +
    (hora ? ` ${p2(br.getUTCHours())}:${p2(br.getUTCMinutes())}` : "");
}

/** Data simples (AAAA-MM-DD) não passa pelo fuso: senão 01/11 vira 31/10. */
export const dataCurta = (d: string | null | undefined) => (d ? d.split("-").reverse().join("/") : "…");

/** "há 3 h" nas primeiras 24 horas, "ontem" no dia seguinte, data cheia depois. */
export function quando(iso: string | null | undefined, curto = false): string {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.round(min / 60)} h`;
  if (min < 48 * 60) return curto ? "ontem" : `ontem, ${data(iso, true).split(" ")[1]}`;
  return data(iso);
}

/** Tempo relativo dos comentários e candidaturas: "há 2 dias" até uma semana. */
export function tempoRel(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d < 7 ? `há ${d} dia${d > 1 ? "s" : ""}` : data(iso);
}

export const iniciaisDe = (n: string | null | undefined) =>
  (n || "?").trim().split(/\s+/).filter((x) => x.length > 2 || /^[A-ZÁ-Ú]/.test(x)).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "?";

export const semAcento = (t: string | null | undefined) =>
  String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const slugificar = (t: string) => semAcento(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const hojeIso = () => new Date().toISOString().slice(0, 10);

export const emailValido = (e: string) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e);

export const UFS_BR = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

export const PAPEL_NOME: Record<string, string> = {
  admin: "Admin", editor: "Editor", autor_medico: "Autor médico", autor: "Autor",
  parceiro: "Organização parceira", parceiro_publicidade: "Empresa de publicidade", leitor: "Leitor",
};

export const CRM_NOME: Record<string, string> = {
  nao_aplica: "—", pendente: "A conferir", verificado: "Verificado no CFM",
  divergente: "Nome divergente", nao_encontrado: "Não encontrado", conferido_a_mao: "Conferido pelo admin",
};

export const STATUS: Record<string, [string, string]> = {
  rascunho: ["st-draft", "Rascunho"], em_revisao: ["st-rev", "Em revisão"],
  publicada: ["st-pub", "Publicada"], arquivada: ["st-draft", "Arquivada"],
};
