-- Update intent_examples table to support 1024-dimensional embeddings (mxbai-embed-large-v1)
-- This replaces the previous 384-dimensional schema (gte-small)

-- Drop existing function (depends on old vector dimensions)
drop function if exists match_intent_examples(extensions.vector(384), int, float);
drop function if exists match_intent_examples(extensions.vector(768), int, float);
drop function if exists match_intent_examples(extensions.vector(1024), int, float);

-- Drop existing index
drop index if exists intent_examples_embedding_idx;

-- Drop and recreate table with new dimension
drop table if exists intent_examples;

create table intent_examples (
  id bigserial primary key,
  intent text not null check (intent in ('react', 'image', 'svg', 'code', 'markdown', 'mermaid', 'chat')),
  text text not null,
  embedding extensions.vector(1024), -- mxbai-embed-large-v1 uses 1024 dimensions
  created_at timestamptz default now(),

  -- Prevent duplicate examples
  unique(intent, text)
);

-- Create IVFFlat index for fast similarity search
-- lists = 11 is appropriate for ~132 examples (sqrt of dataset size)
create index intent_examples_embedding_idx
on intent_examples
using ivfflat (embedding extensions.vector_cosine_ops)
with (lists = 11);

-- Function to search for similar intent examples
create or replace function match_intent_examples(
  query_embedding extensions.vector(1024),
  match_count int default 1,
  similarity_threshold float default 0.5
)
returns table (
  intent text,
  text text,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    intent_examples.intent,
    intent_examples.text,
    1 - (intent_examples.embedding <=> query_embedding) as similarity
  from intent_examples
  where 1 - (intent_examples.embedding <=> query_embedding) > similarity_threshold
  order by intent_examples.embedding <=> query_embedding
  limit match_count;
$$;

-- Grant permissions
grant select on intent_examples to anon, authenticated;
grant execute on function match_intent_examples to anon, authenticated;
