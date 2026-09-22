// Auditoria: quem entrou e o que cada pessoa fez com matérias e acessos. Só o admin.
// Quem grava é o banco (gatilhos em materias, auth.users, user_roles e acessos_autorizados);
// a tela só lê pelas funções auditoria() e auditoria_resumo(). Ver docs/AUDITORIA.md.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useSeo } from "@/lib/seo";
import { PAPEL_NOME, data, quando } from "@/lib/formato";
import { PainelLayout } from "@/components/PainelLayout";

type Tipo = "" | "login" | "materias" | "acessos" | "outros";
interface Linha {
  id: number; criado_em: string; origem: string; acao: string; tabela: string; registros: string[] | null;
  dados: { titulo?: string; status?: string; status_antes?: string; publicada_em?: string; campos?: string[]; email?: string; papel?: string; papel_antes?: string; motivo?: string; decisao?: string; provedor?: string } | null;
  ator: string | null; ator_nome: string | null; ator_email: string | null; ator_papel: string | null;
}
interface Pessoa { user_id: string | null; nome: string | null; email: string; papel: string; ultimo_acesso: string | null }

const POR_VEZ = 50;
const TIPOS: [Tipo, string][] = [["", "Tudo"], ["login", "Entradas"], ["materias", "Matérias"], ["acessos", "Acessos"], ["outros", "Outros"]];
const PERIODOS: [number, string][] = [[1, "Últimas 24 horas"], [7, "Últimos 7 dias"], [30, "Últimos 30 dias"], [90, "Últimos 90 dias"], [365, "Último ano"]];

// O que aparece no selo de cada ação, e a cor do selo
const ACAO: Record<string, [string, string]> = {
  login: ["Entrou", "st-bot"], primeiro_acesso: ["Primeiro acesso", "st-bot"],
  criar: ["Criou rascunho", "st-draft"], editar: ["Editou", "st-rev"], enviar_revisao: ["Enviou para revisão", "st-rev"],
  publicar: ["Publicou", "st-pub"], agendar: ["Agendou", "st-pub"], despublicar: ["Tirou do ar", "st-draft"],
  arquivar: ["Arquivou", "st-draft"], voltar_rascunho: ["Voltou a rascunho", "st-draft"], apagar: ["Apagou", "st-draft"],
  acesso_liberado: ["Liberou acesso", "st-rev"], acesso_alterado: ["Mudou liberação", "st-rev"], autorizacao_cancelada: ["Cancelou liberação", "st-draft"],
  papel_dado: ["Deu papel", "st-rev"], papel_removido: ["Tirou papel", "st-draft"], papel_trocado: ["Trocou papel", "st-rev"],
  descartar: ["Descartou pauta", "st-draft"],
};
const papelTxt = (p?: string | null) => (p ? p.split(",").map((x) => PAPEL_NOME[x] ?? x).join(" · ") : "");

function quem(l: Linha) {
  if (l.origem === "agente") return { nome: "Agente de publicação", sub: "rotina diária do Claude" };
  if (l.origem === "admin-api") return { nome: "Terminal", sub: "API de admin" };
  if (!l.ator) return { nome: "Sistema", sub: "" };
  return { nome: l.ator_nome || l.ator_email || "Conta removida", sub: papelTxt(l.ator_papel) };
}

function Detalhe({ l }: { l: Linha }) {
  const d = l.dados ?? {};
  if (l.tabela === "materias") {
    const id = l.registros?.[0];
    const titulo = d.titulo || "Matéria";
    return (
      <>
        {l.acao !== "apagar" && id ? <Link className="link-sm" to={`/painel/materia/${id}`}>{titulo}</Link> : <b>{titulo}</b>}
        <small>
          {l.acao === "agendar" && d.publicada_em && <>Vai ao ar em {data(d.publicada_em, true)}. </>}
          {!!d.campos?.length && <>Mudou: {d.campos.join(", ")}. </>}
        </small>
      </>
    );
  }
  if (l.acao === "login") return <small>{d.provedor === "google" ? "Pelo Google" : "Login"}{d.email ? ` · ${d.email}` : ""}</small>;
  if (d.email || d.papel) {
    return <small>{d.email}{d.papel && <> · {PAPEL_NOME[d.papel] ?? d.papel}</>}{d.papel_antes && <> (antes: {PAPEL_NOME[d.papel_antes] ?? d.papel_antes})</>}</small>;
  }
  return <small>{[d.titulo, d.motivo].filter(Boolean).join(" — ") || l.tabela}</small>;
}

