# Fontes do agente — o que existe de graça, o que dá e o que não dá

Testado em **18/09/2026** com consultas reais (o resultado de cada teste está anotado abaixo).
A configuração vive em `banco/fontes.json` e a coleta é a função `coletar-pauta`.

## O que o agente precisa de cada fonte

Para escrever uma matéria honesta, o agente precisa de **título + resumo (abstract) + autores +
data + link**. Só metadado não serve: sem resumo, ele teria que inventar ou copiar da imprensa.
Por isso a pergunta que separa uma fonte boa de uma inútil é sempre a mesma: **ela entrega o
resumo de graça?**

## O mapa

| Fonte | Chave? | Limite | Entrega resumo? | Serve para |
|---|---|---|---|---|
| **PubMed** (E-utilities) | não | 3 req/s (10 com chave gratuita) | **sim** | Saúde (JAMA e JAMA Network Open) |
| **arXiv** | não | 1 pedido a cada 3 s, 1 conexão | **sim, completo** | IA, tecnologia, espaço (preprints) |
| **Europe PMC** | não | uso justo, sem limite publicado | **sim**, nas abertas | Natureza, biologia, revistas abertas do grupo Nature |
| **Crossref** | não (`mailto` = fila melhor) | sem limite fixo; polite pool é mais rápido | **depende da revista** | Clima (revistas abertas), radar de qualquer DOI |
| **NASA APIs + RSS** | RSS não; APIs com chave grátis (1.000/h) | DEMO_KEY: 30/h | **sim** (comunicado inteiro) | Espaço |
| **images-api.nasa.gov** | não | — | — | **capas de espaço em domínio público** |
| **OpenAlex** | hoje não, mas anunciaram cobrança | créditos grátis e depois pago | sim (resumo em índice invertido) | **filtro por país** — é o que traz a pesquisa chinesa |
| **Springer Nature API** | sim (grátis) | 100 req/min | sim, só no acervo aberto | reforço para revistas do grupo |

## O que mudou o plano: Nature e Science não entregam resumo

Era o caminho óbvio e não funciona. No teste de 18/09/2026:

| Consulta | Resultado |
|---|---|
| Crossref, ISSN da **Nature**, últimos 7 dias | 5 artigos, **0 com resumo** |
| Europe PMC, `JOURNAL:"Nature"`, últimos 10 dias | 8 artigos, **0 com resumo aproveitável** |
| Europe PMC, `JOURNAL:"Science"` | 8 artigos, **1 com resumo** |
| Europe PMC, `JOURNAL:"Nature Communications"` | 8 artigos, **7 com resumo** |
| Crossref, Environmental Research Letters (aberta) | 5 artigos, **5 com resumo** |

A regra que aparece aí é simples: **revista fechada não deposita resumo; revista aberta
deposita**. Então:

- **Nature e Science principais ficam de fora da escrita.** A fonte `crossref-nature-radar` existe
  em `fontes.json`, mas desligada: serve para saber o que saiu, não para escrever.
- **As irmãs abertas entram**: Nature Communications, Scientific Reports, Communications Biology,
  Communications Earth & Environment, Environmental Research Letters. São do mesmo grupo, passam
  por revisão por pares e entregam tudo de graça.
- Quando um estudo da Nature merecer matéria, o caminho honesto é escrever a partir do
  **comunicado da instituição que fez a pesquisa** (universidade, agência), citando os dois.
  Isso é trabalho manual por enquanto; não automatizei.

## Pauta vinda da China

Pedido de 18/09/2026. Três caminhos, testados no mesmo dia:

| Caminho | O que achou | Vale? |
|---|---|---|
| **OpenAlex** com `institutions.country_code:cn` | **184 artigos de IA com resumo em 6 dias**; 45 em hardware e redes | **sim — é o único filtro de país que existe de graça** |
| **arXiv** procurando os modelos chineses (DeepSeek, Qwen, Kimi, InternLM, GLM…) | 25 de 25 resultados recentes | **sim**, é o que pega o que o mercado comenta |
| **arXiv** procurando o nome das universidades ("Tsinghua University"…) | 0 recentes | **não**: o arXiv não indexa a instituição |
| **Europe PMC** com `AFF:"China"` + IA no título | 10 achados, 7 com resumo | serve, mas é IA dentro da medicina → régua de saúde, fica desligada |
| **National Science Review** (revista da Academia Chinesa) via Crossref | 5 de 5 com resumo | sim, publica pouco, então a janela é de 20 dias |
| **CAS** (Academia Chinesa), RSS de notícias | nenhum endereço respondeu | não |

