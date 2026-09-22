import { fotoAutor } from "@/lib/dados";
import { iniciaisDe } from "@/lib/formato";
import type { Autor } from "@/lib/tipos";

/** Foto redonda com iniciais quando não há foto (classe "avatar" nas listas, "g-avatar" no resto). */
export function Avatar({ nome, foto, classe = "g-avatar" }: { nome: string | null | undefined; foto: string | null | undefined; classe?: string }) {
  return <span className={classe}>{foto ? <img src={foto} alt="" loading="lazy" /> : iniciaisDe(nome)}</span>;
}

/** Foto do autor: a Redação usa o símbolo da marca; nunca a inicial genérica. */
export function AvatarAutor({ autor, classe = "avatar" }: { autor: Partial<Autor> | null | undefined; classe?: string }) {
  const url = fotoAutor(autor as Autor);
  return <span className={classe}>{url ? <img src={url} alt="" loading="lazy" /> : iniciaisDe(autor?.nome || "?")}</span>;
}