/** Planilha com o que está carregado na tela (abre no Excel e no Google Planilhas). */
function baixarCsv(linhas: Linha[]) {
  const c = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const corpo = linhas.map((l) => {
    const q = quem(l);
    return [data(l.criado_em, true), q.nome, q.sub, l.ator_email, ACAO[l.acao]?.[0] ?? l.acao, l.dados?.titulo ?? l.dados?.email ?? "",
      l.dados?.campos?.join(", ") ?? "", l.acao === "agendar" ? data(l.dados?.publicada_em, true) : ""].map(c).join(";");
  });
  const csv = "﻿" + ["Quando;Quem;Papel;E-mail;Ação;Matéria ou conta;O que mudou;Vai ao ar em", ...corpo].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `auditoria-pulso-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Tela() {
  const [tipo, setTipo] = useState<Tipo>("");
  const [dias, setDias] = useState(7);
  const [ator, setAtor] = useState("");

  const { data: equipe = [] } = useQuery({
    queryKey: ["acessos"],
    queryFn: async () => { const { data: d, error } = await db.rpc("lista_acessos"); if (error) throw error; return (d ?? []) as Pessoa[]; },
  });
  const pessoas = useMemo(() => {
    const vistos = new Map<string, Pessoa>();
    for (const p of equipe) if (p.user_id && !vistos.has(p.user_id)) vistos.set(p.user_id, p);
    return [...vistos.values()].sort((a, b) => (b.ultimo_acesso ?? "").localeCompare(a.ultimo_acesso ?? ""));
  }, [equipe]);

  const { data: resumo } = useQuery({
    queryKey: ["auditoria-resumo", dias],
    queryFn: async () => ((await db.rpc("auditoria_resumo", { _dias: dias })).data?.[0] ?? null) as
      { entradas: number; pessoas: number; criadas: number; publicadas: number; editadas: number; agendadas_no_ar: number } | null,
  });

  const lista = useInfiniteQuery({
    queryKey: ["auditoria", tipo, dias, ator],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const { data: d, error } = await db.rpc("auditoria", { _tipo: tipo || null, _dias: dias, _ator: ator || null, _antes: pageParam, _limite: POR_VEZ });
      if (error) throw error;
      return (d ?? []) as Linha[];
    },
    getNextPageParam: (ultima) => (ultima.length === POR_VEZ ? ultima[ultima.length - 1].id : undefined),
  });
  const linhas = lista.data?.pages.flat() ?? [];
  const periodo = PERIODOS.find(([d]) => d === dias)?.[1].toLowerCase() ?? "";

  return (
    <>
      <div className="app-top">
        <div><h1>Auditoria</h1><p>Quem entrou e o que cada pessoa fez com matérias e acessos, com dia e hora. Os registros são gravados pelo próprio banco: ninguém consegue apagar ou mudar pelo site.</p></div>
        <button type="button" className="btn-ghost" style={{ height: 40 }} disabled={!linhas.length} onClick={() => baixarCsv(linhas)}>Baixar planilha</button>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Entradas · {periodo}</span><b>{resumo?.entradas ?? "—"}</b></div>
        <div className="kpi"><span>Pessoas que entraram</span><b>{resumo?.pessoas ?? "—"}</b></div>
        <div className="kpi"><span>Publicadas · {periodo}</span><b>{resumo?.publicadas ?? "—"}</b></div>
        <div className="kpi"><span>Agendadas para sair</span><b>{resumo?.agendadas_no_ar ?? "—"}</b></div>
      </div>

      <div className="card-p" style={{ marginBottom: 22 }}>
        <header><h2>Filtrar</h2><span>{linhas.length ? `${linhas.length}${lista.hasNextPage ? "+" : ""} registros` : ""}</span></header>
        <div className="pad">
          <div className="seg" role="radiogroup" aria-label="Tipo de registro" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
            {TIPOS.map(([t, txt]) => <label key={t || "tudo"}><input type="radio" name="aud-tipo" checked={tipo === t} onChange={() => setTipo(t)} />{txt}</label>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <div className="field" style={{ margin: 0 }}><label htmlFor="aud-periodo">Período</label>
              <select className="select" id="aud-periodo" value={dias} onChange={(e) => setDias(+e.target.value)}>
                {PERIODOS.map(([d, txt]) => <option key={d} value={d}>{txt}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label htmlFor="aud-pessoa">Pessoa</label>
              <select className="select" id="aud-pessoa" value={ator} onChange={(e) => setAtor(e.target.value)}>
                <option value="">Toda a equipe</option>
                {pessoas.map((p) => <option key={p.user_id!} value={p.user_id!}>{p.nome || p.email} · {PAPEL_NOME[p.papel] ?? p.papel}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Quando</th><th>Quem</th><th>O que fez</th><th>Detalhe</th></tr></thead>
          <tbody>
            {lista.isLoading ? <tr className="vazio"><td colSpan={4}>Carregando…</td></tr>
              : lista.isError ? <tr className="vazio"><td colSpan={4}>Não deu para carregar a auditoria. Recarregue a página.</td></tr>
              : linhas.length ? linhas.map((l) => {
                const q = quem(l);
                const [txt, cls] = ACAO[l.acao] ?? [l.acao, "st-draft"];
                return (
                  <tr key={l.id}>
                    <td className="num" title={quando(l.criado_em)}>{data(l.criado_em, true)}</td>
                    <td><div className="pessoa"><div><b>{q.nome}</b>{q.sub && <small>{q.sub}</small>}</div></div></td>
                    <td><span className={`status ${cls}`}>{txt}</span></td>
                    <td><div className="pessoa"><div><Detalhe l={l} /></div></div></td>
                  </tr>
                );
              }) : <tr className="vazio"><td colSpan={4}>Nada registrado neste período{ator ? " para essa pessoa" : ""}.</td></tr>}
          </tbody>
        </table>
      </div>
      {lista.hasNextPage && (
        <div className="carregar-mais"><button type="button" className="btn-ghost" disabled={lista.isFetchingNextPage} onClick={() => lista.fetchNextPage()}>
          {lista.isFetchingNextPage ? "Carregando…" : "Carregar mais"}</button></div>
      )}

      <div className="card-p" style={{ marginTop: 22 }}>
        <header><h2>Último acesso da equipe</h2><span>clique para ver só o que a pessoa fez</span></header>
        <div className="tbl-wrap" style={{ border: 0 }}>
          <table className="tbl">
            <thead><tr><th>Pessoa</th><th>Papel</th><th>Última entrada</th></tr></thead>
            <tbody>
              {pessoas.length ? pessoas.map((p) => (
                <tr key={p.user_id!} style={{ cursor: "pointer" }} onClick={() => { setAtor(p.user_id!); setTipo(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <td><div className="pessoa"><div><b>{p.nome || p.email}</b><small>{p.email}</small></div></div></td>
                  <td>{PAPEL_NOME[p.papel] ?? p.papel}</td>
                  <td className="num">{p.ultimo_acesso ? `${data(p.ultimo_acesso, true)} (${quando(p.ultimo_acesso)})` : "Nunca entrou"}</td>
                </tr>
              )) : <tr className="vazio"><td colSpan={3}>Ninguém da equipe entrou ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="panel-note">Leitores comuns não aparecem aqui: só quem tem papel no site (admin, editor, autor e parceiros).</p>
    </>
  );
}

export default function PainelAuditoria() {
  useSeo({ titulo: "Auditoria", url: "/painel/auditoria", semIndice: true });
  return <PainelLayout nivel="admin"><Tela /></PainelLayout>;
}
