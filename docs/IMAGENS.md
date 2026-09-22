# Capas das matérias

Só fontes **gratuitas**. Nada de IA por enquanto (decisão de 16/09/2026: sem configurar Cloudflare agora).

| Quem escolhe | Fontes |
|---|---|
| **Painel** (admin, editores, médicos parceiros) | **Pexels → Pixabay → Unsplash**, nessa ordem de prioridade · enviar do computador |
| **Agente automático** | Pexels; se nenhuma foto servir, uma reserva aprovada |

## As três fontes

| | Pexels | Pixabay | Unsplash |
|---|---|---|---|
| Uso comercial | Sim | Sim | Sim |
| Crédito | Pedido | Opcional | **Obrigatório, com link** para o fotógrafo e para o Unsplash |
| Onde a capa fica | **Link direto** (decisão de 19/09/2026) | Copiada para o bucket `capas` (**o Pixabay proíbe hotlink**) | **Link direto do Unsplash** (o Unsplash exige) |
| Descrição da foto | Frase em português | Só tags (o autor escreve a descrição) | Frase, geralmente em inglês |
| Limite gratuito | 200 buscas/hora, 20 mil/mês | 100 buscas/minuto | 50 buscas/hora na API; **no Pulso, 10 por dia** |
| Pode usar no agente? | Sim | **Não**: API só para busca feita por pessoa | Não usado |

Legendas na matéria:
- Pexels: *Foto: Nome / Pexels.*
- Pixabay: *Foto: Nome / Pixabay.*
- Unsplash: *Foto de **Nome** no **Unsplash**.* (os dois nomes são links, com `utm_source=pulso_cientifico`)

## Capa por link, não no nosso armazenamento

Decisão de 19/09/2026 (pedido dele): a capa fica no servidor de quem publicou a foto, e o site só
aponta para ela. Isso vale para **Pexels** e **Unsplash**. O que cada um permite, conferido nos
termos em 19/09/2026:

| | Permite link direto? |
|---|---|
| **Unsplash** | **Exige.** A regra deles é usar as URLs da API, não copiar o arquivo |
| **Pexels** | **Permite.** As URLs vêm da API; o que eles pedem é o crédito ao fotógrafo |
| **Pixabay** | **Proíbe** hotlink permanente: "se for usar as imagens, baixe para o seu servidor". Essa continua sendo copiada |

**O risco é real e não tem como eliminar:** se o autor apagar a foto na conta dele, o endereço
para de responder e a capa some — inclusive em matéria antiga, e também na prévia que aparece ao
compartilhar no WhatsApp. Não existe API que garanta link eterno.

O que fazemos a respeito:

1. `verificar-capas` roda toda semana e confere **Unsplash e Pexels**. Capa fora do ar marca a
   matéria com `imagem_quebrada = true`.
2. A matéria marcada aparece no painel para troca, e o site mostra a capa de reserva no lugar.
3. Se um dia você quiser voltar a copiar as do Pexels (capa de matéria importante, que não pode
   quebrar), é só ligar o segredo `COPIAR_PEXELS=1` — o código já trata os dois caminhos.

### Sobre o Unsplash por link
- **Vantagem:** o Unsplash redimensiona pelo próprio link (`w=800` no celular, `w=1600` no computador), rápido e grátis.
- **Armazenamento não é o motivo:** uma capa copiada tem uns 300 KB; uma matéria por dia dá cerca de 110 MB por ano,
  e o plano gratuito tem 1 GB.
- **Risco:** se o fotógrafo apagar a foto no Unsplash, a capa some. A função `verificar-capas` roda uma vez por semana,
  confere os links e marca `imagem_quebrada`; o painel mostra "Capa fora do ar" para alguém trocar.
- **Regras embutidas:** ao escolher a foto, o sistema avisa o Unsplash (exigência deles); fotos pagas (Unsplash+) não aparecem.

## Prioridade e limite

**Ordem: Pexels > Pixabay > Unsplash.**
- A janela abre sempre no **Pexels**, já com a busca feita.
- Embaixo dos resultados aparece "Não achou? Tentar no Pixabay →"; no Pixabay, "Última opção: Unsplash".
- O **Unsplash nunca busca sozinho**: a aba mostra quantas buscas restam e pede um clique para buscar.

**Unsplash: no máximo 10 buscas por dia**, somando todos os usuários do painel. Zera à meia-noite de Brasília.
Busca repetida no mesmo dia vem do cache e não conta. Controle no banco (`uso_busca_fotos` e
`reservar_busca_foto`), então ninguém passa do limite nem abrindo duas abas ao mesmo tempo.
Pexels e Pixabay não têm limite próprio além do das APIs.