Ficaram **quatro fontes chinesas ligadas**: duas do OpenAlex (IA e tecnologia), uma do arXiv (modelos)
e a National Science Review.

Duas coisas para saber:

- **OpenAlex responde sem chave hoje** (testado, 200 OK), mas eles anunciaram cobrança por crédito.
  Se um dia der 403 ou 429, é só criar a chave gratuita e colar como `OPENALEX_API_KEY`. A função
  já manda a chave quando ela existe.
- **Não coloquei mídia estatal chinesa** (Xinhua, China Daily, Global Times) como fonte. São veículos
  de Estado: servem para saber o que o governo anuncia, não como fonte científica. O que entra aqui
  é o artigo com DOI e resumo, venha de onde vier.

## Fonte por área

| Área | Fonte | Tipo |
|---|---|---|
| Saúde | JAMA + JAMA Network Open, via PubMed | estudo revisado |
| Inteligência artificial | arXiv `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV` + OpenAlex China + arXiv modelos chineses | **preprint** e estudo |
| Tecnologia | arXiv `cs.CR`, `cs.RO`, `cs.DC`, `eess.SY` + OpenAlex China + National Science Review | **preprint** e estudo |
| Espaço | arXiv `astro-ph` + comunicados da NASA | preprint e comunicado |
| Clima e meio ambiente | Environmental Research Letters, Communications Earth & Environment (Crossref) | estudo revisado |
| Natureza | Nature Communications, Scientific Reports e biodiversidade (Europe PMC) | estudo revisado |

## Preprint não é estudo publicado

Metade das fontes novas é preprint (arXiv). A regra editorial, que já está na política e agora
vale para o agente:

- a matéria **diz no texto** que o trabalho ainda não passou por revisão por pares;
- o campo `fonte.tipo` grava `preprint`, e a nota da pauta perde meio ponto;
- **preprint não entra em Saúde**, nunca.

## Licença do que a gente reaproveita

| Fonte | Texto | Imagem |
|---|---|---|
| PubMed / Europe PMC | resumo é do autor/revista: a gente **reescreve**, não copia | — |
| arXiv | metadados em CC0; resumo é do autor: reescrever | figuras do artigo **não** |
| NASA | domínio público nos EUA | **domínio público**, menos o logo e pessoas identificáveis |
| ESA | crédito obrigatório | CC BY-SA 3.0 IGO — obriga a mesma licença no que publicarmos |
| Crossref | metadados livres | — |

Por isso a ESA está desligada: a licença dela contamina o que o site publicar em volta.

## Como a coleta funciona

```
POST /functions/v1/coletar-pauta      (cabeçalho x-agente-chave)
{ "editoria": "espaco", "limite": 10 }     ← os dois são opcionais
```

1. Varre as fontes ativas da área (ou todas).
2. Descarta o que já está em `pautas_processadas` — nada é oferecido duas vezes.
3. Descarta o que veio sem resumo aproveitável (menos de 280 caracteres).
4. Dá nota a cada pauta: recência, ligação com o Brasil, tamanho do estudo, tipo de trabalho,
   resultado inédito. Preprint perde ponto; comunicado oficial ganha.
5. Devolve as melhores, com os motivos da nota em português.

Uma fonte fora do ar não derruba a coleta: ela volta em `falhas` e o resto segue.

## Chaves (opcionais)

Nenhuma é obrigatória. No `.env` e nos segredos do Lovable:

| Segredo | Para quê |
|---|---|
| `CROSSREF_MAILTO` | e-mail de contato; coloca a gente na fila rápida do Crossref |
| `NASA_API_KEY` | só se formos usar as APIs de dados da NASA (o RSS não pede) |
| `OPENALEX_API_KEY` | só se o OpenAlex passar a exigir (hoje responde sem) |
| `NCBI_API_KEY` | sobe o PubMed de 3 para 10 pedidos por segundo |

Como sempre: você cola no `.env`, eu não gravo chave nenhuma.

## Fontes que ficaram de fora, e por quê

- **Mídia estatal chinesa** (Xinhua, China Daily, Global Times) — veículo de Estado não é fonte
  científica. Para saber o que sai da China, usamos o artigo com DOI, não o comunicado político.
- **EurekAlert!, ScienceDaily, Phys.org** — agregadores de comunicado. O texto é de terceiros e o
  uso automatizado esbarra nos termos deles.
- **Scopus, Web of Science, Dimensions** — pagos.
- **Raspar site de revista** — contra os termos de uso e frágil. Não entra.
