-- Enable pgvector extension for embedding storage
create extension if not exists vector with schema extensions;

-- Create table for canonical intent examples (384 dimensions for gte-small)
create table if not exists intent_examples (
  id bigserial primary key,
  intent text not null check (intent in ('react', 'image', 'svg', 'code', 'markdown', 'mermaid', 'chat')),
  text text not null,
  embedding extensions.vector(384), -- gte-small uses 384 dimensions
  created_at timestamptz default now(),

  -- Prevent duplicate examples
  unique(intent, text)
);

-- Create IVFFlat index for fast similarity search
-- lists = 20 is appropriate for ~128 examples (sqrt of dataset size)
create index if not exists intent_examples_embedding_idx
on intent_examples
using ivfflat (embedding extensions.vector_cosine_ops)
with (lists = 20);

-- Function to search for similar intent examples
create or replace function match_intent_examples(
  query_embedding extensions.vector(384),
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
