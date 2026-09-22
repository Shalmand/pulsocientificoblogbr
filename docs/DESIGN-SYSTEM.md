# Design System — Pulso Científico

Base: **Portal Publicitário** (portalpublicitario.com.br), medido direto do código do site
em 16/09/2026. O site deles é **WordPress 7.1 + tema SmartMag (ThemeSphere) + Elementor**.

Regra: estrutura, tipografia, raios, sombras e espaçamentos são **idênticos** ao original.
Só a paleta mudou (laranja → verde saúde, azul-marinho mantido como azul). Os tokens abaixo
são os mesmos que estão no `:root` de `docs/prototipo.html`.

## Tipografia

| Papel | Fonte | Tamanho / peso / entrelinha | Original medido |
|---|---|---|---|
| Logo, menu, meta, badges, títulos de seção | **Outfit** | — | Outfit |
| Títulos de matéria e corpo de texto | **Inter** | — | Inter |
| Menu | Outfit | 13.8px / 600 / ls .14px | igual |
| Título destaque (sobre imagem) | Inter | 27–34px / 700 / 1.2, ls -.5px | 27px / 700 |
| Título card | Inter | 18px / 600 / 1.4 | — |
| Título lista lateral | Inter | 16px / 600 / 1.45 | 15px / 600 |
| H1 da matéria | Inter | 37.8px / 800 / 1.3, ls -.38px | igual |
| H2 dentro da matéria | Outfit | 24.9px / 700 / 1.5 | igual |
| Parágrafo da matéria | Inter | 16.6px / 400 / 1.7, ls -.08px, largura máx. 750px | igual |
| Título de bloco ("Últimas Notícias") | Outfit | 19px / 700 (22px nas seções de editoria) | igual |
| Badge de categoria | Outfit | 11px / 600, CAIXA ALTA, ls .66px | igual |
| Meta (autor, data, leitura) | Outfit | 12px / 400 | igual |
| Breadcrumb | Outfit | 12px, cor muted | igual |
| Botão | Outfit | 12px / 600, CAIXA ALTA, ls .36px, altura 34px | igual |

Google Fonts: `Inter:400,500,600,700,800` + `Outfit:400,500,600,700,800`.

## Cores

### Tema claro
| Token | Hex | Uso | Substitui no original |
|---|---|---|---|
| `--brand` | `#0E9F6E` | botão, sublinhado do menu, links, destaques | `#F6A01A` (laranja) |
| `--brand-strong` | `#0A7F58` | hover do botão | — |
| `--blue` | `#1D64D8` | links de fonte, editoria Doenças | — |
| `--navy` | `#0C2340` | logo ("científico"), menu | `#142142` |
| `--ink` | `#141A21` | títulos | `#161616` |
| `--text` | `#434B53` | texto corrido secundário | `#444444` |
| `--muted` | `#88929C` | meta, breadcrumb | `#999999` |
| `--line` | `#E4E9EE` | divisórias | `#E2E2E2` |
| `--surface` | `#F4F8F9` | fundo do item ativo no menu, caixas | — |
| `--tint` / `--tint-line` | verde 8% / 26% | resumo em 30 segundos, item ativo do painel | laranja 8% / 25% |
| `--footer-bg` | `#0B1F36` | rodapé | — |

### Cores por editoria (badge)
| Editoria | Hex |
|---|---|
| Estudos | `#0E9F6E` |
| Doenças | `#1D64D8` |
| Nutrição | `#12806A` |
| Saúde Mental | `#0B83A8` |
| Medicamentos | `#2B4FB8` |

### Tema escuro
**O site abre sempre no tema claro**, mesmo se o celular do leitor estiver no modo escuro.
O escuro só liga quando o leitor toca na lua (classe `dark` no `<html>`, escolha salva no
navegador dele). Tokens em `docs/prototipo.html`
(`--bg #0C131A`, `--surface #121C25`, `--brand #2BC48E`, `--ink #EEF3F7`).

