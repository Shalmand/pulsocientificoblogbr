// Categorias (admin): organizar o menu em 3 níveis. Vale na hora, sem mexer no código.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db, msgErro } from "@/lib/db";
import { useCats } from "@/lib/dados";
import { useToast } from "@/lib/toast";
import { useSeo } from "@/lib/seo";
import { semAcento, slugificar } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";
import { PainelLayout } from "@/components/PainelLayout";

const CORES_CAT = ["#0E9F6E", "#12806A", "#0F766E", "#0B83A8", "#1D64D8", "#1E3A8A", "#4338CA", "#334155"];
const NIVEL_NOME: Record<number, string> = { 1: "categoria", 2: "subcategoria", 3: "microcategoria" };
const ROTAS_RESERVADAS = ["autor", "painel", "entrar", "conta", "completar", "parceiros", "parceria", "sobre", "politica-editorial", "politica-de-privacidade", "termos-de-uso", "cookies", "anuncie", "busca", "sitemap", "api", "categoria", "marca", "capas", "tag", "feed", "novidades"];
const CAMPO: Record<number, string> = { 1: "editoria", 2: "subcategoria", 3: "microcategoria" };
type Sel = { modo: "editar"; slug: string } | { modo: "nova"; pai: string | null; nivel: 1 | 2 | 3 } | null;

function useContagemTodas() {
  return useQuery({
    queryKey: ["contagem-categorias"],
    queryFn: async () => {
      const { data } = await db.from("materias").select("editoria, subcategoria, microcategoria");
      const n = new Map<string, number>();
      (data ?? []).forEach((m: Record<string, string | null>) => ["editoria", "subcategoria", "microcategoria"].forEach((k) => { const s = m[k]; if (s) n.set(s, (n.get(s) ?? 0) + 1); }));
      return n;
    },
  });
}

