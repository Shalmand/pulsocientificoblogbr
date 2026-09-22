import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { db, msgErro } from "@/lib/db";
import { maisEspecifica, materiasPorIds, urlMateria, useCats } from "@/lib/dados";
import { useMarcarNovidadesVistas, useNovidades } from "@/lib/novidades";
import { ListaPaginada } from "@/components/ListaPaginada";
import { data, iniciaisDe, tempoRel } from "@/lib/formato";
import { CamposRedes, lerRedes } from "@/lib/redes";
import { enviar, lerComoDataUrl, quadrado } from "@/lib/arquivos";
import type { Autor, Comentario, Links, Materia } from "@/lib/tipos";
import { Avatar } from "@/components/Avatar";
import { Cadeado } from "@/components/Icones";
import { Capa, Carregando } from "@/components/Cartoes";

type Aba = "perfil" | "novidades" | "salvos" | "seguindo" | "comentarios";

function useMinhaConta(uid: string | undefined) {
  return useQuery({
    queryKey: ["minha-conta", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [salvos, autores, cats, coms, curt] = await Promise.all([
        db.from("salvos").select("criado_em, materia:materias(id, slug, editoria, subcategoria, microcategoria, titulo, imagem_url, publicada_em, tempo_leitura)").eq("user_id", uid).order("criado_em", { ascending: false }),
        db.from("seguindo_autor").select("autor:autores(id, slug, nome, tipo, foto_url)").eq("user_id", uid),
        db.from("seguindo_categoria").select("categoria").eq("user_id", uid),
        db.from("comentarios").select("*, materia:materias(slug, editoria, titulo)").eq("user_id", uid).order("criado_em", { ascending: false }),
        db.from("curtidas").select("*", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      return {
        salvos: ((salvos.data ?? []) as unknown as { materia: Materia | null }[]).map((x) => x.materia).filter(Boolean) as Materia[],
        autores: ((autores.data ?? []) as unknown as { autor: Autor | null }[]).map((x) => x.autor).filter(Boolean) as Autor[],
        categorias: ((cats.data ?? []) as { categoria: string }[]).map((x) => x.categoria),
        comentarios: (coms.data ?? []) as (Comentario & { materia: Pick<Materia, "slug" | "editoria" | "titulo"> | null })[],
        curtidas: curt.count ?? 0,
      };
    },
  });
}

function AbaPerfil({ contagem }: { contagem: { curtidas: number; salvos: number; comentarios: number } }) {
  const { user, leitor, autor, eu, recarregar, sair } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const arquivo = useRef<HTMLInputElement>(null);
  const a = autor && autor.tipo !== "redacao" ? autor : null;
  const [f, setF] = useState({ nome: eu.nome, bio: a ? a.bio || "" : leitor?.bio || "", crm: a?.crm || "", uf: a?.crm_uf || "", esp: a?.especialidade || "", rqe: a?.rqe || "" });
  const [redes, setRedes] = useState<Links>(a?.links || {});
  const [erroRede, setErroRede] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  if (!user) return null;

  const guardarFoto = async (url: string | null) => {
    const r1 = await db.from("leitores").update({ foto_url: url }).eq("user_id", user.id);
    if (a) await db.from("autores").update({ foto_url: url }).eq("id", a.id);
    if (r1.error) return toast(msgErro(r1.error));
    await recarregar();
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = f.nome.trim(), bio = f.bio.trim();
    if (!nome) return toast("O nome não pode ficar vazio.");
    const r = await db.from("leitores").update(a ? { nome } : { nome, bio }).eq("user_id", user.id);
    if (r.error) return toast(msgErro(r.error));
    if (a) {
      let links: Links;
      try { links = lerRedes(redes); setErroRede(null); } catch (erro) { setErroRede((erro as { rede?: string }).rede ?? null); return toast((erro as Error).message); }
      const medico = a.tipo === "medico";
      if (medico && f.esp.trim() && !f.rqe.trim()) return toast("Especialidade preenchida precisa do RQE (CFM 2.336/2023).");
      const trocouCrm = medico && (f.crm.replace(/\D/g, "") !== (a.crm || "") || f.uf.trim().toUpperCase() !== (a.crm_uf || ""));
      if (trocouCrm) {
        // CRM é coluna protegida: muda pela função do banco, que volta o CRM para conferência
        const { error } = await db.rpc("completar_cadastro", { _nome: nome, _bio: bio, _formacao: a.formacao || "", _links: links, _declara: true,
          _crm: f.crm.replace(/\D/g, ""), _uf: f.uf.trim().toUpperCase(), _especialidade: f.esp.trim() || null, _rqe: f.rqe.trim() || null });
        if (error) return toast(msgErro(error));
      } else {
        const { error } = await db.from("autores").update({ nome, bio, links, ...(medico ? { especialidade: f.esp.trim() || null, rqe: f.rqe.trim() || null } : {}) }).eq("id", a.id);
        if (error) return toast(msgErro(error));
      }
    }
    await recarregar();
    toast("Perfil salvo.");
  };

  const apagarConta = async () => {
    if (!window.confirm("Apagar a sua conta? Saem do site o seu perfil, curtidas, salvos, quem você segue e os seus comentários. Não dá para desfazer.")) return;
    const uid = user.id;
    await Promise.all([
      db.from("comentarios").delete().eq("user_id", uid),
      db.from("curtidas").delete().eq("user_id", uid),
      db.from("salvos").delete().eq("user_id", uid),
      db.from("seguindo_autor").delete().eq("user_id", uid),
      db.from("seguindo_categoria").delete().eq("user_id", uid),
    ]);
    const { error } = await db.from("leitores").delete().eq("user_id", uid);
    if (error) return toast(msgErro(error));
    await sair();
    toast("Conta apagada. O registro de login é removido pela equipe em até 15 dias.");
    nav("/");
  };

  const fotoGoogle = user.user_metadata?.avatar_url as string | undefined;
  return (
    <div className="conta-grid">
      <form id="form-perfil" onSubmit={salvar}>
        <div className="conta-box">
          <h2>Foto e nome</h2>
          <p className="sub">É o que aparece nos seus comentários{a ? " e na assinatura das suas matérias" : ""}.</p>
          <div className="foto-linha">
            <div className="conta-foto" id="foto-previa">{eu.foto ? <img src={eu.foto} alt="" /> : iniciaisDe(eu.nome)}</div>
            <div className="foto-botoes">
              <button type="button" className="btn-ghost btn-sm" onClick={() => arquivo.current?.click()}>Enviar foto</button>
              {fotoGoogle && <button type="button" className="btn-ghost btn-sm" onClick={() => guardarFoto(fotoGoogle).then(() => toast("Usando a foto da sua conta Google."))}>Usar a foto do Google</button>}
              {eu.foto && <button type="button" className="btn-ghost btn-sm" onClick={() => guardarFoto(null).then(() => toast("Foto removida."))}>Remover</button>}
              <small>JPG ou PNG, até 2 MB. A imagem é recortada em quadrado.</small>
            </div>
            <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
              const arq = e.target.files?.[0]; e.target.value = "";
              if (!arq) return;
              if (arq.size > 2 * 1024 * 1024) return toast("A foto passa de 2 MB.");
              try {
                const url = await enviar("perfis", `${user.id}.jpg`, await quadrado(await lerComoDataUrl(arq), 256), "image/jpeg");
                await guardarFoto(url);
                toast("Foto trocada.");
              } catch (erro) { toast(msgErro(erro)); }
            }} />
          </div>
          <div className="field">
            <label htmlFor="pf-nome">Nome{a ? " (como você assina)" : ""} <span className={f.nome.length > 60 ? "over" : ""}>{f.nome.length}/60</span></label>
            <input className="input" id="pf-nome" maxLength={60} value={f.nome} onChange={(e) => set("nome", e.target.value)} />
            {a && <small>Trocar aqui muda a assinatura nas matérias que você já publicou.</small>}
          </div>
          <div className="field">
            <label htmlFor="pf-email">E-mail</label>
            <div className="campo-travado" id="pf-email"><Cadeado />{user.email}</div>
            <small>Vem da conta Google que você usou para entrar. Para trocar, entre com outra conta.</small>
          </div>
          <div className="field">
            <label htmlFor="pf-bio">Resumo / biografia <span className={f.bio.length > 320 ? "over" : ""}>{f.bio.length}/320</span></label>
            <textarea className="textarea" id="pf-bio" maxLength={320} placeholder="Conte em uma ou duas linhas quem é você." value={f.bio} onChange={(e) => set("bio", e.target.value)} />
            <small>{a ? "Aparece na sua página de autor e no fim das suas matérias." : "Aparece só para você e para a equipe, por enquanto."}</small>
          </div>
          <div className="save-bar"><button className="btn" type="submit">Salvar perfil</button></div>
        </div>
        {a && (
          <>
            <div className="conta-box">
              <h2>Perfil público de autor</h2>
              <p className="sub">Esses dados aparecem em toda matéria que você assina.{a.tipo === "medico" ? " Médicos precisam mostrar CRM e, se citarem especialidade, o RQE (Resolução CFM 2.336/2023)." : ""}</p>
              {a.tipo === "medico" && (
                <>
                  <div className="ed-row">
                    <div className="field"><label htmlFor="pf-crm">CRM</label><input className="input" id="pf-crm" placeholder="Só números" value={f.crm} onChange={(e) => set("crm", e.target.value)} /></div>
                    <div className="field"><label htmlFor="pf-uf">UF</label><input className="input" id="pf-uf" maxLength={2} value={f.uf} onChange={(e) => set("uf", e.target.value)} /></div>
                  </div>
                  <div className="ed-row">
                    <div className="field"><label htmlFor="pf-esp">Especialidade</label><input className="input" id="pf-esp" value={f.esp} onChange={(e) => set("esp", e.target.value)} /></div>
                    <div className="field"><label htmlFor="pf-rqe">RQE</label><input className="input" id="pf-rqe" value={f.rqe} onChange={(e) => set("rqe", e.target.value)} /></div>
                  </div>
                </>
              )}
              <p className="sub" style={{ margin: 0 }}>Mudar o CRM volta o registro para a conferência da equipe.</p>
            </div>
            <div className="conta-box">
              <h2>Redes sociais</h2>
              <p className="sub">Todas opcionais. Aparecem como ícones na sua página de autor.</p>
              <CamposRedes valores={redes} erro={erroRede} onChange={setRedes} prefixo="pf" />
            </div>
          </>
        )}
      </form>
      <aside>
        <div className="conta-box">
          <h2>Sua conta</h2>
          <p className="sub">Entrou com Google{leitor?.criado_em ? ` em ${data(leitor.criado_em)}` : ""}.</p>
          <div className="conta-seguindo">
            <div className="item"><b>Curtidas</b><span>{contagem.curtidas}</span></div>
            <div className="item"><b>Salvos</b><span>{contagem.salvos}</span></div>
            <div className="item"><b>Comentários</b><span>{contagem.comentarios}</span></div>
          </div>
        </div>
        <div className="conta-box">
          <h2>Privacidade</h2>
          <p className="sub">Guardamos nome, e-mail e foto da conta Google, além do que você curte, salva e comenta. Detalhes na <Link to="/politica-de-privacidade">Política de privacidade</Link>.</p>
          <button type="button" className="btn-ghost btn-sm" id="apagar-conta" onClick={apagarConta}>Apagar minha conta</button>
        </div>
        {!autor && (
          <div className="conta-box">
            <h2>Quer escrever no Pulso?</h2>
            <p className="sub">Médico, pesquisador, professor, divulgador ou blog pequeno: a gente quer gente que goste de explicar ciência. Não precisa ter público.</p>
            <Link className="btn-ghost btn-sm" to="/parceria">Quero escrever</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function Conta() {
  useSeo({ titulo: "Minha conta", url: "/conta", semIndice: true });
  const { carregando, user, eu, precisaCompletar } = useAuth();
  const cats = useCats();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const aba = (params.get("aba") as Aba) || "perfil";
  const { data: d } = useMinhaConta(user?.id);
  const { data: novidades } = useNovidades();
  const marcarVistas = useMarcarNovidadesVistas();
  const idsNovidades = (novidades?.itens ?? []).map((n) => n.id);
  const { data: materiasNovas = [], isLoading: carregandoNovas } = useQuery({
    queryKey: ["novidades-materias", idsNovidades.join(",")],
    enabled: aba === "novidades",
    queryFn: () => materiasPorIds(idsNovidades),
  });
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // abriu a aba: o número do menu zera
  useEffect(() => { if (aba === "novidades" && (novidades?.novas ?? 0) > 0) marcarVistas(); }, [aba, novidades?.novas]); // eslint-disable-line react-hooks/exhaustive-deps

  if (carregando) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (precisaCompletar) return <Navigate to="/completar" replace />;

  const recarregar = () => qc.invalidateQueries({ queryKey: ["minha-conta", user.id] });
  const salvos = d?.salvos ?? [], autores = d?.autores ?? [], seguidas = d?.categorias ?? [], meus = d?.comentarios ?? [];
  const abas: [Aba, string, number | null][] = [["perfil", "Perfil", null], ["novidades", "Novidades", novidades?.novas || null], ["salvos", "Salvos", salvos.length], ["seguindo", "Seguindo", autores.length + seguidas.length], ["comentarios", "Meus comentários", meus.length]];

  return (
    <section className="view on" id="v-conta" aria-label="Minha conta">
      <div className="wrap" id="conta-root">
        <nav className="crumbs" aria-label="Você está em"><Link to="/">Início</Link>›<span>Minha conta</span></nav>
        <header className="conta-head">
          <div className="conta-foto" id="conta-foto">{eu.foto ? <img src={eu.foto} alt="" /> : iniciaisDe(eu.nome)}</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1>{eu.nome}</h1>
            <p className="conta-mail">{user.email}{eu.selo && <span className="status st-pub conta-papel">{eu.selo}</span>}</p>
          </div>
          {eu.autorSlug && <Link className="btn-ghost btn-sm" to={`/autor/${eu.autorSlug}`}>Ver meu perfil público</Link>}
        </header>
        <div className="conta-abas" role="tablist">
          {abas.map(([id, txt, n]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setParams(id === "perfil" ? {} : { aba: id })}>{txt}{n ? <span className="n">{n}</span> : null}</button>
          ))}
        </div>
        <div id="conta-corpo">
          {aba === "perfil" && <AbaPerfil contagem={{ curtidas: d?.curtidas ?? 0, salvos: salvos.length, comentarios: meus.length }} />}
          {aba === "novidades" && (carregandoNovas ? <Carregando /> : (
            <ListaPaginada materias={materiasNovas} vazio={
              <p className="conta-vazio">{autores.length || seguidas.length
                ? "Ainda não saiu matéria nova de quem você segue. Quando sair, ela aparece aqui e o menu da sua conta avisa."
                : <>Siga um autor ou uma categoria para ver aqui as matérias novas deles. O botão <b>Seguir</b> fica na página de cada autor e de cada categoria.</>}</p>} />
          ))}
          {aba === "salvos" && (salvos.length ? (
            <div className="conta-lista">{salvos.map((m) => (
              <article className="conta-card" key={m.id}>
                <Link className="media" to={urlMateria(m)}><Capa m={m} /></Link>
                <div><span className="cat-text" style={{ "--c": cats.corCat(m.editoria) } as React.CSSProperties}>{cats.nomeCat(maisEspecifica(m))}</span><h3><Link to={urlMateria(m)}>{m.titulo}</Link></h3><div className="meta">{data(m.publicada_em)} · {m.tempo_leitura} min</div></div>
                <div className="conta-card-acao"><button type="button" className="btn-ghost btn-sm" onClick={async () => { await db.from("salvos").delete().eq("user_id", user.id).eq("materia_id", m.id); toast("Tirada dos salvos."); recarregar(); }}>Tirar dos salvos</button></div>
              </article>
            ))}</div>
          ) : <p className="conta-vazio">Você ainda não salvou nenhuma matéria. Abra uma matéria e toque em <b>Salvar</b> para guardar aqui. <Link to="/">Ver as últimas</Link></p>)}
          {aba === "seguindo" && (autores.length || seguidas.length ? (
            <div className="conta-seguindo">
              {autores.map((a) => (
                <div className="item" key={a.id}><Avatar nome={a.nome} foto={a.foto_url || (a.tipo === "redacao" ? "/marca/pulso-simbolo.svg" : null)} /><b><Link to={`/autor/${a.slug}`}>{a.nome}</Link></b>
                  <button type="button" className="btn-ghost btn-sm" onClick={async () => { await db.from("seguindo_autor").delete().eq("user_id", user.id).eq("autor_id", a.id); toast(`Deixou de seguir ${a.nome}.`); recarregar(); }}>Deixar de seguir</button></div>
              ))}
              {seguidas.map((s) => (
                <div className="item" key={s}><span className="ponto" style={{ "--c": cats.corCat(s) } as React.CSSProperties} /><b><Link to={cats.urlCat(s)}>{cats.caminhoDe(s).map((x) => x.nome).join(" › ")}</Link></b>
                  <button type="button" className="btn-ghost btn-sm" onClick={async () => { await db.from("seguindo_categoria").delete().eq("user_id", user.id).eq("categoria", s); toast(`Deixou de seguir ${cats.nomeCat(s)}.`); recarregar(); }}>Deixar de seguir</button></div>
              ))}
            </div>
          ) : <p className="conta-vazio">Você ainda não segue ninguém. Siga um autor ou uma categoria para acompanhar o que sai de novo.</p>)}
          {aba === "comentarios" && (meus.length ? (
            <div className="conta-lista">{meus.map((c) => (
              <article className="conta-coment" key={c.id}>
                <div className="onde">{tempoRel(c.criado_em)} em {c.materia ? <Link to={urlMateria(c.materia)}>{c.materia.titulo}</Link> : "matéria removida"}
                  {c.status === "em_analise" ? <> · <span className="coment-espera">em análise</span></> : c.status === "recusado" ? <> · <span style={{ color: "var(--danger)" }}>recusado pela equipe</span></> : null}</div>
                <p>{c.texto}</p>
                <div className="coment-acoes"><button type="button" className="perigo" onClick={async () => { await db.from("comentarios").delete().eq("id", c.id); toast("Comentário apagado."); recarregar(); }}>Apagar</button></div>
              </article>
            ))}</div>
          ) : <p className="conta-vazio">Você ainda não comentou em nenhuma matéria.</p>)}
        </div>
      </div>
    </section>
  );
}
