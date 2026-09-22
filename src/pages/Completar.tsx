// Primeiro login de quem escreve: completar o cadastro conforme o papel.
// Médico precisa de CRM e UF (e RQE, se citar especialidade) — Resolução CFM nº 2.336/2023.
// Os dados protegidos vão pela função completar_cadastro do banco, que valida tudo de novo.
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { chamarFuncao, db, msgErro } from "@/lib/db";
import { ehEmpresaPerfil, ehPubli, rotuloPerfil } from "@/lib/dados";
import { UFS_BR, iniciaisDe } from "@/lib/formato";
import { CamposRedes, lerRedes } from "@/lib/redes";
import { enviar, lerComoDataUrl, quadrado } from "@/lib/arquivos";
import type { Links } from "@/lib/tipos";
import { Cadeado } from "@/components/Icones";
import { Carregando } from "@/components/Cartoes";

const crmConfirmado = (s?: string) => s === "verificado" || s === "conferido_a_mao";

export default function Completar() {
  useSeo({ titulo: "Complete o seu cadastro", url: "/completar", semIndice: true });
  const { carregando, user, autor, papel, recarregar } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const arquivo = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ nome: "", formacao: "", bio: "", crm: "", uf: "", esp: "", rqe: "", declara: false });
  const [redes, setRedes] = useState<Links>({});
  const [erroRede, setErroRede] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!autor) return;
    setF({
      nome: autor.nome || "", formacao: autor.formacao || "", bio: autor.bio || "",
      crm: autor.crm || "", uf: autor.crm_uf || "", esp: autor.especialidade || "", rqe: autor.rqe || "",
      declara: !!autor.declarou_em,
    });
    setRedes(autor.links || {});
  }, [autor?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (carregando) return <section className="view on"><div className="wrap"><Carregando /></div></section>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!autor || autor.tipo === "redacao") return <Navigate to="/conta" replace />;

  const medico = papel === "autor_medico", empresa = ehEmpresaPerfil(autor), publi = ehPubli(autor);
  const completo = !!autor.cadastro_completo_em;
  const alvoTxt = publi ? "a empresa" : "a organização";

  const trocarFoto = async (url: string | Blob) => {
    try {
      const endereco = typeof url === "string" ? url : await enviar("perfis", `${user.id}.jpg`, url, "image/jpeg");
      const r = await db.from("autores").update({ foto_url: endereco }).eq("id", autor.id);
      if (r.error) throw r.error;
      await db.from("leitores").update({ foto_url: endereco }).eq("user_id", user.id);
      await recarregar();
      toast(empresa ? "Logo atualizado." : "Foto atualizada.");
    } catch (e) { toast(msgErro(e)); }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const falta: string[] = [];
    if (f.nome.trim().length < 5) falta.push("nome de assinatura");
    if (f.bio.trim().length < 80) falta.push("minibiografia com pelo menos 80 caracteres");
    const crm = f.crm.replace(/\D/g, "");
    if (medico) {
      if (!/^\d{4,7}$/.test(crm)) falta.push("CRM");
      if (!UFS_BR.includes(f.uf)) falta.push("UF do CRM");
      if (f.esp.trim() && !f.rqe.trim()) falta.push("RQE da especialidade");
    }
    if (!f.declara) falta.push("aceite das regras");
    if (falta.length) return toast("Falta preencher: " + falta.join(", ") + ".");
    let links: Links;
    try { links = lerRedes(redes); setErroRede(null); } catch (erro) { setErroRede((erro as { rede?: string }).rede ?? null); return toast((erro as Error).message); }

    setSalvando(true);
    const trocouCrm = medico && (crm !== (autor.crm || "") || f.uf !== (autor.crm_uf || ""));
    const { error } = await db.rpc("completar_cadastro", {
      _nome: f.nome.trim(), _bio: f.bio.trim(), _formacao: f.formacao.trim(), _links: links, _declara: f.declara,
      _crm: medico ? crm : null, _uf: medico ? f.uf : null,
      _especialidade: medico ? f.esp.trim() || null : null, _rqe: medico ? f.rqe.trim() || null : null,
    });
    if (error) { setSalvando(false); return toast(msgErro(error)); }
    // CRM novo: tenta conferir no conselho (sem provedor configurado, fica para o admin conferir na mão)
    if (trocouCrm) { try { await chamarFuncao("verificar-crm", { crm, uf: f.uf }); } catch { /* segue pendente */ } }
    await recarregar();
    setSalvando(false);
    if (medico && !crmConfirmado(autor.crm_situacao) ) toast("Cadastro enviado. Falta só a conferência do CRM.");
    else toast("Cadastro completo. Bom texto!");
    if (!completo) nav("/painel");
  };

  const situacao = !completo ? "Cadastro incompleto" : medico && !crmConfirmado(autor.crm_situacao) ? "CRM em conferência" : "Cadastro completo";
  const aviso = medico && autor.crm && !crmConfirmado(autor.crm_situacao) ? ({
    pendente: "CRM enviado. A equipe confere no portal do CFM e libera — costuma sair no mesmo dia. Até lá você escreve e salva rascunho.",
    divergente: "O nome do registro não bateu com o da sua conta. A equipe vai conferir na mão.",
    nao_encontrado: "O conselho não encontrou esse número nessa UF. Confira e envie de novo.",
  } as Record<string, string>)[autor.crm_situacao] : "";
  const foto = autor.foto_url;
  const fotoGoogle = user.user_metadata?.avatar_url as string | undefined;

  return (
    <section className="view on" id="v-completar" aria-label="Completar cadastro">
      <div className="wrap completar-wrap">
        <div className="completar">
          <header className="completar-topo">
            <span className="g-avatar lg" id="cp-avatar">{foto ? <img src={foto} alt="" /> : iniciaisDe(autor.nome)}</span>
            <div>
              <b id="cp-nome-topo">{autor.nome}</b>
              <span id="cp-papel">{(empresa ? rotuloPerfil(autor) : medico ? "Autor médico" : papel === "editor" ? "Editor" : "Autor") + " · Pulso Científico"}</span>
            </div>
            <span className={`status ${situacao === "Cadastro completo" ? "st-pub" : "st-rev"}`} id="cp-situacao">{situacao}</span>
          </header>
          <h1>Complete o seu cadastro</h1>
          <p className="completar-intro" id="cp-intro">{publi
            ? "Antes da primeira publicação, complete o perfil da empresa. Ele vira uma página pública no site, e todo texto assinado por ela sai marcado como Publicidade."
            : empresa ? "Antes da primeira publicação, complete o perfil da organização. Ele vira uma página pública no site, e as matérias assinadas por ela aparecem como parceria editorial."
            : medico ? "Antes da primeira matéria, precisamos dos seus dados de identificação profissional. Leva dois minutos e vale para todas as matérias que você assinar."
            : "Antes da primeira matéria, conte quem assina. Esses dados aparecem na sua página de autor e no fim de cada texto."}</p>

          <form id="form-completar" onSubmit={salvar}>
            <div className="completar-bloco">
              <h2>{empresa ? "Identificação d" + alvoTxt : "Como você assina"}</h2>
              <div className="foto-linha">
                <div className="conta-foto" id="cp-foto-previa">{foto ? <img src={foto} alt="" /> : iniciaisDe(autor.nome)}</div>
                <div className="foto-botoes">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => arquivo.current?.click()}>{empresa ? "Enviar logo" : "Enviar foto"}</button>
                  {!empresa && fotoGoogle && <button type="button" className="btn-ghost btn-sm" onClick={() => trocarFoto(fotoGoogle)}>Usar a foto do Google</button>}
                  <small>{empresa ? "Logo quadrado, JPG ou PNG, até 2 MB. Aparece na página da empresa e na lista de parceiros." : "Quadrada, JPG ou PNG, até 2 MB. Aparece na matéria e na sua página de autor."}</small>
                </div>
                <input ref={arquivo} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
                  const a = e.target.files?.[0]; e.target.value = "";
                  if (!a) return;
                  if (a.size > 2 * 1024 * 1024) return toast("A foto passa de 2 MB.");
                  trocarFoto(await quadrado(await lerComoDataUrl(a), 256));
                }} />
              </div>
              <div className="field">
                <label htmlFor="cp-nome">{empresa ? (publi ? "Nome da empresa " : "Nome da organização ") : "Nome de assinatura "}<span className={f.nome.length > 60 ? "over" : ""}>{f.nome.length}/60</span></label>
                <input className="input" id="cp-nome" maxLength={60} required value={f.nome} onChange={(e) => set("nome", e.target.value)} />
                <small>É o nome que vai em toda matéria sua. Depois só o admin troca.</small>
              </div>
              <div className="field">
                <label htmlFor="cp-email">E-mail</label>
                <div className="campo-travado" id="cp-email"><Cadeado /><span>{user.email}</span></div>
                <small>Vem da conta Google que você usou para entrar.</small>
              </div>
            </div>

            {medico && (
              <div className="completar-bloco" id="cp-bloco-medico">
                <h2>Registro profissional</h2>
                <p className="completar-sub">Toda matéria de saúde leva a sua identificação, como manda a Resolução CFM nº 2.336/2023. A equipe confere o número no portal do Conselho Federal de Medicina antes de liberar.</p>
                <div className="ed-row">
                  <div className="field"><label htmlFor="cp-crm">CRM</label><input className="input" id="cp-crm" inputMode="numeric" maxLength={7} placeholder="Só números" value={f.crm} onChange={(e) => set("crm", e.target.value)} /></div>
                  <div className="field"><label htmlFor="cp-uf">UF do CRM</label><select className="select" id="cp-uf" value={f.uf} onChange={(e) => set("uf", e.target.value)}><option value="" disabled>UF</option>{UFS_BR.map((u) => <option key={u}>{u}</option>)}</select></div>
                </div>
                <div className="ed-row">
                  <div className="field"><label htmlFor="cp-esp">Especialidade <span>opcional</span></label><input className="input" id="cp-esp" placeholder="Ex.: Cardiologia" value={f.esp} onChange={(e) => set("esp", e.target.value)} /></div>
                  <div className="field"><label htmlFor="cp-rqe">RQE</label><input className="input" id="cp-rqe" placeholder="Só números" value={f.rqe} onChange={(e) => set("rqe", e.target.value)} /></div>
                </div>
                <small className="flow-note">Se você citar a especialidade, o RQE passa a ser obrigatório — é a regra do CFM para divulgar especialidade.</small>
              </div>
            )}

            <div className="completar-bloco">
              <h2>{empresa ? "Sobre " + alvoTxt : "Sobre você"}</h2>
              <div className="field">
                <label htmlFor="cp-formacao">{empresa ? "Ramo de atuação" : "Formação ou área de atuação"}</label>
                <input className="input" id="cp-formacao" maxLength={80} value={f.formacao} onChange={(e) => set("formacao", e.target.value)}
                  placeholder={empresa ? (publi ? "Ex.: Agência de marketing para saúde" : "Ex.: Blog de divulgação científica · Instituto de pesquisa") : "Ex.: Jornalista de ciência · Doutora em Física · Médica de família"} />
              </div>
              <div className="field">
                <label htmlFor="cp-bio">{empresa ? "Descrição " : "Minibiografia "}<span className={f.bio.length > 320 ? "over" : ""}>{f.bio.length}/320</span></label>
                <textarea className="textarea" id="cp-bio" maxLength={320} value={f.bio} onChange={(e) => set("bio", e.target.value)}
                  placeholder={empresa ? `Duas ou três linhas sobre o que ${alvoTxt} faz. Aparece na página dela e no fim das matérias que assina.` : "Duas ou três linhas sobre quem você é e sobre o que escreve. Aparece na sua página de autor e no fim das suas matérias."} />
                <small>Pelo menos 80 caracteres.</small>
              </div>
            </div>

            <div className="completar-bloco">
              <h2>{empresa ? "Onde encontrar " + alvoTxt : "Onde te encontram"}</h2>
              <p className="completar-sub">Todas opcionais. Viram ícones clicáveis na sua página e no fim das suas matérias. Pode colar o @ ou o endereço completo.</p>
              <div id="cp-redes"><CamposRedes valores={redes} erro={erroRede} onChange={setRedes} prefixo="cp" /></div>
            </div>

            <label className="completar-declara">
              <input type="checkbox" id="cp-declara" checked={f.declara} onChange={(e) => set("declara", e.target.checked)} />
              <span id="cp-declara-txt">{publi
                ? "Declaro que represento esta empresa, que os dados são verdadeiros e que aceito que todo conteúdo assinado por ela apareça identificado como Publicidade, seguindo a política editorial do Pulso Científico e as normas de publicidade aplicáveis."
                : empresa ? "Declaro que represento esta organização, que os dados são verdadeiros, que o conteúdo publicado é editorial e sem contrapartida comercial, e que sigo a política editorial do Pulso Científico: fonte sempre citada e sem promessa de resultado."
                : medico ? "Declaro que sou o titular do CRM informado, que os dados são verdadeiros e que sigo a Resolução CFM nº 2.336/2023 e a política editorial do Pulso Científico: sem promessa de resultado, sem sensacionalismo e sem dados de paciente."
                : "Declaro que os dados são verdadeiros e que sigo a política editorial do Pulso Científico: texto próprio, fonte sempre citada e sem promessa de resultado."}</span>
            </label>

            {aviso && <p className={`crm-aviso ${autor.crm_situacao === "divergente" || autor.crm_situacao === "nao_encontrado" ? "ruim" : "espera"}`} id="cp-aviso">{aviso}</p>}
            <div className="save-bar"><button className="btn" type="submit" id="cp-salvar" disabled={salvando}>{completo ? "Salvar alterações" : "Concluir cadastro"}</button></div>
            <p className="flow-note" id="cp-rodape">{empresa
              ? (publi ? "Conteúdo comercial não entra em Saúde e sempre aparece marcado como Publicidade." : "Organização parceira escreve em Tecnologia, Inteligência Artificial, Espaço, Clima e Meio Ambiente e Natureza. Saúde é área de autor médico.")
              : medico ? "Enquanto o CRM não é confirmado, você escreve e salva rascunho, mas não envia para revisão. Quem não é médico não precisa disso e escreve nas outras áreas normalmente."
              : "Você escreve em Tecnologia, Inteligência Artificial, Espaço, Clima e Meio Ambiente e Natureza. Saúde é área de autor médico."}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
