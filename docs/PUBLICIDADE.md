# Publicidade

Tela **Painel → Publicidade**, só para admin. Tudo fica no banco: trocar o que aparece num
espaço não mexe no código nem gasta crédito do Lovable.

## Como funciona

Cada **espaço** do site tem um modo:

| Modo | O que aparece |
|---|---|
| **AdSense** | Bloco do Google. Se não carregar, pode mostrar o anúncio interno (opção "Se falhar") |
| **Anúncio interno** | Uma campanha sua (venda direta, parceiro, divulgação própria) |
| **Desligado** | Nada. O espaço some da página, sem buraco em branco |

Espaços iniciais: `topo` (728×90, celular 320×100), `entre` (entre seções da home),
`lateral` (300×250, home e matéria) e `meio` (meio do texto da matéria).

### Quando o AdSense "dá errado", o site troca sozinho
O anúncio interno entra no lugar quando:
1. **A conta ainda não foi aprovada** (situação marcada no painel);
2. **O Google não tem anúncio para aquele espaço**: o próprio AdSense marca o bloco com `data-ad-status="unfilled"`;
3. **O leitor usa bloqueador**: o script do Google não carrega em 3 segundos.

### O código colado vai para o site como está
Decisão de 16/09/2026: só o admin (Victor) acessa a tela, então o HTML colado é usado
exatamente como foi colado. Isso também permite usar código de outras redes de anúncio
ou de afiliados, não só AdSense.

O painel ainda lê a conta (`ca-pub-…`) e o número do bloco para avisar se o código veio
incompleto ou de outra conta, mas **não bloqueia** o salvamento.

Cuidado que fica: como esse HTML roda para todos os leitores, a conta admin é a porta de
entrada. Ative **login em duas etapas** no admin e use senha exclusiva.

## O que dá para fazer no painel (Painel → Publicidade)

Tudo daqui vale no site na hora, sem tocar em código.

**AdSense**
- ID do editor e situação da conta (aguardando, aprovada, pausada).
- Por espaço: escolher **AdSense**, **anúncio interno** ou **desligado**.
- Colar o código do bloco. O painel lê o código e mostra a conta, o bloco e o formato que
  encontrou; recusa salvar se o código não tiver `data-ad-client` e `data-ad-slot`, e avisa se
  vier script de outro domínio junto.
- "Se o AdSense não mostrar anúncio, exibir o anúncio interno" — cobre bloqueador, conta ainda
  não aprovada e espaço sem anunciante.
- Prévia do espaço do lado, no tamanho real.

**Anúncios internos**
- Criar, editar, pausar e apagar, sem passar por mim.
- Dois tipos: **anúncio da casa** (o bloco "anuncie aqui", sem imagem) e **venda direta**
  (banner do anunciante).
- Campos: nome interno, anunciante, link de destino (exige https), texto alternativo,
  **imagem enviada pelo próprio painel** em até três formatos (728×90, 300×250, 320×100),
  em quais espaços pode aparecer, período de veiculação, peso no revezamento (1 a 10) e liga/desliga.
- A lista mostra situação calculada — Ativo, Agendado, Encerrado, Pausado — mais exibições,
  cliques e a taxa de clique de cada um.
- Com mais de um anúncio ativo no mesmo espaço, eles se revezam pelo peso.

### Envio da imagem

O banner é enviado ali mesmo, no formulário do anúncio: um botão por formato, com prévia no
tamanho certo, tamanho máximo de 500 KB e aviso quando a proporção não bate com o espaço (a
imagem entra assim mesmo, mas com sobra). Nada de subir arquivo em storage na mão.

Por baixo, no site: o painel manda o arquivo para o bucket `anuncios` como
`<id-da-campanha>/<formato>.<ext>` e guarda o endereço público em `campanhas_internas.imagens`.
Quem pode escrever nesse bucket é só a equipe — é a política `equipe manda arquivo` do
`storage.objects`, que já está no `schema.sql`. Trocar a imagem sobrescreve o arquivo; apagar a
campanha não apaga o arquivo sozinho (limpeza manual, para não perder banner por engano).

