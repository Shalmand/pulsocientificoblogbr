// Pedaços que se repetem nas listas de matérias (mesmas classes do protótipo).
import { Link } from "react-router-dom";
import { maisEspecifica, tamanhoImagem, urlMateria, useCats } from "@/lib/dados";
import { quando } from "@/lib/formato";
import type { Materia } from "@/lib/tipos";
import { AvatarAutor } from "./Avatar";

export const Capa = ({ m, largura = 640, prioridade = false }: { m: Pick<Materia, "imagem_url">; largura?: number; prioridade?: boolean }) =>
  m.imagem_url ? <img src={tamanhoImagem(m.imagem_url, largura)} alt="" loading={prioridade ? "eager" : "lazy"} decoding="async" /> : null;

export function Cat({ m, link = false }: { m: Pick<Materia, "editoria">; link?: boolean }) {
  const cats = useCats();
  const estilo = { "--c": cats.corCat(m.editoria) } as React.CSSProperties;
  return link
    ? <Link className="cat" to={cats.urlCat(m.editoria)} style={estilo}>{cats.nomeCat(m.editoria)}</Link>
    : <span className="cat" style={estilo}>{cats.nomeCat(m.editoria)}</span>;
}

export function CatTxt({ m, especifica = false, cor }: { m: Pick<Materia, "editoria" | "subcategoria" | "microcategoria">; especifica?: boolean; cor?: string }) {
  const cats = useCats();
  const slug = especifica ? maisEspecifica(m) : m.editoria;
  return <span className="cat-text" style={{ "--c": cor || cats.corCat(m.editoria) } as React.CSSProperties}>{cats.nomeCat(slug)}</span>;
}

export function Meta({ m, comAutor = true }: { m: Materia; comAutor?: boolean }) {
  return (
    <div className="meta">
      {comAutor && <><AvatarAutor autor={m.autor} /><b>{m.autor?.nome}</b><span className="dot" /></>}
      {quando(m.publicada_em, true)}
    </div>
  );
}

/** Item grande de lista (home "Leia também", categoria). */
export function ItemLista({ m, corCat }: { m: Materia; corCat?: string }) {
  return (
    <Link to={urlMateria(m)} className="lb">
      <div className="media"><Capa m={m} /></div>
      <div>
        <CatTxt m={m} especifica={!!corCat} cor={corCat} />
        <h3 className="ttl">{m.titulo}</h3>
        <p>{m.linha_fina}</p>
        <Meta m={m} />
      </div>
    </Link>
  );
}

export function Tile({ m, rotulo }: { m: Materia; rotulo?: React.ReactNode }) {
  return (
    <Link to={urlMateria(m)} className="tile">
      <div className="media"><Capa m={m} /></div>
      {rotulo ?? <CatTxt m={m} />}
      <h3 className="ttl">{m.titulo}</h3>
      <div className="meta">{quando(m.publicada_em, true)}</div>
    </Link>
  );
}

export const Carregando = () => <p className="carregando" style={{ padding: "60px 0", color: "var(--muted)" }}>Carregando…</p>;
