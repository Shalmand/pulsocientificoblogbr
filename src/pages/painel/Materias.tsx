import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { COLUNAS_LISTA, urlMateria, useCats } from "@/lib/dados";
import { STATUS, data } from "@/lib/formato";
import type { Materia } from "@/lib/tipos";
import { PainelLayout } from "@/components/PainelLayout";
import { Capa } from "@/components/Cartoes";

interface Registro { id: number; criado_em: string; acao: string; registros: string[]; dados: { titulo?: string; motivo?: string; decisao?: string } | null }

/** O que a rotina diária do Claude fez por último (as funções do site registram em admin_log; só o admin lê). */
function Agente() {
  const { data: registros = [] } = useQuery({
    queryKey: ["agente-registros"],
    queryFn: async () => ((await db.from("admin_log").select("id, criado_em, acao, registros, dados").eq("origem", "agente").order("criado_em", { ascending: false }).limit(5)).data ?? []) as Registro[],
  });
  const rotulo = (r: Registro) => (r.acao === "publicar" ? "Publicada" : r.acao === "agendar" ? "Agendada" : r.acao === "descartar" ? (r.dados?.decisao === "reprovado_checagem" ? "Reprovada na checagem" : "Pauta descartada") : "Criada para revisão");
  return (
    <div className="card-p" style={{ marginTop: 22 }}>
      <header><h2>Agente de publicação</h2><span>rotina diária do Claude · últimos registros</span></header>
      <div className="pad">
        {registros.length ? (
          <ul className="gate-list" style={{ margin: 0 }}>
            {registros.map((r) => {
              const ok = r.acao !== "descartar";
              return (
                <li key={r.id} className={ok ? "ok" : "bad"}>
                  <i /><span><b>{data(r.criado_em, true)} · <span className={`status ${r.acao === "publicar" ? "st-pub" : ok ? "st-rev" : "st-draft"}`}>{rotulo(r)}</span></b>
                    <em>{ok && r.registros?.[0] ? <Link className="link-sm" to={`/painel/materia/${r.registros[0]}`}>{r.dados?.titulo}</Link> : [r.dados?.titulo, r.dados?.motivo].filter(Boolean).join(" — ")}</em></span>
                </li>
              );
            })}
          </ul>
        ) : <p className="conta-vazio" style={{ margin: 0 }}>A rotina ainda não enviou nada. Ela roda no app do Claude, no computador do dono do site (ver README, passo "Agente de publicação").</p>}
      </div>
    </div>
  );
}

function Lista() {
  const { ehStaff, ehAdmin, autor } = useAuth();
  const cats = useCats();
  const [params, setParams] = useSearchParams();
  const filtro = params.get("status");
  const { data: todas = [] } = useQuery({
    queryKey: ["painel-materias", ehStaff, autor?.id],
    queryFn: async () => {
      let q = db.from("materias").select(COLUNAS_LISTA).order("publicada_em", { ascending: false, nullsFirst: true }).order("atualizada_em", { ascending: false }).limit(500);
      if (!ehStaff) q = q.eq("autor_id", autor?.id ?? "");
      const { data: linhas } = await q;
      return (linhas ?? []) as unknown as Materia[];
    },
  });
  const L = filtro ? todas.filter((m) => m.status === filtro) : todas;
  const n = (s: string) => todas.filter((m) => m.status === s).length;

  return (
    <>
      <div className="app-top">
        <div><h1>Matérias</h1><p>{ehStaff ? "Todas as matérias do site. Clique em Editar para abrir no editor." : "As suas matérias. Clique em Editar para abrir no editor."}</p></div>
        <Link to="/painel/nova" className="btn" style={{ height: 40 }}>Nova matéria</Link>
      </div>
      <div className="kpis" id="painel-kpis">
        {([["Publicadas", "publicada"], ["Em revisão", "em_revisao"], ["Rascunhos", "rascunho"], ["Arquivadas", "arquivada"]] as const).map(([t, s]) => (
          <button type="button" key={s} className="kpi" style={{ textAlign: "left", cursor: "pointer", outline: filtro === s ? "2px solid var(--brand)" : undefined }}
            onClick={() => setParams(filtro === s ? {} : { status: s })} aria-pressed={filtro === s}><span>{t}</span><b>{n(s)}</b></button>
        ))}
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Matéria</th><th>Autor</th><th>Status</th><th>Publicada</th><th className="num">Leituras</th><th></th></tr></thead>
          <tbody id="painel-lista">
            {L.length ? L.map((m) => {
              const [cls, txt] = STATUS[m.status];
              return (
                <tr key={m.id}>
                  <td><div className="pessoa"><div className="thumb"><Capa m={m} largura={160} /></div><div><b>{m.titulo}</b><small>{[m.editoria, m.subcategoria, m.microcategoria].filter(Boolean).map((x) => cats.nomeCat(x)).join(" › ")} · {m.tipo === "artigo" ? "Artigo do autor" : `Estudo${m.fonte?.pmid ? ` · PMID ${m.fonte.pmid}` : m.fonte?.doi ? ` · DOI ${m.fonte.doi}` : ""}`}</small></div></div></td>
                  <td>{m.autor?.nome}</td>
                  <td><span className={`status ${cls}`}>{m.status === "publicada" && m.publicada_em && new Date(m.publicada_em) > new Date() ? "Agendada" : txt}</span>{m.origem === "agente" && <small className="crm-num" style={{ display: "block" }}>pelo agente</small>}</td>
                  <td className="num">{m.publicada_em ? data(m.publicada_em, true) : "—"}</td>
                  <td className="num">{m.status === "publicada" ? (m.leituras_qtd ?? 0).toLocaleString("pt-BR") : "—"}</td>
                  <td className="acts"><Link className="btn btn-sm" to={`/painel/materia/${m.id}`}>Editar</Link><Link className="btn-ghost btn-sm" to={urlMateria(m)}>Ver</Link></td>
                </tr>
              );
            }) : <tr className="vazio"><td colSpan={6}>{filtro ? "Nada com esse status." : <>Você ainda não tem matérias. <Link className="link-sm" to="/painel/nova">Criar a primeira</Link></>}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="panel-note">Salvar grava direto no banco e a matéria muda no ar, sem mexer no código.</p>
      {ehAdmin && <Agente />}
    </>
  );
}

export default function PainelMaterias() {
  useSeo({ titulo: "Painel", url: "/painel", semIndice: true });
  return <PainelLayout><Lista /></PainelLayout>;
}
