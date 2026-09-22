// Comentários (equipe): aprovar, recusar, bloquear quem abusar e configurar a moderação.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, msgErro } from "@/lib/db";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { urlMateria } from "@/lib/dados";
import { tempoRel } from "@/lib/formato";
import type { Comentario, Leitor, Materia } from "@/lib/tipos";
import { PainelLayout } from "@/components/PainelLayout";
import { Avatar } from "@/components/Avatar";

type Filtro = "em_analise" | "publicado" | "denunciados" | "recusado";
type Item = Comentario & { materia: Pick<Materia, "slug" | "editoria" | "titulo"> | null };

function Tela() {
  const toast = useToast();
  const { ehAdmin } = useAuth();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("em_analise");
  const { data } = useQuery({
    queryKey: ["moderacao"],
    queryFn: async () => {
      const [coms, cfg, palavras] = await Promise.all([
        db.from("comentarios").select("*, materia:materias(slug, editoria, titulo)").order("criado_em", { ascending: false }).limit(500),
        db.from("comunidade_config").select("comentarios_ligados, moderacao").eq("id", 1).maybeSingle(),
        db.rpc("palavras_bloqueadas"),
      ]);
      const lista = (coms.data ?? []) as Item[];
      const ids = [...new Set(lista.map((c) => c.user_id))];
      const { data: leitores } = ids.length ? await db.from("leitores").select("user_id, nome, email, foto_url, bloqueado").in("user_id", ids) : { data: [] };
      return {
        lista,
        leitores: new Map(((leitores ?? []) as Leitor[]).map((l) => [l.user_id, l])),
        cfg: (cfg.data ?? { comentarios_ligados: true, moderacao: "previa" }) as { comentarios_ligados: boolean; moderacao: string },
        palavras: (palavras.data ?? []) as string[],
      };
    },
  });
  const [ligado, setLigado] = useState("1");
  const [moderacao, setModeracao] = useState("previa");
  const [palavras, setPalavras] = useState("");
  useEffect(() => {
    if (!data) return;
    setLigado(data.cfg.comentarios_ligados ? "1" : "0");
    setModeracao(data.cfg.moderacao);
    setPalavras((data.palavras || []).join(", "));
  }, [data?.cfg.comentarios_ligados, data?.cfg.moderacao, (data?.palavras || []).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const recarregar = () => { ["moderacao", "painel-contagens", "comunidade-config"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const salvarCfg = async (l: string, m: string, p: string) => {
    const r = await db.from("comunidade_config").update({
      comentarios_ligados: l === "1", moderacao: m, atualizado_em: new Date().toISOString(),
      palavras_bloqueadas: p.split(",").map((x) => x.trim()).filter(Boolean),
    }).eq("id", 1);
    if (r.error) return toast(msgErro(r.error));
    toast("Configuração de comentários salva."); recarregar();
  };

  const lista = data?.lista ?? [];
  const conta = (s: Filtro) => lista.filter((c) => (s === "denunciados" ? c.denuncias > 0 && c.status !== "recusado" : c.status === s)).length;
  const visiveis = lista.filter((c) => (filtro === "denunciados" ? c.denuncias > 0 && c.status !== "recusado" : c.status === filtro));
  const filtros: [Filtro, string][] = [["em_analise", "Em análise"], ["publicado", "Publicados"], ["denunciados", "Denunciados"], ["recusado", "Recusados"]];

  const agir = async (c: Item, acao: "aprovar" | "recusar" | "bloquear") => {
    const nome = data?.leitores.get(c.user_id)?.nome ?? "Leitor";
    if (acao === "aprovar") {
      const r = await db.from("comentarios").update({ status: "publicado", denuncias: 0 }).eq("id", c.id);
      toast(r.error ? msgErro(r.error) : "Comentário publicado.");
    } else if (acao === "recusar") {
      const r = await db.from("comentarios").update({ status: "recusado" }).eq("id", c.id);
      toast(r.error ? msgErro(r.error) : "Comentário recusado. Só quem escreveu vê o aviso.");
    } else {
      if (!window.confirm(`Impedir ${nome} de comentar?`)) return;
      const { error } = await db.rpc("bloquear_leitor", { _user: c.user_id, _bloquear: true });
      if (error) return toast(msgErro(error));
      await db.from("comentarios").update({ status: "recusado" }).eq("id", c.id);
      toast(`${nome} não pode mais comentar.`);
    }
    recarregar();
  };

  return (
    <>
      <div className="app-top">
        <div><h1>Comentários</h1><p>Leitores entram com a conta Google. Aqui você aprova, recusa e bloqueia quem abusar.</p></div>
      </div>
      <div className="kpis" id="mod-kpis">{filtros.map(([id, t]) => <div className="kpi" key={id}><span>{t}</span><b>{conta(id)}</b></div>)}</div>
      <div className="mod-config">
        <div className="field">
          <label htmlFor="mc-ligado">Comentários no site</label>
          <select className="select" id="mc-ligado" disabled={!ehAdmin} value={ligado} onChange={(e) => { setLigado(e.target.value); salvarCfg(e.target.value, moderacao, palavras); }}>
            <option value="1">Ligados</option><option value="0">Desligados</option>
          </select>
          <small>Desligado, as matérias continuam com curtir e salvar.</small>
        </div>
        <div className="field">
          <label htmlFor="mc-moderacao">Quando o comentário aparece</label>
          <select className="select" id="mc-moderacao" disabled={!ehAdmin} value={moderacao} onChange={(e) => { setModeracao(e.target.value); salvarCfg(ligado, e.target.value, palavras); }}>
            <option value="previa">Depois que você aprovar</option><option value="posterior">Na hora, com revisão depois</option>
          </select>
          <small>Em saúde, aprovar antes evita conselho de tratamento no meio da conversa.</small>
        </div>
        <div className="field">
          <label htmlFor="mc-palavras">Palavras que seguram o comentário</label>
          <input className="input" id="mc-palavras" disabled={!ehAdmin} placeholder="cura, milagre, whatsapp" value={palavras} onChange={(e) => setPalavras(e.target.value)}
            onBlur={() => { if (palavras.split(",").map((x) => x.trim()).filter(Boolean).join(",") !== (data?.palavras || []).join(",")) salvarCfg(ligado, moderacao, palavras); }} />
          <small>Separe por vírgula. O comentário fica em análise em vez de ir ao ar.</small>
        </div>
      </div>
      <div className="mod-filtros" role="group" aria-label="Filtrar comentários">
        {filtros.map(([id, t]) => <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t} <span>{conta(id)}</span></button>)}
      </div>
      <div className="mod-lista">
        {visiveis.length ? visiveis.map((c) => {
          const l = data?.leitores.get(c.user_id);
          return (
            <article key={c.id} className={`mod-item${c.denuncias ? " denunciado" : ""}`}>
              <div>
                <div className="quem"><Avatar nome={l?.nome} foto={l?.foto_url} /><div><b>{l?.nome ?? "Leitor"}</b>{l?.bloqueado && <span className="status st-draft" style={{ marginLeft: 8 }}>bloqueado</span>}<br /><small>{l?.email ?? ""} · {tempoRel(c.criado_em)}</small></div></div>
                <p>{c.texto}</p>
                <div className="onde">em {c.materia ? <Link to={urlMateria(c.materia)}>{c.materia.titulo}</Link> : "matéria removida"}{c.denuncias ? <> · <b style={{ color: "var(--danger)" }}>{c.denuncias} denúncia{c.denuncias > 1 ? "s" : ""}</b></> : null}{c.responde_a ? " · resposta" : ""}</div>
              </div>
              <div className="mod-acoes">
                {c.status !== "publicado" && <button className="btn" type="button" onClick={() => agir(c, "aprovar")}>Aprovar</button>}
                {c.status !== "recusado" && <button className="btn-ghost" type="button" onClick={() => agir(c, "recusar")}>Recusar</button>}
                {!l?.bloqueado && <button className="btn-ghost btn-perigo" type="button" onClick={() => agir(c, "bloquear")}>Bloquear leitor</button>}
              </div>
            </article>
          );
        }) : <p className="conta-vazio">Nada por aqui.</p>}
      </div>
    </>
  );
}

export default function Comentarios() {
  useSeo({ titulo: "Comentários", url: "/painel/comentarios", semIndice: true });
  return <PainelLayout nivel="staff"><Tela /></PainelLayout>;
}
