// Acessos (admin): perfis de redação, candidaturas, liberar Gmail e quem tem acesso.
// Não existe pedido de acesso: o admin cadastra o Gmail e, no primeiro login, a pessoa já entra
// com o papel e com o perfil de autor pronto.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, msgErro } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { useCats, fotoAutor } from "@/lib/dados";
import { CRM_NOME, PAPEL_NOME, data, emailValido, iniciaisDe, slugificar, tempoRel } from "@/lib/formato";
import { CamposRedes, lerRedes, urlRede } from "@/lib/redes";
import { enviar, lerComoDataUrl, quadrado } from "@/lib/arquivos";
import type { Autor, Links, Papel } from "@/lib/tipos";
import { PainelLayout } from "@/components/PainelLayout";
import { Avatar } from "@/components/Avatar";

interface Acesso { user_id: string | null; email: string; nome: string | null; papel: Papel; autor_id: string | null; autor_slug: string | null; crm: string | null; crm_uf: string | null; crm_situacao: string; cadastro_completo: boolean; ultimo_acesso: string | null }
interface Candidatura { id: string; nome: string; email: string; perfil: string; areas: string[]; sobre: string; link: string | null; crm: string | null; crm_uf: string | null; status: string; criado_em: string }

const PERFIL_CANDIDATURA: Record<string, string> = { autor: "Autor — escreve em tudo, menos Saúde", autor_medico: "Autor médico — escreve também em Saúde", organizacao: "Organização parceira", publicidade: "Empresa de publicidade" };
const PAPEIS_TELA: Papel[] = ["autor", "autor_medico", "parceiro", "parceiro_publicidade", "editor"];
const NOME_PAPEL_SELECT: Record<string, string> = { autor: "Autor", autor_medico: "Autor médico", parceiro: "Organização parceira", parceiro_publicidade: "Empresa de publicidade", editor: "Editor" };

