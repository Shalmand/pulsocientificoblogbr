import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { materiasDe, useCats, usePublicadas } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { db } from "@/lib/db";
import { usePedirLogin } from "@/lib/usePedirLogin";
import { Carregando } from "@/components/Cartoes";
import { ListaPaginada } from "@/components/ListaPaginada";
import { EspacoAnuncio } from "@/components/EspacoAnuncio";
import NaoEncontrada from "./NaoEncontrada";

function BotaoSeguirCategoria({ slug, nome }: { slug: string; nome: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const pedirLogin = usePedirLogin();
  const { data: segue = false } = useQuery({
    queryKey: ["segue-cat", user?.id, slug],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await db.from("seguindo_categoria").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("categoria", slug);
      return !!count;
    },
  });
  const alternar = async () => {
    if (!user) { pedirLogin("seguir uma categoria"); return; }
    const r = segue
      ? await db.from("seguindo_categoria").delete().eq("user_id", user.id).eq("categoria", slug)
      : await db.from("seguindo_categoria").insert({ user_id: user.id, categoria: slug });
    if (r.error) { toast("Não deu certo. Tente de novo."); return; }
    toast(segue ? `Deixou de seguir ${nome}.` : `Você segue ${nome}.`);
    qc.invalidateQueries({ queryKey: ["segue-cat", user.id, slug] });
  };
  return <button type="button" className={`seguir${segue ? " on" : ""}`} id="seguir-cat" onClick={alternar}>{segue ? "Seguindo" : "Seguir"} {nome}</button>;
}

/** Página de categoria em qualquer nível: /saude, /saude/doencas, /saude/doencas/figado */
export default function Categoria({ slugs }: { slugs: string[] }) {
  const cats = useCats();
  const { data: L = [], isLoading } = usePublicadas();
  const lista = slugs.map((s) => cats.acharCat(s));
  const valido = lista.length > 0 && lista.every((c, i) => c && c.ativa && c.nivel === i + 1 && (i === 0 ? !c.pai : c.pai === slugs[i - 1]));
  const atual = valido ? lista[lista.length - 1]! : undefined;
  const topo = valido ? lista[0]! : undefined;

  useSeo(atual ? {
    titulo: atual.nome,
    descricao: atual.descricao || `Tudo sobre ${atual.nome} no Pulso Científico.`,
    url: "/" + cats.caminhoTxt(atual.slug),
  } : null);

  if (!cats.todas.length) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!atual || !topo) return <NaoEncontrada texto="Categoria não encontrada." />;

  const materias = materiasDe(L, atual);
  // Botões: os filhos da página atual; numa microcategoria, as irmãs
  const base = atual.nivel === 3 ? cats.acharCat(atual.pai)! : atual;
  const chips = cats.filhos(base.slug);
  const contar = (s: string) => materiasDe(L, cats.acharCat(s)).length;

  return (
    <section className="view on" id="v-categoria" aria-label="Categoria">
      <div className="wrap" id="categoria-root" style={{ "--c": topo.cor } as React.CSSProperties}>
        <nav className="crumbs" aria-label="Você está em">
          <Link to="/">Início</Link>›
          {lista.map((c, i) => i === lista.length - 1
            ? <span key={c!.slug}>{c!.nome}</span>
            : <span key={c!.slug} style={{ display: "contents" }}><Link to={cats.urlCat(c!.slug)}>{c!.nome}</Link>›</span>)}
        </nav>
        <header className="cat-head">
          <span className="eyebrow">{lista.length > 1 ? lista.slice(0, -1).map((c) => c!.nome).join(" › ") : "Categoria"}</span>
          <h1>{atual.nome}</h1>
          <p className="dek">{atual.descricao || ""}</p>
          <p className="cat-conta">{materias.length} matéria{materias.length === 1 ? "" : "s"}</p>
          <BotaoSeguirCategoria slug={atual.slug} nome={atual.nome} />
        </header>
        {chips.length ? (
          <nav className="cat-subs" aria-label={atual.nivel === 1 ? "Subcategorias" : "Microcategorias"}>
            <Link to={cats.urlCat(base.slug)} aria-current={atual === base ? "page" : undefined}>Tudo em {base.nome} <small>{contar(base.slug)}</small></Link>
            {chips.map((sc) => <Link key={sc.slug} to={cats.urlCat(sc.slug)} aria-current={atual.slug === sc.slug ? "page" : undefined}>{sc.nome} <small>{contar(sc.slug)}</small></Link>)}
          </nav>
        ) : <div className="cat-subs-vazio" />}
        <div className="two-col">
          <div>
            {isLoading ? <Carregando /> : (
              <ListaPaginada key={atual.slug} materias={materias} corCat={topo.cor ?? undefined}
                vazio={<div className="cat-vazio">Ainda não há matérias em {atual.nome}.{atual.nivel > 1 && <><br /><Link to={cats.urlCat(topo.slug)}>Ver tudo em {topo.nome}</Link></>}</div>} />
            )}
          </div>
          <aside className="sidebar"><div className="sticky"><EspacoAnuncio id="lateral" /></div></aside>
        </div>
      </div>
    </section>
  );
}