function EditorCategoria({ sel, onFechar }: { sel: Exclude<Sel, null>; onFechar: (novoSlug?: string) => void }) {
  const cats = useCats();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: contagem } = useContagemTodas();
  const x = sel.modo === "editar" ? cats.acharCat(sel.slug) : undefined;
  const nivel = (x ? x.nivel : sel.modo === "nova" ? sel.nivel : 1) as 1 | 2 | 3;
  const tipo = NIVEL_NOME[nivel];
  const [nome, setNome] = useState(x?.nome ?? "");
  const [descricao, setDescricao] = useState(x?.descricao ?? "");
  const [pai, setPai] = useState<string | null>(x ? x.pai : (sel as { pai: string | null }).pai);
  const [cor, setCor] = useState(x?.cor || CORES_CAT[0]);
  const [ativa, setAtiva] = useState(x?.ativa !== false);
  const [erro, setErro] = useState("");
  useEffect(() => { document.getElementById("cat-nome")?.focus(); }, []);
  const qtd = x ? contagem?.get(x.slug) ?? 0 : 0;
  const slugNovo = x ? x.slug : slugificar(nome) || "nome";
  const recarregar = () => { qc.invalidateQueries({ queryKey: ["categorias"] }); qc.invalidateQueries({ queryKey: ["contagem-categorias"] }); qc.invalidateQueries({ queryKey: ["publicadas"] }); };

  const salvar = async () => {
    const n = nome.trim(), d = descricao.trim();
    if (n.length < 3) return setErro("Escreva um nome com pelo menos 3 letras.");
    if (cats.filhos(pai, true).some((c) => c !== x && semAcento(c.nome) === semAcento(n))) return setErro(`Já existe uma ${tipo} com esse nome${pai ? ` em ${cats.nomeCat(pai)}` : ""}.`);
    if (x) {
      const mudouPai = nivel > 1 && pai !== x.pai;
      const dados: Partial<Categoria> = { nome: n, descricao: d || null, ativa, ...(nivel === 1 ? { cor } : {}), ...(mudouPai ? { pai, ordem: cats.filhos(pai, true).length + 1 } : {}) };
      const r = await db.from("categorias").update(dados).eq("slug", x.slug);
      if (r.error) return setErro(msgErro(r.error));
      if (mudouPai) {
        // as matérias acompanham a mudança de lugar
        const novo = cats.acharCat(pai!);
        const upd = nivel === 2 ? { editoria: pai } : { subcategoria: pai, editoria: novo?.pai };
        const r2 = await db.from("materias").update(upd).eq(CAMPO[nivel], x.slug);
        if (r2.error) toast(msgErro(r2.error));
      }
      toast(`“${n}” salva.`);
      recarregar(); onFechar(x.slug);
    } else {
      const slug = slugificar(n);
      if (ROTAS_RESERVADAS.includes(slug)) return setErro(`O endereço “${slug}” é reservado pelo site. Escolha outro nome.`);
      if (cats.acharCat(slug)) return setErro(`O endereço “${slug}” já está em uso. Escolha outro nome.`);
      const { count } = await db.from("materias").select("*", { count: "exact", head: true }).eq("slug", slug);
      if (count) return setErro(`O endereço “${slug}” já está em uso. Escolha outro nome.`);
      const r = await db.from("categorias").insert({ slug, nome: n, descricao: d || null, ativa, pai, nivel, ordem: cats.filhos(pai, true).length + 1, cor: nivel === 1 ? cor : null });
      if (r.error) return setErro(msgErro(r.error));
      toast(`${tipo[0].toUpperCase() + tipo.slice(1)} “${n}” criada.`);
      recarregar(); onFechar(slug);
    }
  };

  const excluir = async () => {
    if (!x) return;
    if (qtd) return setErro(`Não dá para excluir: ${qtd} matéria${qtd === 1 ? "" : "s"} usa${qtd === 1 ? "" : "m"} esta ${tipo}.`);
    if (cats.filhos(x.slug, true).length) return setErro(`Exclua ou mova o que está dentro desta ${tipo} antes.`);
    if (!window.confirm(`Excluir “${x.nome}”?`)) return;
    const r = await db.from("categorias").delete().eq("slug", x.slug);
    if (r.error) return setErro(msgErro(r.error));
    const irmas = cats.filhos(x.pai, true).filter((c) => c.slug !== x.slug);
    await Promise.all(irmas.map((c, i) => db.from("categorias").update({ ordem: i + 1 }).eq("slug", c.slug)));
    toast(`“${x.nome}” excluída.`);
    recarregar(); onFechar();
  };

  if (sel.modo === "editar" && !x) return <div className="pad"><p className="cat-aviso">Atualizando…</p></div>;
  return (
    <>
      <header><h2>{x ? `Editar ${tipo}` : `Nova ${tipo}${pai ? ` em ${cats.nomeCat(pai)}` : ""}`}</h2></header>
      <div className="pad">
        <div className="field"><label htmlFor="cat-nome">Nome</label><input className="input" id="cat-nome" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="field"><label>Endereço</label><div className="assinatura" style={{ minHeight: 0, padding: "9px 12px" }}><code style={{ font: "500 12.5px ui-monospace,Consolas,monospace", color: "var(--ink)", wordBreak: "break-all" }}>pulsocientifico.com.br/{nivel > 1 && pai ? cats.caminhoTxt(pai) + "/" : ""}{slugNovo}</code></div><small>{x ? "O nome do endereço fica fixo depois de criado, para não quebrar links." : "Gerado a partir do nome."}</small></div>
        {nivel > 1 && (
          <div className="field"><label htmlFor="cat-pai">Dentro de</label>
            <select className="select" id="cat-pai" value={pai ?? ""} onChange={(e) => setPai(e.target.value)}>
              {nivel === 2 ? cats.principais(true).map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)
                : cats.principais(true).map((t) => <optgroup key={t.slug} label={t.nome}>{cats.filhos(t.slug, true).map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}</optgroup>)}
            </select>{x && <small>Mudar de lugar muda o endereço e leva junto as matérias.</small>}</div>
        )}
        <div className="field"><label htmlFor="cat-desc">Descrição <span>{descricao.length}/200</span></label><textarea className="textarea" id="cat-desc" rows={3} maxLength={200} value={descricao} onChange={(e) => setDescricao(e.target.value)} /><small>Aparece no topo da página da {tipo} e na busca do Google.</small></div>
        {nivel === 1 && (
          <div className="field"><span className="label-fake">Cor</span>
            <div className="cores" role="radiogroup" aria-label="Cor da categoria">{CORES_CAT.map((c) => <label key={c}><input type="radio" name="cat-cor" value={c} checked={cor === c} onChange={() => setCor(c)} /><span style={{ "--c": c } as React.CSSProperties} /></label>)}</div>
            <small>Vale também para as subcategorias e microcategorias de dentro.</small></div>
        )}
        <label className="check-sm" style={{ margin: "4px 0 16px" }}><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Mostrar no menu e no site</label>
        {erro && <p className="cat-aviso">{erro}</p>}
        <div className="save-bar">
          <button className="btn" type="button" onClick={salvar}>{x ? "Salvar" : "Criar"}</button>
          {x && <button className="btn-ghost btn-perigo" type="button" style={{ flex: 1 }} onClick={excluir}>Excluir</button>}
          <button className="btn-ghost" type="button" style={{ flex: 1 }} onClick={() => onFechar()}>Cancelar</button>
        </div>
        {x && qtd > 0 && <p className="flow-note" style={{ marginTop: 10 }}>{qtd} matéria{qtd === 1 ? "" : "s"} usa{qtd === 1 ? "" : "m"} esta {tipo}. Para excluir, mova as matérias antes; ou desmarque “Mostrar no menu” para ocultar.</p>}
      </div>
    </>
  );
}

