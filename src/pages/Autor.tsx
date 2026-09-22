import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { COLUNAS_LISTA, ehEmpresaPerfil, fotoAutor, rotuloPerfil } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { usePedirLogin } from "@/lib/usePedirLogin";
import { iniciaisDe } from "@/lib/formato";
import { Redes } from "@/lib/redes";
import type { Autor as TAutor, Materia } from "@/lib/tipos";
import { Carregando, Tile } from "@/components/Cartoes";
import NaoEncontrada from "./NaoEncontrada";

export default function Autor() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const pedirLogin = usePedirLogin();
  const qc = useQueryClient();
  const [mostrar, setMostrar] = useState(20);
  const { data, isLoading } = useQuery({
    queryKey: ["autor", slug, user?.id],
    queryFn: async () => {
      const { data: a } = await db.from("autores").select("*").eq("slug", slug).maybeSingle();
      if (!a) return null;
      const [ms, seg, meu] = await Promise.all([
        db.from("materias").select(COLUNAS_LISTA).eq("autor_id", a.id).eq("status", "publicada").lte("publicada_em", new Date().toISOString()).order("publicada_em", { ascending: false }),
        db.from("seguindo_autor").select("*", { count: "exact", head: true }).eq("autor_id", a.id),
        user ? db.from("seguindo_autor").select("*", { count: "exact", head: true }).eq("autor_id", a.id).eq("user_id", user.id) : Promise.resolve({ count: 0 }),
      ]);
      return { a: a as TAutor, lista: (ms.data ?? []) as unknown as Materia[], seguidores: seg.count ?? 0, sigo: !!meu.count };
    },
  });
  const a = data?.a;
  useSeo(a ? { titulo: a.nome, descricao: a.bio || `${rotuloPerfil(a)} no Pulso Científico.`, url: `/autor/${a.slug}`, imagem: fotoAutor(a),
    dados: { "@context": "https://schema.org", "@type": a.tipo === "redacao" || ehEmpresaPerfil(a) ? "Organization" : "Person", name: a.nome, description: a.bio } } : null);

  if (isLoading) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!a || !data) return <NaoEncontrada texto="Perfil não encontrado." />;

  const { lista, seguidores, sigo } = data;
  const eds = new Set(lista.map((m) => m.editoria)).size;
  const medico = a.tipo === "medico", empresa = ehEmpresaPerfil(a);
  const foto = fotoAutor(a);
  const desde = new Date(a.criado_em).getFullYear();

  const seguir = async () => {
    if (!user) { pedirLogin("seguir um autor"); return; }
    const r = sigo
      ? await db.from("seguindo_autor").delete().eq("user_id", user.id).eq("autor_id", a.id)
      : await db.from("seguindo_autor").insert({ user_id: user.id, autor_id: a.id });
    if (r.error) { toast("Não deu certo. Tente de novo."); return; }
    toast(sigo ? `Deixou de seguir ${a.nome}.` : `Você segue ${a.nome}.`);
    qc.invalidateQueries({ queryKey: ["autor", slug] });
  };

  return (
    <section className="view on" id="v-autor" aria-label="Página do autor">
      <div className="wrap" id="autor-root">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<Link to="/">Autores</Link>›<span>{a.nome}</span></nav>
        <header className="author-hero">
          {foto
            ? <div className={`author-photo${a.tipo === "redacao" && !a.foto_url ? " redacao" : ""}`}><img src={foto} alt="" width={1080} height={1080} /></div>
            : <div className={`author-photo ${empresa ? "empresa" : "iniciais"}`}>{iniciaisDe(a.nome)}</div>}
          <div>
            <span className="cat-text">{rotuloPerfil(a)}</span>
            <h1>{a.nome}</h1>
            {medico && a.crm && <div className="creds"><span className="cred">CRM-{a.crm_uf} {a.crm}</span>{a.especialidade && <span className="cred">{a.especialidade} · RQE {a.rqe}</span>}</div>}
            {a.formacao && !medico && <div className="creds"><span className="cred">{a.formacao}</span></div>}
            <p>{a.bio}</p>
            <Redes links={a.links} />
            <div className="author-acoes"><button type="button" className={`seguir${sigo ? " on" : ""}`} id="seguir-autor" onClick={seguir}>{sigo ? "Seguindo" : "Seguir"}</button></div>
          </div>
          <div className="author-stats">
            <div><b>{seguidores}</b><span>seguidores</span></div>
            <div><b>{lista.length}</b><span>matérias publicadas</span></div>
            <div><b>{eds}</b><span>editorias</span></div>
            <div><b>{desde}</b><span>no Pulso desde</span></div>
          </div>
        </header>
        <section className="section">
          <div className="block-head lg"><h2>Matérias de {a.nome}</h2></div>
          <div className="grid5">{lista.length ? lista.slice(0, mostrar).map((m) => <Tile key={m.id} m={m} />) : <p>Nenhuma matéria publicada ainda.</p>}</div>
          {lista.length > mostrar && <div className="carregar-mais"><button type="button" className="btn-ghost" onClick={() => setMostrar((n) => n + 20)}>Carregar mais <small>({lista.length - mostrar})</small></button></div>}
        </section>
      </div>
    </section>
  );
}