## No painel: escolher a capa

No editor, bloco **Capa e tags**: **Buscar foto** abre a janela nas abas Pexels / Pixabay / Unsplash; **Enviar imagem** abre o upload.

1. A busca já abre com a **palavra-chave principal**; as **tags** viram buscas sugeridas. Busca em português.
2. Cada foto recebe uma nota e as **3 melhores vêm marcadas "Sugerida"**:
   começa pela relevância da fonte; ganha pontos por formato próximo de 16:9 e alta resolução;
   perde por pessoa, **rosto em destaque** ou **texto escrito** (lidos na descrição ou nas tags).
3. Filtros ligados por padrão escondem rosto em destaque e texto escrito. Foto com pessoa fica, com aviso.
4. A busca é livre para qualquer termo. Buscas ficam guardadas 24 h (exigência do Pixabay; poupa cota).
5. Ao escolher: descrição da imagem preenchida quando a fonte tem frase (Pexels, Unsplash) e legenda automática.

Os filtros leem texto, não a imagem: uma foto com letras pode escapar se a descrição não disser. A escolha final é de quem edita.

**Enviar do computador:** JPG, PNG ou WebP, mínimo 1200 × 675, até 8 MB, com crédito e confirmação de direito de uso
(e de que não aparece paciente identificável).

O editor não deixa salvar sem capa e sem descrição da imagem.

## No agente: capa automática

Função `gerar-capa`:
1. Busca no **Pexels** as expressões enviadas pelo agente (palavra-chave, depois tags), em português.
2. Descarta fotos com rosto, texto ou termos vetados (sangue, ferida, cirurgia, logo...).
3. Fica com a de melhor nota e copia para o bucket `capas`.
4. Se nenhuma servir: sorteia uma imagem de `capas-reserva/<editoria>/`, que você aprova antes.
5. Se nem isso existir: a matéria vai para revisão sem capa.

## Passo a passo das chaves (gratuitas)

### Pexels e Pixabay — já feitos
As chaves estão no `.env` e funcionando.

### Unsplash — já feito
A chave está no `.env` e funcionando. Para referência, o caminho foi:
1. Crie uma conta grátis em **unsplash.com**.
2. Entre em **unsplash.com/oauth/applications** → **New Application** → aceite os termos da API.
3. Nome: Pulso Científico. Descrição: blog de saúde que usa fotos como capa das matérias, com crédito.
4. Na página do aplicativo criado, copie a **Access Key** (não a Secret Key).
5. Cole no `.env`, na linha `UNSPLASH_ACCESS_KEY=`.
6. Ele começa no modo "Demo" (50 buscas por hora). Com o site no ar, dá para pedir "Production"
   enviando prints da legenda com crédito; o limite sobe para 5 mil por hora.

Depois de colar a chave, rode na **aba Terminal**, dentro da pasta `pulso-cientifico`:
```
node ferramentas/fotos-prototipo.mjs
```
Ele traz resultados reais das fontes conectadas para o protótipo. Me avise para eu publicar.

### No Lovable (na importação)
**Cloud → Secrets:** `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY`, `AGENTE_CHAVE`.
**Armazenamento:** buckets públicos `capas` e `capas-reserva` (uma pasta por editoria, com 5 a 10 imagens aprovadas).
**Agendamento:** `verificar-capas` uma vez por semana.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `supabase/functions/fotos-capa/index.ts` | Busca nas três fontes para o painel e aplica a foto escolhida |
| `supabase/functions/gerar-capa/index.ts` | Capa automática do agente (Pexels → reserva) |
| `supabase/functions/verificar-capas/index.ts` | Checagem semanal das capas do Unsplash |
| `ferramentas/fotos-prototipo.mjs` | Traz resultados reais para o protótipo |
| `ferramentas/buscar-fotos-pexels.mjs` | Capas iniciais das 5 matérias do banco fixo |

### Chamada da função do agente
```http
POST /functions/v1/gerar-capa
x-agente-chave: <AGENTE_CHAVE>

{
  "slug": "anticorpo-contra-a-dengue-reduz-virus-e-febre-em-estudo-inicial",
  "editoria": "doencas",
  "imagem": {
    "buscas": ["dengue", "mosquito da dengue"],
    "alt": "Mosquito Aedes aegypti pousado sobre superfície clara"
  }
}
```

Fontes consultadas em 16/09/2026: [Pexels API](https://help.pexels.com/hc/en-us/articles/47677890260761-Is-the-Pexels-API-free-to-use),
[Pixabay API](https://pixabay.com/api/docs/), [licença Pixabay](https://pixabay.com/service/terms/),
[regras da API do Unsplash](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).
