// Comentários da matéria. Quem entra com Google comenta; a moderação decide se aparece na hora.
// Nome e foto de quem comentou vêm da view perfis_publicos (nunca da tabela leitores).
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, msgErro } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { usePedirLogin } from "@/lib/usePedirLogin";
import { tempoRel } from "@/lib/formato";
import type { Comentario, PerfilPublico } from "@/lib/tipos";
import { Avatar } from "./Avatar";

export function useConfigComunidade() {
  return useQuery({
    queryKey: ["comunidade-config"],
    staleTime: 5 * 60e3,
    queryFn: async () => {
      // palavras_bloqueadas não é pública: as colunas vão pelo nome
      const { data } = await db.from("comunidade_config").select("comentarios_ligados, moderacao").eq("id", 1).maybeSingle();
      return (data ?? { comentarios_ligados: true, moderacao: "previa" }) as { comentarios_ligados: boolean; moderacao: "previa" | "posterior" };
    },
  });
}

function FormComentario({ placeholder, acao = "Comentar", inicial = "", onEnviar, onCancelar }: {
  placeholder: string; acao?: string; inicial?: string; onEnviar: (t: string) => Promise<boolean>; onCancelar?: () => void;
}) {
  const { eu } = useAuth();
  const [texto, setTexto] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  return (
    <form className="coment-form" data-form-coment onSubmit={async (e) => {
      e.preventDefault();
      if (texto.trim().length < 2 || enviando) return;
      setEnviando(true);
      const ok = await onEnviar(texto.trim());
      setEnviando(false);
      if (ok) setTexto("");
    }}>
      <Avatar nome={eu.nome} foto={eu.foto} />
      <div className="campo">
        <label className="visually-hidden" htmlFor="cm-texto">Seu comentário</label>
        <textarea id="cm-texto" maxLength={1500} rows={2} placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus={!!onCancelar} />
        <div className="linha">
          <small data-conta-car className={texto.length > 1500 ? "over" : ""}>{texto.length}/1500</small>
          {onCancelar && <button type="button" className="btn-ghost btn-sm" onClick={onCancelar}>Cancelar</button>}
          <button className="btn" type="submit" disabled={enviando}>{acao}</button>
        </div>
      </div>
    </form>
  );
}

