// Página de tag (/tag/<endereço>): todas as matérias com aquela tag.
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { materiasPorIds } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { Carregando } from "@/components/Cartoes";
import { ListaPaginada } from "@/components/ListaPaginada";
import { EspacoAnuncio } from "@/components/EspacoAnuncio";
import NaoEncontrada from "./NaoEncontrada";

export default function Tag() {
  const { tag = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["tag", tag],
    queryFn: async () => {
      const { data: linhas, error } = await db.rpc("materias_da_tag", { _tag: tag });
      if (error) throw error;
      const rs = (linhas ?? []) as { id: string; tag: string }[];
      return { nome: rs[0]?.tag ?? "", materias: await materiasPorIds([...new Set(rs.map((r) => r.id))]) };
    },
  });
  const nome = data?.nome || tag.replace(/-/g, " ");
  useSeo(data?.materias.length ? { titulo: nome, descricao: `Matérias sobre ${nome} no Pulso Científico.`, url: `/tag/${tag}` } : null);

  if (isLoading) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!data?.materias.length) return <NaoEncontrada texto="Nenhuma matéria com essa tag." />;

  return (
    <section className="view on" id="v-tag" aria-label="Tag">
      <div className="wrap">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<span>{nome}</span></nav>
        <header className="cat-head">
          <span className="eyebrow">Tag</span>
          <h1>{nome}</h1>
          <p className="cat-conta">{data.materias.length} matéria{data.materias.length === 1 ? "" : "s"}</p>
        </header>
        <div className="two-col">
          <div><ListaPaginada key={tag} materias={data.materias} vazio={null} /></div>
          <aside className="sidebar"><div className="sticky"><EspacoAnuncio id="lateral" /></div></aside>
        </div>
      </div>
    </section>
  );
}
