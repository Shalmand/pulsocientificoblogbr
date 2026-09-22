// Editor de matéria (/painel/nova e /painel/materia/:id). Mesmos campos, travas e textos do protótipo.
// A assinatura nunca vem do formulário: o banco define o autor na criação e impede a troca depois.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chamarFuncao, db, msgErro } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { legendaCapa, registro, urlMateria, useCats } from "@/lib/dados";
import { data, semAcento, slugificar } from "@/lib/formato";
import { contarPalavras, textoPuro } from "@/lib/html";
import { achaVetadas, sugerirPalavrasChave } from "@/lib/palavraChave";
import { enviar, extensao } from "@/lib/arquivos";
import type { Autor, Credito, Fonte, Materia, StatusMateria } from "@/lib/tipos";
import { PainelLayout } from "@/components/PainelLayout";
import { AvatarAutor } from "@/components/Avatar";
import { CadeadoTravado } from "@/components/Icones";
import { Carregando } from "@/components/Cartoes";
import { EditorTexto } from "@/components/editor/EditorTexto";
import { SeletorCategoria, type Escolha } from "@/components/editor/SeletorCategoria";
import { SeletorCapa, type CapaEscolhida } from "@/components/editor/SeletorCapa";

const DICA_FONTE: Record<string, string> = {
  estudo: "Revista com revisão por pares: JAMA, Nature Communications, Science… O DOI resolve tudo.",
  preprint: "arXiv e afins. A matéria precisa dizer que o trabalho ainda não passou por revisão por pares — e preprint não entra em Saúde.",
  comunicado: "Texto oficial de agência ou instituição (NASA, ESA, universidade). Aqui o link é obrigatório, porque não existe DOI.",
};
const dataBr = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");
const dataIso = (br: string) => { const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : br.trim(); };

interface Form {
  tipo: "estudo" | "artigo";
  fonteTipo: "estudo" | "preprint" | "comunicado";
  ident: string; orig: string; rev: string; dataFonte: string; pmid: string; url: string;
  titulo: string; fina: string; correcao: string; alt: string; kw: string; status: StatusMateria;
}

