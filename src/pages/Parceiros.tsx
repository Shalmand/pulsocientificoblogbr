import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useSeo } from "@/lib/seo";
import { iniciaisDe } from "@/lib/formato";
import { Redes } from "@/lib/redes";
import type { Autor } from "@/lib/tipos";

function Cartao({ a }: { a: Autor }) {
  return (
    <article className="parceiro-card">
      <div className="logo-empresa">{a.foto_url ? <img src={a.foto_url} alt="" /> : iniciaisDe(a.nome)}</div>
      <div><h3><Link to={`/autor/${a.slug}`}>{a.nome}</Link></h3>{a.formacao && <span className="ramo">{a.formacao}</span>}</div>
      <p>{a.bio || ""}</p>
      <Redes links={a.links} classe="redes mini" />
    </article>
  );
}

export default function Parceiros() {
  useSeo({ titulo: "Empresas parceiras", descricao: "Organizações e empresas que publicam no Pulso Científico, sempre identificadas na matéria.", url: "/parceiros" });
  const { data: lista = [] } = useQuery({
    queryKey: ["parceiros"],
    queryFn: async () => {
      const { data } = await db.from("autores").select("*").in("tipo", ["organizacao", "publicidade"]).eq("ativo", true).order("nome");
      return (data ?? []) as Autor[];
    },
  });
  const grupo = (tipo: string, titulo: string, texto: React.ReactNode) => {
    const itens = lista.filter((a) => a.tipo === tipo);
    if (!itens.length) return null;
    return (
      <section className="section"><div className="block-head lg"><h2>{titulo}</h2></div>
        <p className="parceiros-texto">{texto}</p>
        <div className="parceiros-grade">{itens.map((a) => <Cartao key={a.id} a={a} />)}</div></section>
    );
  };
  const org = grupo("organizacao", "Organizações parceiras", "Blogs, grupos de pesquisa, institutos e veículos que produzem conteúdo próprio, sem fim comercial. As matérias deles aparecem marcadas como parceria editorial.");
  const pub = grupo("publicidade", "Empresas de publicidade", <>Agências, anunciantes e marcas. Tudo o que assinam sai marcado como <b>Publicidade</b> e não passa pela redação.</>);
  return (
    <section className="view on" id="v-parceiros" aria-label="Empresas parceiras">
      <div className="wrap">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<span>Parceiros</span></nav>
        <header className="post-head pagina-head">
          <span className="eyebrow">Institucional</span>
          <h1>Empresas parceiras</h1>
          <p className="dek">Quem publica no Pulso Científico além da redação e dos autores convidados. Cada tipo de parceria aparece identificada na matéria, para o leitor saber de onde veio o texto. Quer entrar nessa lista? <Link to="/parceria">Conte quem você é</Link>.</p>
        </header>
        <div id="parceiros-lista">{org || pub ? <>{org}{pub}</> : <p className="conta-vazio">Ainda não há empresas parceiras publicando no site.</p>}</div>
      </div>
    </section>
  );
}