function Redacoes() {
  const toast = useToast();
  const qc = useQueryClient();
  const arquivo = useRef<HTMLInputElement>(null);
  const { data: lista = [] } = useQuery({
    queryKey: ["redacoes"],
    queryFn: async () => {
      const { data: autores } = await db.from("autores").select("*").eq("tipo", "redacao").order("criado_em");
      const contas = await Promise.all(((autores ?? []) as Autor[]).map((a) => db.from("materias").select("*", { count: "exact", head: true }).eq("autor_id", a.id).eq("status", "publicada")));
      return ((autores ?? []) as Autor[]).map((a, i) => ({ ...a, publicou: contas[i].count ?? 0 }));
    },
  });
  const [editando, setEditando] = useState<string | null>(null); // id ou "nova"
  const [f, setF] = useState({ nome: "", bio: "", padrao: false, foto: null as string | null });
  const [redes, setRedes] = useState<Links>({});
  const [erroRede, setErroRede] = useState<string | null>(null);
  const atual = lista.find((a) => a.id === editando);
  const abrir = (id: string) => {
    const a = lista.find((x) => x.id === id);
    setEditando(id);
    setF({ nome: a?.nome ?? "", bio: a?.bio ?? "", padrao: !!a?.agente_padrao, foto: a?.foto_url ?? null });
    setRedes(a?.links ?? {});
    setErroRede(null);
  };
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["redacoes"] }); qc.invalidateQueries({ queryKey: ["publicadas"] }); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = f.nome.trim(), bio = f.bio.trim();
    if (nome.length < 4) return toast("Dê um nome ao perfil (ex.: Redação Pulso).");
    if (bio.length < 60) return toast("A bio explica ao leitor quem assina: pelo menos 60 caracteres.");
    let links: Links;
    try { links = lerRedes(redes); } catch (erro) { setErroRede((erro as { rede?: string }).rede ?? null); return toast((erro as Error).message); }
    let id = editando;
    if (editando === "nova") {
      const base = slugificar(nome);
      const { data: usados } = await db.from("autores").select("slug").like("slug", `${base}%`);
      const tomados = new Set(((usados ?? []) as { slug: string }[]).map((x) => x.slug));
      let slug = base, n = 1;
      while (tomados.has(slug)) { n++; slug = `${base}-${n}`; }
      const r = await db.from("autores").insert({ slug, nome, bio, tipo: "redacao", links, foto_url: f.foto, ativo: true, agente_padrao: false }).select("id").single();
      if (r.error) return toast(msgErro(r.error));
      id = r.data.id;
      toast(`“${nome}” criada. O agente pode assinar com ela.`);
    } else {
      const r = await db.from("autores").update({ nome, bio, links, foto_url: f.foto }).eq("id", editando);
      if (r.error) return toast(msgErro(r.error));
      toast("Perfil de redação salvo. Vale nas próximas matérias e nas antigas.");
    }
    if (f.padrao && !(atual?.agente_padrao)) {
      // só uma é a principal: desmarca a atual antes de marcar a nova
      await db.from("autores").update({ agente_padrao: false }).eq("tipo", "redacao").eq("agente_padrao", true);
      const r = await db.from("autores").update({ agente_padrao: true }).eq("id", id);
      if (r.error) toast(msgErro(r.error));
    }
    setEditando(null);
    recarregar();
  };

  const apagar = async () => {
    if (!atual) return;
    if (atual.agente_padrao) return toast("A redação principal não se apaga. Marque outra como principal antes.");
    if (atual.publicou) return toast("Esse perfil já assina matéria publicada: não dá para apagar.");
    const r = await db.from("autores").delete().eq("id", atual.id);
    if (r.error) return toast(msgErro(r.error));
    toast(`“${atual.nome}” apagada.`);
    setEditando(null); recarregar();
  };

  return (
    <div className="card-p">
      <header><h2>Perfis da redação</h2><span>assinam as matérias do agente · sem login</span><button className="btn btn-sm" type="button" onClick={() => { setEditando("nova"); setF({ nome: "", bio: "", padrao: false, foto: null }); setRedes({}); }}>+ Nova redação</button></header>
      <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="tbl" style={{ minWidth: 560 }}>
          <thead><tr><th>Perfil</th><th>Papel do agente</th><th className="num">Publicou</th><th></th></tr></thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} tabIndex={0} className={editando === a.id ? "sel" : ""} onClick={() => abrir(a.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(a.id); } }}>
                <td><div className="pessoa"><Avatar nome={a.nome} foto={fotoAutor(a)} /><div><b>{a.nome}</b><small>/autor/{a.slug}</small></div></div></td>
                <td>{a.agente_padrao ? <span className="status st-pub">Principal</span> : <span className="status st-draft">Extra</span>}</td>
                <td className="num">{a.publicou} matéria{a.publicou === 1 ? "" : "s"}</td>
                <td className="acts"><button className="btn-ghost btn-sm" type="button">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editando && (
        <form className="pad camp-editor" onSubmit={salvar}>
          <header className="camp-editor-topo"><h3>{editando === "nova" ? "Novo perfil de redação" : "Editar perfil de redação"}</h3><button type="button" className="btn-ghost btn-sm" onClick={() => setEditando(null)}>Fechar</button></header>
          <div className="foto-linha">
            <div className="conta-foto">{f.foto ? <img src={f.foto} alt="" /> : editando !== "nova" ? <img src="/marca/pulso-simbolo.svg" alt="" /> : iniciaisDe(f.nome || "Redação")}</div>
            <div className="foto-botoes">
              <button type="button" className="btn-ghost btn-sm" onClick={() => arquivo.current?.click()}>Enviar imagem</button>
              {f.foto && <button type="button" className="btn-ghost btn-sm" onClick={() => setF({ ...f, foto: null })}>Usar o símbolo da marca</button>}
              <small>Quadrada, até 2 MB. É o avatar que aparece na matéria e na página do perfil. Sem imagem, vale o símbolo do Pulso.</small>
            </div>
            <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
              const a = e.target.files?.[0]; e.target.value = "";
              if (!a) return;
              if (a.size > 2 * 1024 * 1024) return toast("A imagem passa de 2 MB.");
              try {
                const url = await enviar("autores", `redacao/${Date.now()}.jpg`, await quadrado(await lerComoDataUrl(a), 256), "image/jpeg");
                setF((x) => ({ ...x, foto: url }));
              } catch (erro) { toast(msgErro(erro)); }
            }} />
          </div>
          <div className="field"><label htmlFor="rd-nome">Nome que assina <span className={f.nome.length > 60 ? "over" : ""}>{f.nome.length}/60</span></label><input className="input" id="rd-nome" maxLength={60} placeholder="Redação Pulso" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="field"><label htmlFor="rd-bio">Quem é <span className={f.bio.length > 320 ? "over" : ""}>{f.bio.length}/320</span></label>
            <textarea className="textarea" id="rd-bio" maxLength={320} placeholder="Explique ao leitor o que é essa redação e como o conteúdo é produzido." value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
            <small>Aparece na página do perfil e no fim de cada matéria assinada por ele.</small></div>
          <div className="field"><label>Redes <span>opcional</span></label><CamposRedes valores={redes} erro={erroRede} onChange={setRedes} prefixo="rd" /></div>
          <label className="check"><input type="checkbox" checked={f.padrao} disabled={!!atual?.agente_padrao} onChange={(e) => setF({ ...f, padrao: e.target.checked })} /><span><b>Redação principal.</b> É com esse perfil que o agente assina quando não pedimos outro. Só uma pode ser a principal.</span></label>
          <div className="save-bar">
            <button className="btn" type="submit">Salvar perfil</button>
            {editando !== "nova" && !atual?.agente_padrao && <button className="btn-ghost btn-perigo" type="button" onClick={apagar}>Apagar</button>}
          </div>
        </form>
      )}
    </div>
  );
}

