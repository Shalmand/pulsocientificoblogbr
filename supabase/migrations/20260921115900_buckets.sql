-- Pulso Científico — buckets de arquivo (todos públicos para leitura).
-- Quem pode escrever em cada um está nas políticas de storage.objects, na migração de estrutura.
--   capas          capa das matérias e imagens do meio do texto
--   capas-reserva  fotos aprovadas para quando o agente não achar boa opção
--   anuncios       banners das campanhas internas (enviados pelo painel de Publicidade)
--   autores        fotos dos perfis de redação (enviadas pelo painel de Acessos)
--   perfis         foto de leitores e autores (<user_id>.jpg)
insert into storage.buckets (id, name, public) values
  ('capas', 'capas', true),
  ('capas-reserva', 'capas-reserva', true),
  ('anuncios', 'anuncios', true),
  ('autores', 'autores', true),
  ('perfis', 'perfis', true)
on conflict (id) do update set public = excluded.public;