function Tela({ m, assinante }: { m: Materia | null; assinante: Autor | null }) {
  const { user, ehStaff, papel, podeSaude, autor: meuAutor } = useAuth();
  const cats = useCats();
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [f, setF] = useState<Form>(() => ({
    tipo: m?.tipo || (papel === "autor" ? "artigo" : "estudo"),
    fonteTipo: m?.fonte?.tipo || "estudo",
    ident: m?.fonte?.doi || m?.fonte?.pmid || "", orig: m?.fonte?.titulo_original || "", rev: m?.fonte?.revista || "",
    dataFonte: dataBr(m?.fonte?.data), pmid: m?.fonte?.pmid || "", url: m?.fonte?.url || (m?.fonte?.doi ? `https://doi.org/${m.fonte.doi}` : ""),
    titulo: m?.titulo || "", fina: m?.linha_fina || "", correcao: m?.nota_correcao || "", alt: m?.imagem_alt || "",
    kw: m?.seo?.palavra_chave || "", status: m?.status || "rascunho",
  }));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const [fonteExtra, setFonteExtra] = useState<Partial<Fonte>>({ autores: m?.fonte?.autores, citacao: m?.fonte?.citacao });
  const [cat, setCat] = useState<Escolha>(() => {
    const permitidas = cats.principais().filter((c) => podeSaude || c.slug !== "saude");
    return { editoria: m?.editoria || permitidas[0]?.slug || "", sub: m?.subcategoria || "", micro: m?.microcategoria || "" };
  });
  const [corpo, setCorpo] = useState(m?.corpo_html || "");
  const [tags, setTags] = useState<string[]>(m?.seo?.tags || []);
  const [tagIn, setTagIn] = useState("");
  const [kwManual, setKwManual] = useState(!!m?.seo?.palavra_chave);
  const [capa, setCapa] = useState<{ url: string; credito: Credito | null } | null>(m?.imagem_url ? { url: m.imagem_url, credito: m.imagem_credito } : null);
  const [modalCapa, setModalCapa] = useState<null | "pexels" | "upload">(null);
  const [buscaMsg, setBuscaMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Agendamento: data e hora futuras em "Publicar em" (só a equipe). Vazio = agora.
  const paraCampo = (iso: string | null | undefined) => { if (!iso) return ""; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  const [agendar, setAgendar] = useState(() => (m?.publicada_em && new Date(m.publicada_em) > new Date() ? paraCampo(m.publicada_em) : ""));
  const agendada = !!m?.publicada_em && new Date(m.publicada_em) > new Date();
  // Aviso de saída sem salvar: compara o estado atual com o que estava ao abrir ou salvar
  const retrato = JSON.stringify([f, cat, corpo, tags, capa, agendar]);
  const [salvo, setSalvo] = useState<string | null>(null);
  const retratoAtual = useRef(retrato);
  retratoAtual.current = retrato;
  // espera o editor de texto entregar o HTML limpo antes de tirar o retrato inicial
  useEffect(() => { const t = setTimeout(() => setSalvo((x) => x ?? retratoAtual.current), 400); return () => clearTimeout(t); }, []);
  const sujo = salvo !== null && salvo !== retrato;
  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  useEffect(() => { if (!cat.editoria && cats.todas.length) setCat({ editoria: cats.principais().filter((c) => podeSaude || c.slug !== "saude")[0]?.slug || "", sub: "", micro: "" }); }, [cats.todas.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const ehEstudo = f.tipo === "estudo";
  const autorFinal = assinante;
  const publicadaAntes = !!m?.publicada_em;
  const slug = publicadaAntes ? m!.slug : slugificar(f.titulo) || "titulo-da-materia";
  const sugestoes = useMemo(() => sugerirPalavrasChave(f.titulo.trim(), f.fina.trim(), corpo, tags), [f.titulo, f.fina, corpo, tags]);
  const kw = kwManual ? f.kw : sugestoes[0] || "";
  const palavras = contarPalavras(corpo);
  const txtCorpo = textoPuro(corpo);

  // Travas: a mesma lista do protótipo; enquanto alguma falhar, o botão fica desligado
  const vetadas = achaVetadas([f.titulo, f.fina, txtCorpo, tags.join(" ")].join(" "));
  const crmOk = ["verificado", "conferido_a_mao"].includes(meuAutor?.crm_situacao ?? "");
  const gates: [boolean, string, string][] = [
    ...(ehEstudo ? [[!!(f.url.trim() || f.ident.trim()), "Fonte com link, DOI ou identificador", "Vale DOI, PMID, arXiv ou o endereço do comunicado."] as [boolean, string, string]] : []),
    ...(ehEstudo && f.fonteTipo === "preprint" ? [[/preprint|revis(ão|ao) por pares/i.test(txtCorpo), "Aviso de preprint no texto", "Preprint ainda não passou por revisão por pares: diga isso na matéria."] as [boolean, string, string]] : []),
    ...(ehEstudo && f.fonteTipo === "preprint" && cat.editoria === "saude" ? [[false, "Preprint não vira matéria de saúde", "Em saúde, só estudo já revisado por pares."] as [boolean, string, string]] : []),
    ...(cat.editoria === "saude" && !podeSaude ? [[false, "Saúde é área de autor médico", "Escolha outra categoria: o banco recusa matéria de saúde assinada por autor não médico."] as [boolean, string, string]] : []),
    ...(papel === "autor_medico" && !crmOk && f.status !== "rascunho" ? [[false, "CRM confirmado", "A equipe ainda está conferindo o seu CRM. Até lá, dá para salvar rascunho, mas não enviar."] as [boolean, string, string]] : []),
    ...(!ehStaff && m?.status === "publicada" ? [[false, "Matéria publicada", "Depois de publicada, só a equipe edita. Peça a correção a um editor."] as [boolean, string, string]] : []),
    [!!f.titulo.trim() && f.titulo.length <= 65, "Título com até 65 caracteres", ""],
    [!!f.fina.trim() && f.fina.trim().length <= 160, "Linha fina com até 160 caracteres", f.fina.trim() ? "O Google corta a descrição depois disso." : "A linha fina é o resumo que aparece no Google."],
    [palavras >= 150, "Texto com pelo menos 150 palavras", `Agora: ${palavras} palavras.`],
    ...(ehEstudo ? [[/ainda não diz|limitaç/i.test(txtCorpo), "Limitações do estudo no texto", "Inclua uma seção como “O que o estudo ainda não diz”."] as [boolean, string, string]] : []),
    ...(autorFinal?.tipo === "medico" ? [[!!(autorFinal.crm && autorFinal.crm_uf && (!autorFinal.especialidade || autorFinal.rqe)), "Perfil com CRM e RQE", "Complete CRM, UF e RQE no seu perfil antes de enviar."] as [boolean, string, string]] : []),
    [!!capa?.url, "Capa escolhida", "Use “Buscar foto” para escolher a capa."],
    [!!f.alt.trim(), "Descrição da imagem preenchida", "Descreva a capa em uma frase, para quem usa leitor de tela."],
    [vetadas.length === 0, "Sem promessa nem superlativo", `Encontrado: “${vetadas.join("”, “")}”. Vetado pela Resolução CFM 2.336/2023.`],
  ];
  const bloqueado = gates.some((g) => !g[0]);

  // Dicas de SEO (não bloqueiam)
  const k = semAcento(kw), primeiroP = semAcento((corpo.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || "");
  const dicas: [boolean, string, string][] = kw ? [
    [semAcento(f.titulo).includes(k), "Palavra-chave no título", `Tente incluir “${kw}” no título.`],
    [semAcento(f.fina).includes(k), "Palavra-chave na linha fina", `Tente incluir “${kw}” na linha fina.`],
    [primeiroP.includes(k), "Palavra-chave no primeiro parágrafo", `Cite “${kw}” logo no primeiro parágrafo.`],
    [f.titulo.length <= 60, "Título aparece inteiro no Google", `Com ${f.titulo.length} caracteres, o Google pode cortar o fim do título (ideal: até 60).`],
    [tags.length > 0, "Tags preenchidas", "Adicione pelo menos uma tag."],
  ] : [];

  const adicionarTag = (bruto: string) => {
    const t = bruto.replace(/\s+/g, " ").trim().replace(/^#/, "");
    if (!t || tags.length >= 8 || tags.some((x) => semAcento(x) === semAcento(t))) return;
    setTags([...tags, t]);
  };

  const buscarFonte = async () => {
    const bruto = f.ident.trim();
    if (!bruto) { setBuscaMsg("Cole o DOI, o PMID, o arXiv ou o link antes de buscar."); return; }
    if (/^https?:\/\//i.test(bruto) && !/arxiv\.org|doi\.org|pubmed/i.test(bruto)) {
      setF((x) => ({ ...x, url: bruto, fonteTipo: /nasa\.gov|esa\.int|\.edu|\.gov/i.test(bruto) ? "comunicado" : x.fonteTipo }));
      setBuscaMsg("Link guardado. Preencha título, instituição e data — de comunicado não dá para puxar automático.");
      return;
    }
    setBuscaMsg("Buscando…");
    try {
      const r = await chamarFuncao<Fonte & { resumo?: string }>("buscar-estudo", { id: bruto });
      setF((x) => ({ ...x, fonteTipo: r.tipo || x.fonteTipo, orig: r.titulo_original || x.orig, rev: r.revista || x.rev,
        dataFonte: r.data ? dataBr(r.data) : x.dataFonte, pmid: r.pmid || x.pmid, url: r.url || x.url, ident: r.doi || x.ident }));
      setFonteExtra({ autores: r.autores, citacao: r.citacao });
      setBuscaMsg(`Achei: ${r.revista ?? "fonte"}. Confira os campos abaixo.`);
    } catch (e) { setBuscaMsg((e as Error).message); }
  };

  const enviarImagemCorpo = useCallback(async (arq: File) => {
    if (!user) throw new Error("Entre de novo para enviar imagens.");
    return enviar("capas", `${user.id}/corpo-${Date.now()}.${extensao(arq)}`, arq);
  }, [user]);
  const fecharCapa = useCallback(() => setModalCapa(null), []);

  const salvar = async () => {
    if (bloqueado || salvando || !user) return;
    setSalvando(true);
    const status: StatusMateria = !ehStaff && !["rascunho", "em_revisao"].includes(f.status) ? "em_revisao" : f.status;
    const ident = f.ident.trim();
    const doi = /^10\.\d{4,9}\//.test(ident) ? ident : m?.fonte?.doi || null;
    const fonte: Fonte | null = ehEstudo ? {
      ...(m?.fonte || {}), ...fonteExtra,
      tipo: f.fonteTipo, titulo_original: f.orig.trim(), revista: f.rev.trim(), data: dataIso(f.dataFonte),
      doi, pmid: f.pmid.trim() || null, url: f.url.trim() || (doi ? `https://doi.org/${doi}` : ""),
    } : null;
    const payload: Record<string, unknown> = {
      tipo: f.tipo, titulo: f.titulo.trim(), linha_fina: f.fina.trim(),
      editoria: cat.editoria, subcategoria: cat.sub || null, microcategoria: cat.sub && cat.micro ? cat.micro : null,
      corpo_html: corpo, seo: { palavra_chave: kw, tags },
      imagem_url: capa?.url || null, imagem_alt: f.alt.trim(), imagem_credito: capa?.credito || null,
      fonte, tempo_leitura: Math.max(1, Math.round(palavras / 200)), status,
      nota_correcao: f.correcao.trim() || null,
    };
    if (status === "publicada") {
      if (agendar) {
        const quando = new Date(agendar);
        if (isNaN(+quando)) { setSalvando(false); return toast("Confira a data de publicação."); }
        payload.publicada_em = quando.toISOString();
      } else if (!m?.publicada_em || agendada) payload.publicada_em = new Date().toISOString();
      if (!m?.publicada_em || agendada) payload.revisado_por = user.id;
    }
    const r = m
      ? await db.from("materias").update(payload).eq("id", m.id).select("id").maybeSingle()
      : await db.from("materias").insert(payload).select("id").single();
    setSalvando(false);
    if (r.error) return toast(msgErro(r.error));
    if (!r.data) return toast("Não deu para salvar: você não tem permissão para mudar esta matéria.");
    qc.invalidateQueries({ queryKey: ["publicadas"] });
    qc.invalidateQueries({ queryKey: ["painel-materias"] });
    qc.invalidateQueries({ queryKey: ["painel-contagens"] });
    qc.invalidateQueries({ queryKey: ["editor", r.data.id] });
    setSalvo(retrato);
    toast(status === "publicada" && agendar && new Date(agendar) > new Date()
      ? `Publicação agendada para ${new Date(agendar).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`
      : m ? "Alterações salvas." : status === "em_revisao" ? "Matéria enviada para revisão." : "Matéria criada.");
    if (!m) nav(`/painel/materia/${r.data.id}`, { replace: true });
  };

  const rotulo = !ehStaff ? (f.status === "em_revisao" ? "Enviar para revisão" : "Salvar rascunho")
    : f.status === "publicada" && agendar && new Date(agendar) > new Date() ? "Agendar publicação"
    : m ? "Salvar alterações" : "Criar matéria";
  const buscasSugeridas = [kw, ...tags].filter((t, i, l) => t && !/jama/i.test(t) && l.findIndex((x) => semAcento(x) === semAcento(t)) === i).slice(0, 4);

  return (
    <>
      <div className="app-top">
        <div><Link to="/painel" className="link-sm">← Matérias</Link><h1 id="ed-h1" style={{ marginTop: 10 }}>{m ? "Editar matéria" : "Nova matéria"}</h1>
          <p id="ed-sub">{m ? (m.publicada_em ? `${agendada ? "Agendada para" : "Publicada em"} ${data(m.publicada_em, true)} · ${m.tempo_leitura} min de leitura` : `Criada em ${data(m.criada_em, true)} · ainda não publicada`) : "Os campos seguem a estrutura das matérias do site."}</p></div>
        {m && <Link to={urlMateria(m)} className="btn-ghost" style={{ padding: "0 14px" }}>Ver no site ↗</Link>}
      </div>

      <div className="editor">
        <div>
          <div className="ed-card">
            <h2>Tipo de matéria</h2>
            <p>Escolha se o texto parte de um estudo publicado ou se é um artigo seu.</p>
            <div className="seg dois" role="radiogroup" aria-label="Tipo de matéria">
              <label><input type="radio" name="ed-tipo" checked={f.tipo === "estudo"} onChange={() => set("tipo", "estudo")} /><b>Parte de uma fonte</b><small>Estudo, preprint ou comunicado de agência, com link</small></label>
              <label><input type="radio" name="ed-tipo" checked={f.tipo === "artigo"} onChange={() => set("tipo", "artigo")} /><b>Artigo do autor</b><small>Texto próprio, sem estudo de origem</small></label>
            </div>
          </div>

          {ehEstudo && (
            <div className="ed-card" id="card-estudo">
              <h2>Fonte de origem</h2>
              <p>Cole o DOI, o PMID, o número do arXiv ou o link do comunicado. O que der, a gente busca sozinho.</p>
              <div className="field">
                <label htmlFor="ed-fonte-tipo">O que é essa fonte</label>
                <select className="select" id="ed-fonte-tipo" value={f.fonteTipo} onChange={(e) => set("fonteTipo", e.target.value as Form["fonteTipo"])}>
                  <option value="estudo">Estudo revisado por pares — revista científica</option>
                  <option value="preprint">Preprint — ainda sem revisão por pares (arXiv e afins)</option>
                  <option value="comunicado">Comunicado oficial — NASA, ESA, universidade, instituto</option>
                </select>
                <small>{DICA_FONTE[f.fonteTipo]}</small>
              </div>
              <div className="field"><label htmlFor="ed-doi">DOI, PMID, arXiv ou link</label>
                <div className="doi-row"><input className="input" id="ed-doi" value={f.ident} onChange={(e) => set("ident", e.target.value)}
                  placeholder={f.fonteTipo === "comunicado" ? "https://www.nasa.gov/…" : f.fonteTipo === "preprint" ? "arXiv:2609.01234 ou o link do preprint" : "10.1001/… · 42640641 · link do artigo"} />
                  <button className="btn" type="button" onClick={buscarFonte}>Buscar</button></div>
                <small>{buscaMsg}</small></div>
              <div className="field"><label htmlFor="ed-orig">Título original</label><input className="input" id="ed-orig" value={f.orig} onChange={(e) => set("orig", e.target.value)} /></div>
              <div className="ed-row3">
                <div className="field"><label htmlFor="ed-rev">Revista, repositório ou instituição</label><input className="input" id="ed-rev" value={f.rev} onChange={(e) => set("rev", e.target.value)} /></div>
                <div className="field"><label htmlFor="ed-data">Publicado em</label><input className="input" id="ed-data" placeholder="dd/mm/aaaa" value={f.dataFonte} onChange={(e) => set("dataFonte", e.target.value)} /></div>
                <div className="field"><label htmlFor="ed-pmid">PMID <span>se houver</span></label><input className="input" id="ed-pmid" value={f.pmid} onChange={(e) => set("pmid", e.target.value)} /></div>
              </div>
              <div className="field"><label htmlFor="ed-url">Link da fonte</label><input className="input" id="ed-url" placeholder="https://…" value={f.url} onChange={(e) => set("url", e.target.value)} /><small>É para onde o leitor vai ao clicar em “Ler a fonte”. Com DOI, o link sai automático.</small></div>
            </div>
          )}

          <div className="ed-card">
            <h2>Chamada</h2>
            <p>Título e linha fina aparecem na home, no topo da matéria, no Google e no WhatsApp.</p>
            <div className="field"><label htmlFor="ed-titulo">Título <span className={f.titulo.length > 65 ? "over" : ""}>{f.titulo.length}/65</span></label><input className="input" id="ed-titulo" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} /></div>
            <div className="field"><label htmlFor="ed-fina">Linha fina <span className={f.fina.length > 160 ? "over" : ""}>{f.fina.length}/160</span></label><textarea className="textarea" id="ed-fina" rows={3} value={f.fina} onChange={(e) => set("fina", e.target.value)} /><small>O resumo da matéria. Aparece abaixo do título, na busca do Google e na prévia ao compartilhar.</small></div>
            <div className="ed-row">
              {m?.status === "publicada" && (
                <div className="field" style={{ gridColumn: "1/-1" }}>
                  <label htmlFor="ed-correcao">Nota de correção <span className={f.correcao.length > 300 ? "over" : ""}>{f.correcao.length}/300</span></label>
                  <input className="input" id="ed-correcao" maxLength={300} placeholder="Ex.: a versão anterior dizia 2 horas; o estudo fala em 3 horas." value={f.correcao} onChange={(e) => set("correcao", e.target.value)} />
                  <small>Só para matéria já publicada. Aparece no fim do texto e marca a data da correção — é o que a política editorial promete ao leitor.</small>
                </div>
              )}
              <div className="field" style={{ gridColumn: "1/-1" }}>
                <label htmlFor="catsel-q">Categoria <span>obrigatória · subcategoria e microcategoria opcionais</span></label>
                <SeletorCategoria valor={cat} onChange={setCat} podeSaude={podeSaude} />
              </div>
              <div className="field" style={{ gridColumn: "1/-1" }}><span className="label-fake">Assinatura</span>
                <div className="assinatura" id="ed-assinatura"><AvatarAutor autor={autorFinal} classe="g-avatar" /><div><b>{autorFinal?.nome ?? "—"}</b><small>{registro(autorFinal) || "Perfil institucional"}</small></div><CadeadoTravado /></div>
              </div>
            </div>
          </div>

          <div className="ed-card">
            <h2>Texto da matéria</h2>
            <p>Selecione um trecho e formate pela barra. Para ajustes avançados, troque para HTML.</p>
            <EditorTexto key={m?.id ?? "nova"} inicial={m?.corpo_html || "<p></p>"} onChange={setCorpo} onImagem={enviarImagemCorpo} />
          </div>

          <div className="ed-card">
            <h2>Capa e tags</h2>
            <p>Foto do Pexels ou imagem própria, nunca figuras do artigo científico. As tags organizam o site e também contam como palavras-chave.</p>
            <div className="capa-row">
              <div className="capa-prev">{capa?.url ? <img id="ed-capa-img" src={capa.url} alt="" /> : <div className="capa-vazia">Sem capa ainda.<br />Use “Buscar foto”.</div>}</div>
              <div>
                <div className="field"><label htmlFor="ed-alt">Descrição da imagem (texto alternativo)</label><input className="input" id="ed-alt" value={f.alt} onChange={(e) => set("alt", e.target.value)} /></div>
                <div className="field"><label htmlFor="ed-cred">Legenda de crédito</label><input className="input" id="ed-cred" readOnly value={capa ? legendaCapa(capa.credito) + (capa.credito?.fonte === "unsplash" ? " (exibida direto do Unsplash)" : "") : ""} /></div>
                <div className="capa-acts"><button className="btn btn-sm" type="button" onClick={() => setModalCapa("pexels")}>Buscar foto</button><button className="btn-ghost btn-sm" type="button" onClick={() => setModalCapa("upload")}>Enviar imagem</button></div>
              </div>
            </div>
            <div className="field" style={{ marginTop: 6 }}>
              <label htmlFor="ed-tag-in">Tags <span id="tags-conta">{tags.length}/8</span></label>
              <div className="tags-in" id="tags-in" onClick={() => document.getElementById("ed-tag-in")?.focus()}>
                <span className="tags-lista">{tags.map((t, i) => <span className="chip" key={t}>{t}<button type="button" aria-label={`Remover tag ${t}`} onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</button></span>)}</span>
                <input id="ed-tag-in" placeholder="Digite uma tag e aperte Enter" autoComplete="off" value={tagIn} onChange={(e) => setTagIn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); adicionarTag(tagIn); setTagIn(""); }
                    else if (e.key === "Backspace" && !tagIn && tags.length) setTags(tags.slice(0, -1));
                  }}
                  onBlur={() => { if (tagIn.trim()) { adicionarTag(tagIn); setTagIn(""); } }} />
              </div>
              <small>Use o que o leitor buscaria: doença, tratamento, substância. Até 8 tags.</small>
            </div>
          </div>

          <div className="ed-card">
            <h2>Google <span className="auto-pill">Automático</span></h2>
            <p>Montado a partir do título, da linha fina, do texto e das tags. Não precisa preencher nada.</p>
            <div className="serp-mini" aria-label="Prévia no Google"><span>pulsocientifico.com.br › {cat.editoria} › {slug}</span><b>{f.titulo || "Título da matéria"}</b><p>{f.fina || "A linha fina aparece aqui."}</p></div>
            <dl className="auto-campos">
              <dt>Endereço</dt><dd><code>/{cat.editoria}/{slug}</code><small>{publicadaAntes ? "Fixo desde a publicação, para não quebrar links já compartilhados." : "Acompanha o título até a matéria ser publicada."}</small></dd>
              <dt>Title tag</dt><dd>Igual ao título</dd>
              <dt>Descrição</dt><dd>Igual à linha fina</dd>
            </dl>
            <div className="field">
              <label htmlFor="ed-kw">Palavra-chave principal <span>{kwManual ? "escolhida por você" : "sugerida pelo sistema"}</span></label>
              <input className="input" id="ed-kw" value={kw} onChange={(e) => { set("kw", e.target.value); setKwManual(e.target.value.trim() !== ""); }} />
              <div className="kw-sug" aria-label="Sugestões de palavra-chave">
                {sugestoes.length ? sugestoes.map((t) => <button key={t} type="button" aria-pressed={semAcento(t) === semAcento(kw)} onClick={() => { set("kw", t); setKwManual(true); }}>{t}</button>)
                  : <small>Escreva o título e a linha fina para ver sugestões.</small>}
              </div>
            </div>
            <ul className="dicas" aria-label="Dicas de SEO">{dicas.map(([ok, bom, ruim]) => <li key={bom} className={ok ? "" : "aviso"}>{ok ? bom : ruim}</li>)}</ul>
          </div>
        </div>

        <aside className="ed-side">
          <div className="ed-card" style={{ paddingBottom: 12 }}>
            <h2>Antes de salvar</h2>
            <p>Atualiza enquanto você escreve.</p>
            <ul className="gate-list" id="gates">{gates.map(([ok, t, e]) => <li key={t} className={ok ? "ok" : "bad"}><i /><span><b>{t}</b>{!ok && e && <em>{e}</em>}</span></li>)}</ul>
          </div>
          <div className="ed-card" style={{ paddingBottom: 16 }}>
            <div className="field"><label htmlFor="ed-status">Status</label>
              <select className="select" id="ed-status" value={f.status} onChange={(e) => set("status", e.target.value as StatusMateria)}>
                <option value="rascunho">Rascunho</option>
                <option value="em_revisao">Em revisão</option>
                {ehStaff && <option value="publicada">Publicada</option>}
                {ehStaff && <option value="arquivada">Arquivada</option>}
                {!ehStaff && m && ["publicada", "arquivada"].includes(m.status) && <option value={m.status} disabled>{m.status === "publicada" ? "Publicada" : "Arquivada"}</option>}
              </select></div>
            {ehStaff && f.status === "publicada" && (!m?.publicada_em || agendada) && (
              <div className="field">
                <label htmlFor="ed-agendar">Publicar em <span>vazio = agora</span></label>
                <input className="input" id="ed-agendar" type="datetime-local" value={agendar} onChange={(e) => setAgendar(e.target.value)} />
                <small>{agendar && new Date(agendar) > new Date() ? "Fica fora do site até a hora marcada." : "Escolha data e hora para agendar a publicação."}</small>
              </div>
            )}
            <div className="ed-actions">
              <button className="btn btn-block" type="button" id="ed-send" disabled={bloqueado || salvando} style={{ opacity: bloqueado ? 0.45 : 1, cursor: bloqueado ? "not-allowed" : "pointer" }} onClick={salvar}>{salvando ? "Salvando…" : rotulo}</button>
              <p className="flow-note" id="ed-fluxo">{ehStaff
                ? "Salvar grava no banco; nenhuma página é criada no código. A assinatura continua sendo a de quem criou a matéria."
                : "Sua matéria fica ligada ao seu perfil, com CRM e RQE, e não pode ser assinada por outra pessoa. Um editor revisa antes de publicar."}</p>
            </div>
          </div>
        </aside>
      </div>

      {modalCapa && (
        <SeletorCapa abaInicial={modalCapa} sugestoes={buscasSugeridas} termoInicial={buscasSugeridas[0] || f.titulo.trim()} slug={slug}
          onFechar={fecharCapa}
          onUsar={(c: CapaEscolhida) => {
            setCapa({ url: c.url, credito: c.credito });
            set("alt", c.alt || "");
            setModalCapa(null);
            toast(({ pexels: "Capa escolhida. Ela é exibida direto do Pexels, com crédito.", pixabay: "Capa escolhida. Escreva a descrição da imagem: o Pixabay só traz tags.", unsplash: "Capa escolhida. Ela é exibida direto do Unsplash, com crédito e link.", upload: "Capa enviada." } as Record<string, string>)[c.credito.fonte ?? "upload"]);
            if (c.credito.fonte === "pixabay") setTimeout(() => document.getElementById("ed-alt")?.focus(), 50);
          }} />
      )}
    </>
  );
}

export default function Editor() {
  const { id } = useParams();
  const { ehStaff, autor, carregando } = useAuth();
  useSeo({ titulo: id ? "Editar matéria" : "Nova matéria", url: "/painel", semIndice: true });
  const { data: m, isLoading } = useQuery({
    queryKey: ["editor", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: linha } = await db.from("materias").select("*, autor:autores(*)").eq("id", id).maybeSingle();
      return (linha as Materia) ?? null;
    },
  });
  // Assinatura de matéria nova: o perfil de quem está logado; a equipe sem perfil próprio assina como Redação
  const { data: redacao } = useQuery({
    queryKey: ["redacao-padrao"],
    enabled: !id && !autor,
    queryFn: async () => ((await db.from("autores").select("*").eq("tipo", "redacao").eq("agente_padrao", true).maybeSingle()).data as Autor) ?? null,
  });

  let conteudo: React.ReactNode;
  if (carregando || (id && isLoading)) conteudo = <Carregando />;
  else if (id && !m) conteudo = <p style={{ padding: "40px 0" }}>Matéria não encontrada, ou é de outro autor. <Link className="link-sm" to="/painel">Voltar</Link></p>;
  else conteudo = <Tela key={m?.id ?? "nova"} m={m ?? null} assinante={m ? m.autor ?? null : autor && autor.ativo !== false ? autor : ehStaff ? redacao ?? null : autor} />;
  return <PainelLayout>{conteudo}</PainelLayout>;
}
