-- Knowledge base for source-grounded agronomy recommendations.
create extension if not exists vector with schema extensions;

create table if not exists public.agronomy_knowledge_chunks (
  id bigint generated always as identity primary key,
  document_key text not null,
  chunk_index integer not null,
  source_name text not null,
  source_section text not null default 'Tài liệu tổng hợp',
  source_locator text not null,
  content text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  unique (document_key, chunk_index)
);

create index if not exists agronomy_knowledge_chunks_embedding_idx
  on public.agronomy_knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.agronomy_knowledge_chunks enable row level security;
revoke all on public.agronomy_knowledge_chunks from anon, authenticated;
grant select, insert, update, delete on public.agronomy_knowledge_chunks to service_role;

create or replace function public.match_agronomy_knowledge(
  query_embedding extensions.vector(768),
  match_count integer default 5,
  minimum_similarity real default 0.35
)
returns table (
  id bigint,
  source_name text,
  source_section text,
  source_locator text,
  content text,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    k.id,
    k.source_name,
    k.source_section,
    k.source_locator,
    k.content,
    (1 - (k.embedding OPERATOR(extensions.<=>) query_embedding))::real as similarity
  from public.agronomy_knowledge_chunks as k
  where 1 - (k.embedding OPERATOR(extensions.<=>) query_embedding) >= minimum_similarity
  order by k.embedding OPERATOR(extensions.<=>) query_embedding
  limit greatest(1, least(match_count, 8));
$$;

revoke all on function public.match_agronomy_knowledge(extensions.vector, integer, real) from public, anon, authenticated;
grant execute on function public.match_agronomy_knowledge(extensions.vector, integer, real) to service_role;