function Tela() {
  const cats = useCats();
  const qc = useQueryClient();
  const { data: contagem } = useContagemTodas();
  const [sel, setSel] = useState<Sel>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const tops = cats.principais(true);
  useEffect(() => { if (!abertas.size && tops[0]) setAbertas(new Set([tops[0].slug])); }, [tops.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const mover = async (x: Categoria, d: number) => {
    const irmas = cats.filhos(x.pai, true);
    const i = irmas.indexOf(x), j = i + d;
    if (j < 0 || j >= irmas.length) return;
    [irmas[i], irmas[j]] = [irmas[j], irmas[i]];
    await Promise.all(irmas.map((c, k) => db.from("categorias").update({ ordem: k + 1 }).eq("slug", c.slug)));
    qc.invalidateQueries({ queryKey: ["categorias"] });
  };

  const linha = (x: Categoria, idx: number, total: number) => {
    const qtd = contagem?.get(x.slug) ?? 0, kids = cats.filhos(x.slug, true).length;
    const selecionada = sel?.modo === "editar" && sel.slug === x.slug;
    return (
      <div key={x.slug} className={`cat-linha n${x.nivel}${selecionada ? " sel" : ""}`} style={{ "--c": cats.corCat(x.slug) } as React.CSSProperties}>
        <div className="cat-nome">
          {x.nivel === 1 && <><button type="button" className="cat-abrir" aria-expanded={abertas.has(x.slug)} aria-label={`Mostrar subcategorias de ${x.nome}`}
            onClick={() => setAbertas((s) => { const n = new Set(s); n.has(x.slug) ? n.delete(x.slug) : n.add(x.slug); return n; })}>{abertas.has(x.slug) ? "▾" : "▸"}</button><i /></>}
          <b>{x.nome}</b><code>/{cats.caminhoTxt(x.slug)}</code>
        </div>
        <div className="cat-info">{x.nivel < 3 && <span>{kids} {x.nivel === 1 ? "sub" : "micro"}</span>}<span>{qtd} matéria{qtd === 1 ? "" : "s"}</span><span className={`status ${x.ativa ? "st-pub" : "st-draft"}`}>{x.ativa ? "No menu" : "Oculta"}</span></div>
        <div className="cat-acoes">
          <button type="button" aria-label={`Subir ${x.nome}`} disabled={idx === 0} onClick={() => mover(x, -1)}>↑</button>
          <button type="button" aria-label={`Descer ${x.nome}`} disabled={idx === total - 1} onClick={() => mover(x, 1)}>↓</button>
          <button type="button" aria-label={`Editar ${x.nome}`} onClick={() => setSel({ modo: "editar", slug: x.slug })}>✎</button>
        </div>
      </div>
    );
  };
  const n = (l: number) => cats.todas.filter((c) => c.nivel === l).length;

  return (
    <>
      <div className="app-top">
        <div><h1>Categorias</h1><p>Organize o menu do site. As mudanças valem na hora, sem mexer no código. <span>{n(1)} categorias · {n(2)} subcategorias · {n(3)} microcategorias</span></p></div>
        <button className="btn" type="button" style={{ height: 40 }} onClick={() => setSel({ modo: "nova", pai: null, nivel: 1 })}>Nova categoria</button>
      </div>
      <div className="cats-grid">
        <div className="card-p"><div id="cats-lista">
          {tops.map((c, i) => {
            const subs = cats.filhos(c.slug, true);
            return (
              <div className="cat-grupo" key={c.slug}>
                {linha(c, i, tops.length)}
                {abertas.has(c.slug) && <>
                  {subs.map((sc, j) => {
                    const micros = cats.filhos(sc.slug, true);
                    return (
                      <div key={sc.slug} style={{ display: "contents" }}>
                        {linha(sc, j, subs.length)}
                        {micros.map((mc, k) => linha(mc, k, micros.length))}
                        <button type="button" className="cat-add n3" onClick={() => setSel({ modo: "nova", pai: sc.slug, nivel: 3 })}>+ Microcategoria em {sc.nome}</button>
                      </div>
                    );
                  })}
                  <button type="button" className="cat-add n2" onClick={() => setSel({ modo: "nova", pai: c.slug, nivel: 2 })}>+ Subcategoria em {c.nome}</button>
                </>}
              </div>
            );
          })}
        </div></div>
        <aside className="card-p cat-editor" id="cat-editor" style={{ position: "sticky", top: 20 }}>
          {sel ? <EditorCategoria key={JSON.stringify(sel) + cats.todas.length} sel={sel} onFechar={(slug) => {
            if (slug) { setSel({ modo: "editar", slug }); const r = cats.raizDe(slug); if (r) setAbertas((s) => new Set(s).add(r.slug)); } else setSel(null);
          }} />
            : <div className="pad"><p className="cat-aviso">Clique em ✎ para editar, abra uma categoria com ▸ para ver os níveis de dentro, ou crie uma categoria nova.</p></div>}
        </aside>
      </div>
    </>
  );
}

export default function Categorias() {
  useSeo({ titulo: "Categorias", url: "/painel/categorias", semIndice: true });
  return <PainelLayout nivel="admin"><Tela /></PainelLayout>;
}
