// Consultas públicas e regras de categoria. Tudo passa pelo RLS do banco.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "./db";
import type { Autor, Categoria, Materia } from "./tipos";

/** Colunas das listas de matérias (sem o corpo, que só a página da matéria precisa). */
export const COLUNAS_LISTA =
  "id, slug, tipo, editoria, subcategoria, microcategoria, titulo, linha_fina, imagem_url, imagem_alt, imagem_credito, publicada_em, corrigida_em, tempo_leitura, status, curtidas_qtd, comentarios_qtd, leituras_qtd, seo, fonte, origem, autor_id, autor:autores(id, slug, nome, tipo, foto_url, crm, crm_uf, especialidade, rqe)";

export function useCategoriasBrutas() {
  return useQuery({
    queryKey: ["categorias"],
    staleTime: 5 * 60e3,
    queryFn: async () => {
      const { data, error } = await db.from("categorias").select("*").order("nivel").order("ordem");
      if (error) throw error;
      return (data ?? []) as Categoria[];
    },
  });
}

export interface Cats {
  todas: Categoria[];
  acharCat: (s: string | null | undefined) => Categoria | undefined;
  filhos: (pai: string | null, todas?: boolean) => Categoria[];
  principais: (todas?: boolean) => Categoria[];
  raizDe: (s: string | null | undefined) => Categoria | undefined;
  caminhoDe: (s: string | null | undefined) => Categoria[];
  urlCat: (s: string) => string;
  caminhoTxt: (s: string) => string;
  corCat: (s: string | null | undefined) => string;
  nomeCat: (s: string | null | undefined) => string;
}

export function montarCats(todas: Categoria[]): Cats {
  const mapa = new Map(todas.map((c) => [c.slug, c]));
  const acharCat = (s: string | null | undefined) => (s ? mapa.get(s) : undefined);
  const filhos = (pai: string | null, incluirOcultas = false) =>
    todas.filter((c) => c.pai === pai && (incluirOcultas || c.ativa)).sort((a, b) => a.ordem - b.ordem);
  const raizDe = (s: string | null | undefined) => { let c = acharCat(s); while (c?.pai) c = acharCat(c.pai); return c; };
  const caminhoDe = (s: string | null | undefined) => {
    const r: Categoria[] = []; let c = acharCat(s);
    while (c) { r.unshift(c); c = c.pai ? acharCat(c.pai) : undefined; }
    return r;
  };
  const caminhoTxt = (s: string) => caminhoDe(s).map((c) => c.slug).join("/");
  return {
    todas, acharCat, filhos, raizDe, caminhoDe, caminhoTxt,
    principais: (incluirOcultas = false) => filhos(null, incluirOcultas),
    urlCat: (s) => "/" + caminhoTxt(s),
    corCat: (s) => raizDe(s)?.cor || "#0E9F6E",
    nomeCat: (s) => acharCat(s)?.nome || s || "",
  };
}

export function useCats(): Cats {
  const { data } = useCategoriasBrutas();
  return useMemo(() => montarCats(data ?? []), [data]);
}