function Tela() {
  const toast = useToast();
  const qc = useQueryClient();
  const cats = useCats();
  const { user } = useAuth();
  const [pa, setPa] = useState({ email: "", nome: "", papel: "autor" as Papel });
  const emailRef = useRef<HTMLInputElement>(null);

  const { data: acessos = [] } = useQuery({
    queryKey: ["acessos"],
    queryFn: async () => { const { data: d, error } = await db.rpc("lista_acessos"); if (error) throw error; return (d ?? []) as Acesso[]; },
  });
  const { data: cands = [] } = useQuery({
    queryKey: ["candidaturas"],
    queryFn: async () => ((await db.from("candidaturas").select("*").in("status", ["nova", "lida"]).order("criado_em", { ascending: false })).data ?? []) as Candidatura[],
  });
  const recarregar = () => { ["acessos", "candidaturas", "painel-contagens"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const rpc = async (nome: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await db.rpc(nome, args);
    if (error) { toast(msgErro(error)); return false; }
    toast(ok); recarregar(); return true;
  };

  const autorizar = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = pa.email.trim().toLowerCase();
    if (!emailValido(email)) return toast("Escreva um e-mail válido.");
    if (acessos.some((a) => a.email === email && a.user_id)) return toast("Esse e-mail já tem acesso. Troque o papel na lista abaixo.");
    if (await rpc("autorizar_email", { _email: email, _role: pa.papel, _assinatura: pa.nome.trim() || null }, `${email} autorizado como ${PAPEL_NOME[pa.papel].toLowerCase()}. O papel vale no primeiro login.`))
      setPa({ email: "", nome: "", papel: pa.papel });
  };

  const novas = cands.filter((c) => c.status === "nova").length;
  return (
    <>
      <div className="app-top">
        <div><h1>Acessos</h1><p>Todo mundo entra com Google e vira leitor. Para escrever, o Gmail precisa estar nesta lista — não existe fila de pedidos.</p></div>
      </div>

      <Redacoes />

      <div className="card-p">
        <header><h2>Candidaturas</h2><span>{cands.length ? `${novas} nova${novas === 1 ? "" : "s"}` : "Nenhuma esperando"}</span></header>
        <div className="pad"><div id="cand-lista">
          {cands.length ? cands.map((c) => (
            <article key={c.id} className={`cand-item${c.status === "nova" ? " nova" : ""}`}>
              <div>
                <div className="quem"><Avatar nome={c.nome} foto={null} /><div><b>{c.nome}</b><br /><small>{c.email} · {tempoRel(c.criado_em)}</small></div>
                  <span className={`mode ${c.perfil === "publicidade" ? "m-interno" : "m-adsense"}`}>{PERFIL_CANDIDATURA[c.perfil]}</span></div>
                <p>{c.sobre}</p>
                <div className="onde">{c.areas.map((a) => <span key={a} className="cand-area">{cats.nomeCat(a)}</span>)}
                  {c.link && <> · <a href={urlRede(/^https?:|\./.test(c.link) ? "site" : "instagram", c.link)} target="_blank" rel="noopener nofollow">{c.link} ↗</a></>}
                  {c.crm && <> · CRM-{c.crm_uf} {c.crm}</>}</div>
              </div>
              <div className="mod-acoes">
                <button className="btn" type="button" onClick={async () => {
                  // leva os dados para o formulário de liberar Gmail: quem decide o papel é o admin
                  setPa({ email: c.email, nome: c.nome, papel: (c.perfil === "organizacao" ? "parceiro" : c.perfil === "publicidade" ? "parceiro_publicidade" : c.perfil) as Papel });
                  await db.from("candidaturas").update({ status: "aprovada", decidido_por: user?.id, decidido_em: new Date().toISOString() }).eq("id", c.id);
                  toast("Dados no formulário abaixo. Confira o papel e clique em Autorizar.");
                  recarregar();
                  setTimeout(() => emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
                }}>Liberar acesso</button>
                <button className="btn-ghost" type="button" onClick={async () => {
                  const r = await db.from("candidaturas").update({ status: "recusada", decidido_por: user?.id, decidido_em: new Date().toISOString() }).eq("id", c.id);
                  toast(r.error ? msgErro(r.error) : `Candidatura de ${c.nome} recusada.`); recarregar();
                }}>Recusar</button>
              </div>
            </article>
          )) : <p className="conta-vazio">Nenhuma candidatura esperando. O formulário fica em <Link to="/parceria">Escreva com a gente</Link>.</p>}
        </div></div>
      </div>

      <div className="card-p">
        <header><h2>Liberar um Gmail</h2><span>O papel vale no primeiro login, com o perfil de autor já criado</span></header>
        <div className="pad">
          <form className="pre-auth" id="form-acesso" onSubmit={autorizar}>
            <div className="field"><label htmlFor="pa-email">E-mail Google</label><input ref={emailRef} className="input" id="pa-email" type="email" placeholder="nome@gmail.com" required value={pa.email} onChange={(e) => setPa({ ...pa, email: e.target.value })} /></div>
            <div className="field"><label htmlFor="pa-nome">Nome de assinatura <span>opcional</span></label><input className="input" id="pa-nome" placeholder="Como aparece nas matérias" value={pa.nome} onChange={(e) => setPa({ ...pa, nome: e.target.value })} /></div>
            <div className="field"><label htmlFor="pa-papel">Papel</label>
              <select className="select" id="pa-papel" value={pa.papel} onChange={(e) => setPa({ ...pa, papel: e.target.value as Papel })}>
                <option value="autor">Autor — escreve em tudo, menos Saúde</option>
                <option value="autor_medico">Autor médico — escreve também em Saúde</option>
                <option value="parceiro">Organização parceira — blog, grupo ou instituto, conteúdo editorial</option>
                <option value="parceiro_publicidade">Empresa de publicidade — conteúdo comercial, marcado como Publicidade</option>
                <option value="editor">Editor — revisa e publica</option>
              </select>
            </div>
            <button className="btn" type="submit" style={{ height: 42, alignSelf: "end", marginBottom: 16 }}>Autorizar</button>
          </form>
          {pa.papel === "autor_medico" && <p className="cat-aviso">No primeiro login, o autor médico precisa informar <b>CRM e UF</b> antes de escrever. Até o CRM ser confirmado, ele só salva rascunho. Você confere e libera aqui mesmo.</p>}
        </div>
      </div>

      <div className="card-p">
        <header><h2>Quem tem acesso</h2><span>autor escreve e envia para revisão · editor revisa e publica · admin faz tudo</span></header>
        <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="tbl" style={{ minWidth: 760 }}>
            <thead><tr><th>Pessoa</th><th>Papel</th><th>CRM</th><th>Último acesso</th><th></th></tr></thead>
            <tbody id="acessos-lista">
              {acessos.map((a) => {
                const medico = a.papel === "autor_medico", st = a.crm_situacao;
                const selo = st === "verificado" || st === "conferido_a_mao" ? "st-pub" : st === "pendente" || st === "divergente" ? "st-rev" : "st-draft";
                const quem = a.nome || a.email;
                return (
                  <tr key={a.user_id ?? a.email}>
                    <td><div className="pessoa"><Avatar nome={a.nome || "?"} foto={null} /><div><b>{a.user_id ? a.nome : "— ainda não entrou"}</b><small>{a.email}</small>{a.user_id && a.autor_id && !a.cadastro_completo && a.papel !== "admin" && <small className="tag-falta">cadastro incompleto</small>}</div></div></td>
                    <td>{a.papel === "admin" ? <span className="mode m-adsense">Admin</span> : (
                      <select className="select sel-sm" aria-label={`Papel de ${quem}`} value={a.papel} onChange={(e) => {
                        const novo = e.target.value as Papel;
                        if (a.user_id) rpc("definir_papel", { _user: a.user_id, _role: novo }, `${quem} agora é ${PAPEL_NOME[novo].toLowerCase()}.`);
                        else rpc("autorizar_email", { _email: a.email, _role: novo, _assinatura: a.nome }, `${a.email} agora vai entrar como ${PAPEL_NOME[novo].toLowerCase()}.`);
                      }}>
                        {PAPEIS_TELA.map((p) => <option key={p} value={p}>{NOME_PAPEL_SELECT[p]}</option>)}
                      </select>
                    )}</td>
                    <td>{medico ? <><span className={`status ${selo}`}>{CRM_NOME[st]}</span>{a.crm && <><br /><small className="crm-num">CRM-{a.crm_uf} {a.crm}</small></>}</> : <small className="crm-num">não se aplica</small>}</td>
                    <td className="num">{a.ultimo_acesso ? data(a.ultimo_acesso, true) : "—"}</td>
                    <td className="acts">
                      {medico && a.crm && (st === "pendente" || st === "divergente") && a.autor_id && (
                        <>
                          <a className="btn-ghost btn-sm" href="https://portal.cfm.org.br/busca-medicos" target="_blank" rel="noopener">Abrir CFM ↗</a>
                          <button className="btn btn-sm" type="button" onClick={() => rpc("liberar_crm", { _autor: a.autor_id }, `CRM de ${quem} liberado. Agora publica em Saúde.`)}>Conferi, liberar</button>
                        </>
                      )}
                      {a.papel !== "admin" && (a.user_id
                        ? <button className="btn-ghost btn-sm" type="button" onClick={() => { if (window.confirm(`Tirar o acesso de ${quem}? A pessoa volta a ser leitora; as matérias continuam no site.`)) rpc("remover_acesso", { _user: a.user_id }, `${quem} voltou a ser leitor. As matérias continuam no site.`); }}>Remover acesso</button>
                        : <button className="btn-ghost btn-sm" type="button" onClick={() => rpc("cancelar_autorizacao", { _email: a.email }, `Autorização de ${a.email} cancelada.`)}>Cancelar</button>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="panel-note">Remover acesso tira o papel na hora: a pessoa continua entrando com o Google, mas volta a ser leitora. As matérias que ela publicou continuam no site, com a assinatura dela.</p>
    </>
  );
}

export default function Acessos() {
  useSeo({ titulo: "Acessos", url: "/painel/acessos", semIndice: true });
  return <PainelLayout nivel="admin"><Tela /></PainelLayout>;
}
