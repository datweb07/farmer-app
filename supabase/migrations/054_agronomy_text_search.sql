-- Move RAG retrieval to PostgreSQL full-text search so indexing/querying need
-- no external embedding API. The old vector column is retained for rollback,
-- but new rows no longer need to populate it.
alter table public.agronomy_knowledge_chunks
  alter column embedding drop not null;

alter table public.agronomy_knowledge_chunks
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('simple'::regconfig, coalesce(source_section, '') || ' ' || content)
  ) stored;

create index if not exists agronomy_knowledge_chunks_search_idx
  on public.agronomy_knowledge_chunks using gin (search_vector);

create or replace function public.search_agronomy_knowledge(
  query_text text,
  match_count integer default 5
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
  with query_terms as (
    select to_tsquery(
      'simple'::regconfig,
      nullif(array_to_string(
        tsvector_to_array(to_tsvector('simple'::regconfig, coalesce(query_text, ''))),
        ' | '
      ), '')
    ) as value
  )
  select
    k.id,
    k.source_name,
    k.source_section,
    k.source_locator,
    k.content,
    ts_rank_cd(k.search_vector, q.value)::real as similarity
  from public.agronomy_knowledge_chunks as k
  cross join query_terms as q
  where q.value is not null
    and k.search_vector @@ q.value
  order by ts_rank_cd(k.search_vector, q.value) desc, k.chunk_index asc
  limit greatest(1, least(match_count, 8));
$$;

revoke all on function public.search_agronomy_knowledge(text, integer) from public, anon, authenticated;
grant execute on function public.search_agronomy_knowledge(text, integer) to service_role;