export function usePublicadas() {
  return useQuery({
    queryKey: ["publicadas"],
    staleTime: 60e3,
    queryFn: async () => {
      const { data, error } = await db.from("materias").select(COLUNAS_LISTA)
        .eq("status", "publicada").lte("publicada_em", new Date().toISOString())
        .order("publicada_em", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Materia[];
    },
  });
}

export const urlMateria = (m: Pick<Materia, "editoria" | "slug">) => `/${m.editoria}/${m.slug}`;
export const maisEspecifica = (m: Pick<Materia, "editoria" | "subcategoria" | "microcategoria">) => m.microcategoria || m.subcategoria || m.editoria;

/** Busca matérias pelos ids, na ordem dada (resultado de busca, tag, novidades). */
export async function materiasPorIds(ids: string[]): Promise<Materia[]> {
  if (!ids.length) return [];
  const { data } = await db.from("materias").select(COLUNAS_LISTA).in("id", ids);
  const mapa = new Map(((data ?? []) as unknown as Materia[]).map((m) => [m.id, m]));
  return ids.map((id) => mapa.get(id)).filter(Boolean) as Materia[];
}

export const urlTag = (tag: string) => "/tag/" + tag.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Matérias publicadas de uma categoria em qualquer nível. */
export function materiasDe(lista: Materia[], cat: Categoria | undefined) {
  if (!cat) return [];
  const campo = ({ 1: "editoria", 2: "subcategoria", 3: "microcategoria" } as const)[cat.nivel];
  return lista.filter((m) => m[campo] === cat.slug);
}

// ---------- Autores ----------
/** A redação não tem foto de pessoa: usa o símbolo da marca. Quem tem foto, usa a foto. */
export const fotoAutor = (a: Pick<Autor, "foto_url" | "tipo"> | null | undefined) =>
  a?.foto_url || (a?.tipo === "redacao" ? "/marca/pulso-simbolo.svg" : null);

export const TIPOS_EMPRESA = ["organizacao", "publicidade"];
export const ehEmpresaPerfil = (a: Pick<Autor, "tipo"> | null | undefined) => TIPOS_EMPRESA.includes(a?.tipo ?? "");
export const ehPubli = (a: Pick<Autor, "tipo"> | null | undefined) => a?.tipo === "publicidade";
export const rotuloPerfil = (a: Pick<Autor, "tipo"> | null | undefined) =>
  ({ publicidade: "Empresa de publicidade", organizacao: "Organização parceira", medico: "Médico parceiro", redacao: "Equipe editorial" } as Record<string, string>)[a?.tipo ?? ""] || "Autor";
export const registro = (a: Partial<Autor> | null | undefined) =>
  a && a.tipo === "medico" && a.crm ? `CRM-${a.crm_uf} ${a.crm}${a.especialidade ? ` · ${a.especialidade} · RQE ${a.rqe}` : ""}` : "";

// ---------- Capa e crédito ----------
const NOME_FONTE: Record<string, string> = { pexels: "Pexels", pixabay: "Pixabay", unsplash: "Unsplash" };
export function legendaCapa(cr: Materia["imagem_credito"]): string {
  if (!cr) return "Imagem ilustrativa.";
  if (cr.fonte === "unsplash") return `Foto de ${cr.autor} no Unsplash.`;
  if (cr.fonte && NOME_FONTE[cr.fonte]) return `Foto: ${cr.autor} / ${NOME_FONTE[cr.fonte]}.`;
  if (cr.fonte === "upload") return `Foto: ${cr.autor || "Arquivo do autor"}.`;
  return "Imagem ilustrativa.";
}
export const nomeFonteFoto = (f?: string) => (f ? NOME_FONTE[f] : undefined);

/**
 * Capa no tamanho certo: Pexels e Unsplash entregam a mesma foto redimensionada pelo endereço.
 * Nas listas vai uma versão pequena; na matéria, a grande. Imagens do nosso armazenamento ficam como estão.
 */
export function tamanhoImagem(url: string | null | undefined, largura: number): string {
  if (!url) return "";
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname === "images.pexels.com") {
      u.search = "";
      u.searchParams.set("auto", "compress"); u.searchParams.set("cs", "tinysrgb"); u.searchParams.set("w", String(largura));
      return u.toString();
    }
    if (u.hostname === "images.unsplash.com") {
      u.searchParams.set("w", String(largura)); u.searchParams.set("q", "75"); u.searchParams.set("auto", "format");
      return u.toString();
    }
  } catch { /* endereço relativo ou inválido: usa como veio */ }
  return url;
}

/** Endereço absoluto (Open Graph e JSON-LD pedem URL completa). */
export const SITE = {
  nome: "Pulso Científico",
  dominio: ((import.meta.env.VITE_SITE_URL as string) || "https://pulsocientifico.com.br").replace(/\/+$/, ""),
};
export const absoluta = (u: string | null | undefined) => (!u ? "" : /^https?:/i.test(u) ? u : SITE.dominio + (u.startsWith("/") ? u : "/" + u));