## Formas e sombras

| Token | Valor | Original |
|---|---|---|
| `--r-badge` | 5px | 5px |
| `--r-btn` | 6px | 6px |
| `--r-media` | 10px (imagens e cards) | 10px |
| `--r-pill` | 20px (pílulas) | 20px |
| `--shadow-media` | `0 2px 6px -1px rgba(9,30,52,.16), 0 8px 18px -8px rgba(9,30,52,.24)` | `0 2px 6px -1px rgba(7,10,25,.2), 0 6px 12px -6px rgba(7,10,25,.2)` (suavizada) |
| `--shadow-head` | `0 3px 4px 0 rgba(0,0,0,.03)` | `rgba(0,0,0,.02)` |
| `--shadow-btn` | `0 2px 7px -4px rgba(0,0,0,.18)` | igual |
| Header | 70px de altura, fixo no topo | 70px |
| Container | 1240px | ~1200px |

Animação: `cubic-bezier(.32,.72,0,1)` em hovers (zoom de 4,5% na imagem, cor no título).

## Componentes (nomes do SmartMag entre parênteses)

1. **Header** — logo, menu com item ativo em fundo cinza e barra de 3px embaixo, lua, lupa. Sem pílula "em alta" e sem botão de newsletter (removidos a pedido).
2. **Destaque grande** (`grid-overlay`) — imagem 16:8, gradiente escuro embaixo, badge colado no canto superior esquerdo, título branco.
3. **Card** (`grid-card`) — imagem em cima com badge encostado na base, título + meta embaixo, sombra.
4. **Lista lateral "Últimas Notícias"** (`list small`) — categoria em texto colorido, título, meta, miniatura quadrada à direita.
5. **Mais Lidas** — numeração vazada em verde (a ordem é o ranking real).
6. **Grade de editoria** — 4 colunas.
7. **Lista grande** (`list`) — imagem à esquerda, título + resumo à direita.
8. **Página da matéria** — breadcrumb, badge, H1, linha fina, meta, compartilhar, imagem, conteúdo 750px, sidebar 340px fixa.
9. **Blocos exclusivos de saúde** (não existem no original):
   - *Texto grande* (`p.texto-grande`) — Inter 21px/700, para uma frase de destaque no meio do texto.
   - *Caixa de destaque* (`div.caixa-destaque`) — fundo `--tint`, borda `--tint-line`, raio 10px.
   - *Número em destaque* (`div.numero-destaque`) — número em Outfit 44px/700 verde, explicação ao lado, linhas em cima e embaixo. Opcional.
   - *Fonte original* — citação completa, link DOI e PubMed.
   - *Aviso* — "não substitui consulta".
10. **Espaços de AdSense** — 728×90 topo e entre seções, 300×250 na sidebar, 1 anúncio no meio do texto.

## Implementação no Lovable

**Já implementado.** Os tokens estão como variáveis CSS em `src/styles/pulso.css` (bloco `:root` e
tema escuro, copiados do protótipo sem alteração) e as fontes vêm do Google Fonts no `index.html`.
Não crie `index.css` nem mova os tokens. Regra que continua valendo: **não redesenhe** — proibido trocar paleta, fontes, raios, sombras ou usar biblioteca de
componentes com visual próprio. A fonte, o aviso e o anúncio (`.source`,
`.disclaimer`, `.ad`) viram componentes React. O corpo é HTML do banco, exibido dentro de
`.content` depois de passar pelo sanitizador; os blocos `.texto-grande`, `.caixa-destaque` e
`.numero-destaque` são só CSS.

**Editor do painel:** usar **TipTap** (livre, sem visual próprio) com a mesma barra do protótipo
(estilo do parágrafo, negrito, itálico, sublinhado, listas, link, caixa de destaque, número em
destaque, limpar) e a alternância Visual / HTML. O visual do editor usa os tokens deste arquivo.
