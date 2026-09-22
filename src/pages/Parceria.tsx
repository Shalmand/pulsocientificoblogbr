// "Escreva com a gente": candidatura pública (tabela candidaturas). Enviar não cria conta nem papel;
// quem libera o Gmail é o admin, na tela de Acessos.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, msgErro } from "@/lib/db";
import { useCats } from "@/lib/dados";
import { useSeo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { UFS_BR, emailValido } from "@/lib/formato";

const DICA_PERFIL: Record<string, string> = {
  autor: "Jornalista, pesquisador, professor, divulgador. Não precisa de registro em conselho.",
  autor_medico: "Só para quem tem CRM ativo. A gente confere no portal do CFM antes de liberar.",
  organizacao: "Blog, grupo de pesquisa, instituto ou veículo que publica conteúdo próprio, sem fim comercial.",
  publicidade: "Agência, marca ou anunciante. O conteúdo sai identificado como Publicidade e não passa pela redação.",
};

export default function Parceria() {
  useSeo({ titulo: "Escreva com a gente", descricao: "Médico, pesquisador, professor, divulgador ou blog pequeno: conte quem você é e escreva no Pulso Científico. Não precisa ter público.", url: "/parceria" });
  const cats = useCats();
  const { user, leitor } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ nome: "", email: "", perfil: "autor", crm: "", uf: "", sobre: "", link: "", aceite: false, armadilha: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (user) setF((x) => ({ ...x, nome: x.nome || leitor?.nome || "", email: x.email || user.email || "" }));
  }, [user, leitor]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.armadilha) return; // robô preencheu o campo escondido
    const nome = f.nome.trim(), email = f.email.trim().toLowerCase(), sobre = f.sobre.trim();
    const crm = f.crm.replace(/\D/g, "");
    if (nome.length < 3) return toast("Escreva o seu nome.");
    if (!emailValido(email)) return toast("Confira o e-mail.");
    if (!areas.length) return toast("Escolha pelo menos uma área.");
    if (sobre.length < 80) return toast("Conte um pouco mais sobre você: pelo menos 80 caracteres.");
    if (f.perfil === "autor_medico" && !/^\d{4,7}$/.test(crm)) return toast("Informe o CRM (4 a 7 números).");
    if (f.perfil === "autor_medico" && !f.uf) return toast("Escolha a UF do CRM.");
    if (!f.aceite) return toast("Marque que você leu a política editorial.");
    setEnviando(true);
    const { error } = await db.from("candidaturas").insert({
      nome, email, perfil: f.perfil, areas, sobre, link: f.link.trim() || null,
      crm: f.perfil === "autor_medico" ? crm : null, crm_uf: f.perfil === "autor_medico" ? f.uf : null,
    });
    setEnviando(false);
    if (error) return toast(msgErro(error));
    setOk(`Obrigado, ${nome.split(" ")[0]}. A gente lê tudo e responde em ${email}. Se der certo, liberamos esse e-mail e você entra pelo botão do Google.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="view on" id="v-parceria" aria-label="Escrever no Pulso Científico">
      <div className="wrap parceria-wrap">
        <header className="parceria-hero">
          <span className="eyebrow">Comunidade</span>
          <h1>Escreva com a gente</h1>
          <p className="dek">O Pulso Científico é feito por quem gosta de explicar ciência. Se você pesquisa, atende, ensina, escreve ou produz conteúdo sobre alguma das áreas que a gente cobre, esta porta é sua.</p>
          <ul className="parceria-pontos">
            <li><b>Não precisa ter público.</b> A gente não pergunta quantos seguidores você tem. Pergunta o que você quer contar.</li>
            <li><b>Não precisa ser jornalista.</b> Médico, pesquisador, professor, estudante de pós, divulgador, blog pequeno — todos cabem.</li>
            <li><b>Seu nome, seu texto.</b> Você assina, com foto, biografia e suas redes. O que você publica aqui continua sendo seu.</li>
            <li><b>Sem escala obrigatória.</b> Uma matéria por mês já ajuda. A régua é a qualidade, não a quantidade.</li>
          </ul>
        </header>

        {!ok ? (
          <div className="parceria-grid">
            <form id="form-parceria" className="parceria-form" noValidate onSubmit={enviar}>
              <div className="conta-box">
                <h2>Conte quem é você</h2>
                <p className="sub">A gente lê tudo e responde por e-mail. Costuma levar alguns dias.</p>
                <div className="ed-row">
                  <div className="field"><label htmlFor="pc-nome">Nome</label><input className="input" id="pc-nome" maxLength={70} required value={f.nome} onChange={(e) => set("nome", e.target.value)} /></div>
                  <div className="field"><label htmlFor="pc-email">E-mail</label><input className="input" id="pc-email" type="email" placeholder="o mesmo do seu Google" required value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
                </div>
                <div className="field">
                  <label htmlFor="pc-perfil">Como você quer participar</label>
                  <select className="select" id="pc-perfil" value={f.perfil} onChange={(e) => set("perfil", e.target.value)}>
                    <option value="autor">Autor — escrevo sobre tecnologia, IA, espaço, clima ou natureza</option>
                    <option value="autor_medico">Autor médico — quero escrever também sobre saúde</option>
                    <option value="organizacao">Organização, blog ou grupo de divulgação</option>
                    <option value="publicidade">Empresa que quer publicar conteúdo comercial</option>
                  </select>
                  <small id="pc-dica-perfil">{DICA_PERFIL[f.perfil]}</small>
                </div>
                {f.perfil === "autor_medico" && (
                  <div className="ed-row" id="pc-bloco-crm">
                    <div className="field"><label htmlFor="pc-crm">CRM <span>confirmamos depois</span></label><input className="input" id="pc-crm" inputMode="numeric" maxLength={7} placeholder="Só números" value={f.crm} onChange={(e) => set("crm", e.target.value)} /></div>
                    <div className="field"><label htmlFor="pc-uf">UF</label><select className="select" id="pc-uf" value={f.uf} onChange={(e) => set("uf", e.target.value)}><option value="" disabled>UF</option>{UFS_BR.map((u) => <option key={u}>{u}</option>)}</select></div>
                  </div>
                )}
                <div className="field">
                  <label>Sobre o que você quer escrever <span>uma ou mais</span></label>
                  <div className="parceria-areas" id="pc-areas">
                    {cats.principais().map((c) => (
                      <label className="area-chip" key={c.slug}>
                        <input type="checkbox" value={c.slug} checked={areas.includes(c.slug)} onChange={(e) => setAreas((x) => e.target.checked ? [...x, c.slug] : x.filter((y) => y !== c.slug))} />
                        <span style={{ "--c": c.cor } as React.CSSProperties}>{c.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="pc-sobre">Conte um pouco sobre você <span className={f.sobre.length > 1200 ? "over" : ""}>{f.sobre.length}/1200</span></label>
                  <textarea className="textarea" id="pc-sobre" maxLength={1200} rows={5} value={f.sobre} onChange={(e) => set("sobre", e.target.value)} placeholder="O que você faz, o que já escreveu (se já escreveu), e o que te daria vontade de publicar aqui. Pode ser simples: a gente quer entender de onde você fala." />
                  <small>Pelo menos 80 caracteres.</small>
                </div>
                <div className="field">
                  <label htmlFor="pc-link">Uma rede social, site ou portfólio <span>opcional</span></label>
                  <input className="input" id="pc-link" placeholder="@seuperfil, seublog.com.br, Lattes, LinkedIn…" value={f.link} onChange={(e) => set("link", e.target.value)} />
                  <small>Serve só para a gente te conhecer melhor. Perfil pequeno ou parado não atrapalha.</small>
                </div>
                <label className="completar-declara">
                  <input type="checkbox" id="pc-aceite" checked={f.aceite} onChange={(e) => set("aceite", e.target.checked)} />
                  <span>Li a <Link to="/politica-editorial">política editorial</Link> e concordo com ela: fonte sempre citada, sem promessa de resultado e sem texto de propaganda disfarçado de matéria.</span>
                </label>
                {/* campo-armadilha: gente de verdade não preenche o que não vê */}
                <input type="text" id="pc-site-extra" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.armadilha} onChange={(e) => set("armadilha", e.target.value)}
                  style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
                <div className="save-bar"><button className="btn" type="submit" disabled={enviando}>Enviar candidatura</button></div>
                <p className="flow-note" id="pc-rodape">Enviar não cria conta nem publica nada. Se der certo, a gente libera o seu Gmail e você entra pelo botão do Google.</p>
              </div>
            </form>
            <aside className="parceria-lado">
              <div className="conta-box">
                <h2>Como funciona depois</h2>
                <ol className="parceria-passos">
                  <li>A gente lê a sua candidatura e responde por e-mail.</li>
                  <li>Se fizer sentido, liberamos o seu Gmail no site.</li>
                  <li>Você entra com o Google e completa o cadastro: foto, assinatura, biografia e redes.</li>
                  <li>Escreve no editor e envia para revisão. Quem publica é a edição.</li>
                </ol>
              </div>
              <div className="conta-box">
                <h2>O que a gente não é</h2>
                <p className="sub">Não é rede social nem vitrine de portfólio. É um site de notícias de ciência: todo texto precisa de fonte, e conteúdo comercial entra marcado como publicidade, em perfil separado.</p>
                <p className="sub" style={{ margin: 0 }}>Dúvida antes de se candidatar? Escreva para <a href="mailto:blog.pulsocientifico@gmail.com">blog.pulsocientifico@gmail.com</a>.</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="parceria-ok" id="pc-ok">
            <h2>Recebemos a sua candidatura</h2>
            <p id="pc-ok-texto">{ok}</p>
            <Link className="btn" to="/">Voltar para o site</Link>
          </div>
        )}
      </div>
    </section>
  );
}
