-- Tabela para armazenar as análises do diário alimentar.
-- Rode via `supabase db push` (ou pelo SQL Editor do Supabase).

create extension if not exists pgcrypto;

create table if not exists public.refeicoes (
  id uuid primary key default gen_random_uuid(),
  imagem_url text,
  resultado jsonb not null,
  created_at timestamptz not null default now()
);

-- (Opcional) Sem políticas agora; o insert é feito com service role.