Os dois caminhos antigos continuam valendo quando for mais prático — pelo Storage do Lovable ou
pelo terminal daqui:
`node ferramentas/pulso.mjs imagem-url anuncios clinica-x/300x250.jpg https://…`

## Banco

```sql
-- Configuração geral (uma linha só)
create table anuncios_config (
  id               int primary key default 1 check (id = 1),
  adsense_client   text check (adsense_client ~ '^ca-pub-\d{16}$'),
  adsense_situacao text not null default 'aguardando' check (adsense_situacao in ('aguardando','aprovada','pausada')),
  atualizado_em    timestamptz not null default now()
);
insert into anuncios_config default values;

create table espacos_anuncio (
  id               text primary key,               -- topo, entre, lateral, meio
  nome             text not null,
  largura          int, altura int,                -- desktop
  largura_mobile   int, altura_mobile int,
  modo             text not null default 'off' check (modo in ('adsense','interno','off')),
  html_anuncio     text,                           -- código colado, usado como está
  fallback_interno boolean not null default true,
  constraint adsense_tem_codigo check (modo <> 'adsense' or html_anuncio is not null)
);

create table campanhas_internas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  anunciante       text not null,
  link_url         text not null check (link_url ~ '^https://'),
  imagens          jsonb not null,   -- {"300x250": url, "728x90": url, "320x100": url}
  alt              text not null,
  espacos          text[] not null,  -- em quais espaços pode aparecer
  inicio           date,
  fim              date,
  peso             int not null default 1 check (peso between 1 and 10),  -- revezamento
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now()
);

-- Exibições e cliques dos anúncios internos (o AdSense tem relatório próprio)
create table eventos_anuncio (
  id           bigint generated always as identity primary key,
  campanha_id  uuid not null references campanhas_internas(id) on delete cascade,
  espaco       text not null references espacos_anuncio(id),
  tipo         text not null check (tipo in ('exibicao','clique')),
  criado_em    timestamptz not null default now()
);

-- Leitura pública só do necessário; escrita só admin
alter table anuncios_config enable row level security;
create policy "publico le config" on anuncios_config for select using (true);
create policy "admin edita config" on anuncios_config for all using (has_role(auth.uid(),'admin'));

alter table espacos_anuncio enable row level security;
create policy "publico le espacos" on espacos_anuncio for select using (true);
create policy "admin edita espacos" on espacos_anuncio for all using (has_role(auth.uid(),'admin'));

alter table campanhas_internas enable row level security;
create policy "publico le campanhas no ar" on campanhas_internas for select
  using (ativo and (inicio is null or inicio <= current_date) and (fim is null or fim >= current_date));
create policy "admin gerencia campanhas" on campanhas_internas for all using (has_role(auth.uid(),'admin'));

alter table eventos_anuncio enable row level security;
create policy "admin le eventos" on eventos_anuncio for select using (has_role(auth.uid(),'admin'));

-- Visitante registra evento só por esta função (não consegue ler nem apagar a tabela)
create or replace function registrar_evento_anuncio(_campanha uuid, _espaco text, _tipo text)
returns void language sql security definer set search_path = public as $$
  insert into eventos_anuncio (campanha_id, espaco, tipo)
  select _campanha, _espaco, _tipo
  where _tipo in ('exibicao','clique')
    and exists (select 1 from campanhas_internas where id = _campanha and ativo)
$$;
grant execute on function registrar_evento_anuncio to anon, authenticated;

-- Os quatro espaços do site. Começam no anúncio interno: sem campanha paga, aparece o anúncio
-- da casa ("Sua marca perto de quem lê ciência"). Troque para AdSense no painel quando aprovar.
insert into espacos_anuncio (id, nome, largura, altura, largura_mobile, altura_mobile, modo, fallback_interno) values
  ('topo',    'Topo da home',             728, 90,  320, 100, 'interno', true),
  ('entre',   'Entre seções da home',     728, 90,  320, 100, 'interno', true),
  ('lateral', 'Lateral (home e matéria)', 300, 250, 300, 250, 'interno', true),
  ('meio',    'Meio do texto da matéria', 336, 280, 300, 250, 'interno', true)
on conflict (id) do nothing;

-- Exibições e cliques por campanha, para a tabela do painel (só o admin lê eventos_anuncio)
create or replace function resumo_campanhas()
returns table (campanha_id uuid, exibicoes bigint, cliques bigint)
language sql stable security definer set search_path = public as $$
  select campanha_id,
         count(*) filter (where tipo = 'exibicao'),
         count(*) filter (where tipo = 'clique')
    from eventos_anuncio
   where has_role(auth.uid(),'admin')
   group by campanha_id
$$;
```