export function Comentarios({ materiaId, onMudou }: { materiaId: string; onMudou: () => void }) {
  const { user, ehLogado, eu } = useAuth();
  const toast = useToast();
  const pedirLogin = usePedirLogin();
  const qc = useQueryClient();
  const { data: cfg } = useConfigComunidade();
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["comentarios", materiaId, user?.id],
    queryFn: async () => {
      const { data: lista } = await db.from("comentarios").select("*").eq("materia_id", materiaId).neq("status", "recusado").order("criado_em");
      // a equipe lê tudo pelo RLS, mas na matéria aparece o que o leitor veria: publicados + os seus em análise
      const coms = ((lista ?? []) as Comentario[]).filter((c) => c.status === "publicado" || c.user_id === user?.id);
      const ids = [...new Set(coms.map((c) => c.user_id))];
      const { data: perfis } = ids.length ? await db.from("perfis_publicos").select("*").in("user_id", ids) : { data: [] };
      return { coms, perfis: new Map(((perfis ?? []) as PerfilPublico[]).map((p) => [p.user_id, p])) };
    },
  });
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["comentarios", materiaId] }); onMudou(); };

  const perfil = (uid: string) => {
    if (uid === user?.id) return { nome: eu.nome, foto: eu.foto, autorSlug: eu.autorSlug, selo: eu.selo };
    const p = data?.perfis.get(uid);
    return { nome: p?.nome ?? "Leitor", foto: p?.foto_url ?? null, autorSlug: p?.autor_slug ?? null, selo: p?.equipe ? "Equipe" : p?.autor_slug ? "Autor" : null };
  };

  const comentar = async (texto: string, respondeA: string | null) => {
    if (!user) { pedirLogin("comentar"); return false; }
    const { data: novo, error } = await db.from("comentarios")
      .insert({ materia_id: materiaId, user_id: user.id, texto, responde_a: respondeA }).select("status").single();
    if (error) { toast(msgErro(error)); return false; }
    toast(novo.status === "publicado" ? "Comentário publicado." : "Comentário enviado. Ele aparece depois que a equipe aprovar.");
    setRespondendo(null);
    recarregar();
    return true;
  };

  if (cfg && !cfg.comentarios_ligados) {
    return (
      <section className="coment" id="coment-root" aria-label="Comentários">
        <div className="block-head lg"><h2>Comentários</h2></div>
        <div className="coment-off">Os comentários estão desligados no momento. Você pode falar com a redação pelo e-mail que está na <Link to="/sobre">página Sobre</Link>.</div>
      </section>
    );
  }

  const coms = data?.coms ?? [];
  const publicados = coms.filter((c) => c.status === "publicado").length;
  const raiz = coms.filter((c) => !c.responde_a).sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  const item = (c: Comentario): React.ReactElement => {
    const p = perfil(c.user_id);
    const meu = c.user_id === user?.id;
    const respostas = coms.filter((r) => r.responde_a === c.id);
    return (
      <li className="coment-item" data-coment={c.id} key={c.id}>
        <Avatar nome={p.nome} foto={p.foto} />
        <div className="corpo">
          <div className="coment-topo">
            <b>{p.autorSlug ? <Link to={`/autor/${p.autorSlug}`}>{p.nome}</Link> : p.nome}</b>
            {p.selo && <span className={`coment-selo${p.selo === "Equipe" ? " equipe" : ""}`}>{p.selo}</span>}
            <time dateTime={c.criado_em}>{tempoRel(c.criado_em)}</time>
          </div>
          {editando === c.id ? (
            <FormComentario placeholder="" acao="Salvar" inicial={c.texto} onCancelar={() => setEditando(null)} onEnviar={async (t) => {
              const { data: feito, error } = await db.from("comentarios").update({ texto: t }).eq("id", c.id).select("id");
              if (error || !feito?.length) { toast(error ? msgErro(error) : "Só dá para editar nos primeiros 15 minutos."); return false; }
              toast("Comentário atualizado."); setEditando(null); recarregar(); return true;
            }} />
          ) : <p className="coment-texto">{c.texto}</p>}
          {c.status === "em_analise" && <span className="coment-espera">⏳ Em análise — só você está vendo</span>}
          <div className="coment-acoes">
            {!c.responde_a && <button type="button" onClick={() => (ehLogado ? setRespondendo(c.id) : pedirLogin("responder"))}>Responder</button>}
            {meu ? (
              <>
                <button type="button" onClick={() => setEditando(c.id)}>Editar</button>
                <button type="button" className="perigo" onClick={async () => {
                  const { error } = await db.from("comentarios").delete().eq("id", c.id);
                  if (error) { toast(msgErro(error)); return; }
                  toast("Comentário apagado."); recarregar();
                }}>Apagar</button>
              </>
            ) : (
              <button type="button" onClick={async () => {
                if (!ehLogado) { pedirLogin("denunciar um comentário"); return; }
                const { error } = await db.rpc("denunciar_comentario", { _id: c.id });
                toast(error ? msgErro(error) : "Denúncia enviada. A equipe vai revisar.");
              }}>Denunciar</button>
            )}
          </div>
          {respondendo === c.id && (
            <FormComentario placeholder={`Responder a ${p.nome}`} acao="Responder" onCancelar={() => setRespondendo(null)} onEnviar={(t) => comentar(t, c.id)} />
          )}
          {respostas.length > 0 && <ul className="coment-respostas">{respostas.map(item)}</ul>}
        </div>
      </li>
    );
  };

  return (
    <section className="coment" id="coment-root" aria-label="Comentários">
      <div className="block-head lg"><h2>Comentários{publicados ? ` (${publicados})` : ""}</h2></div>
      <p className="coment-regra">Comentários são de quem escreve. Não publique dados de paciente, diagnóstico, indicação de tratamento nem propaganda — veja os <Link to="/termos-de-uso">termos de uso</Link>.{cfg?.moderacao === "previa" ? " Todo comentário passa pela equipe antes de aparecer." : ""}</p>
      {ehLogado
        ? <FormComentario placeholder="Escreva um comentário sobre a matéria" onEnviar={(t) => comentar(t, null)} />
        : <div className="coment-entrar"><p><b>Entre com a sua conta Google</b> para curtir, salvar e comentar. É de graça e leva um clique.</p><Link className="btn" to="/entrar">Entrar com Google</Link></div>}
      {raiz.length
        ? <ul className="coment-lista">{raiz.map(item)}</ul>
        : <p className="coment-vazio">Nenhum comentário ainda. Seja a primeira pessoa a comentar.</p>}
    </section>
  );
}