Imagens dos anúncios internos: bucket público `anuncios`.

## Regra do componente `<EspacoAnuncio id="lateral" />` no site

1. Lê `anuncios_config` e o espaço (cache de 5 minutos).
2. `modo = off` → não renderiza nada.
3. `modo = interno` → sorteia uma campanha do espaço, ponderada pelo `peso`.
4. `modo = adsense`:
   - se `adsense_situacao ≠ aprovada` → vai para o passo 5;
   - insere `html_anuncio` no espaço. Atenção técnica: `innerHTML` **não executa** `<script>`;
     o componente recria cada `<script>` do código (mesmos atributos e conteúdo) para ele rodar.
     O script `adsbygoogle.js` que se repete em cada bloco é carregado só uma vez por página;
   - se houver `<ins class="adsbygoogle">`: `data-ad-status="filled"` → pronto; `"unfilled"` ou nada em 3 s → passo 5;
   - se for código de outra rede (sem `<ins>`): considera ok se o espaço ganhar altura em 3 s; senão, passo 5.
5. Se `fallback_interno` → mostra campanha interna (passo 3); senão, esconde o espaço.
6. Campanha interna: registra `exibicao` quando 50% do anúncio fica visível (IntersectionObserver,
   uma vez por página) e `clique` ao clicar. O link sai com `rel="sponsored noopener"`.
7. Todo espaço mostra o rótulo **"Publicidade"** e reserva a altura antes de carregar,
   para o texto não "pular" (isso também conta no ranking do Google).

## Consentimento de cookies (LGPD)

O aviso de cookies aparece na primeira visita (Aceitar todos · Só os necessários · Personalizar) e
guarda a escolha por 12 meses em `pulso-consentimento`. O link "Preferências de cookies" no rodapé
reabre o aviso. Regras para o componente de anúncio:

- **Antes de qualquer escolha ou sem "publicidade":** carregar o AdSense com
  `(adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1` **antes** do primeiro `push`.
  O site continua exibindo anúncios, só que não personalizados (recurso do Google para a LGPD).
- **Com "publicidade":** carregar normalmente.
- **Google Analytics:** só carrega com "estatisticas".
- Anúncios internos não usam cookies.

Referências: [anúncios personalizados e não personalizados para a LGPD](https://support.google.com/adsense/answer/9956024),
[como o AdSense usa cookies](https://support.google.com/adsense/answer/7549925).

## Uma vez só, na importação (é código fixo)

- **`public/ads.txt`** com a linha que o AdSense fornece:
  `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`
  Precisa ficar na raiz do domínio (`pulsocientifico.com.br/ads.txt`). O ID da conta não muda,
  então não precisa ser editável no painel.
- **Página `/anuncie`**, para onde leva o anúncio interno próprio.
- **Aviso de cookies (LGPD)** conforme a seção acima.

## Regras do AdSense para não perder a conta
- Nunca clicar nos próprios anúncios nem pedir que cliquem.
- Não colocar anúncio que pareça item do menu ou link de matéria.
- Anúncio interno de saúde segue as mesmas regras editoriais: sem promessa de resultado,
  e anunciante médico precisa aparecer com CRM (Resolução CFM 2.336/2023).
