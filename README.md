# FitMe - Diário Alimentar (Next.js + Supabase + Gemini)

Aplicação web para registrar refeições a partir de **fotos**, usando o **Google Gemini 1.5 Flash** (com fallback de modelos “flash” disponíveis na sua conta) para estimar:
- **alimentos identificados**
- **peso aproximado (g)**
- **calorias e macros** (proteínas, carboidratos e gorduras)

Os resultados são salvos no **Supabase Postgres** e a foto vai para o **Supabase Storage**.

## Tecnologias

- Next.js (App Router)
- Tailwind CSS
- Supabase (Postgres + Storage)
- `@google/generative-ai` (Gemini)
- Zod (validação do JSON)
- `lucide-react` (ícones)

## Como funciona

1. A UI permite tirar/selecionar uma foto (mobile-friendly com `capture="environment"`).
2. A foto é enviada ao endpoint `POST /api/analisar-refeicao` em base64 (dataURL).
3. O backend:
   - faz upload da imagem para o Storage
   - chama o Gemini com prompt e **schema de resposta**
   - valida o retorno com Zod
   - salva na tabela `refeicoes` a `imagem_url` + `resultado` (jsonb)
4. A UI exibe um resumo com cards de macros e o total de calorias.

## Requisitos

- Um projeto no Supabase
- Bucket no Supabase Storage para imagens (por padrão: `refeicoes-imagens`)
- Chave de API do Gemini (`GEMINI_API_KEY`)

## Supabase: tabela `refeicoes`

A migração já está em:
- `supabase/migrations/001_refeicoes.sql`

Ela cria a tabela `public.refeicoes` com:
- `imagem_url` (text)
- `resultado` (jsonb)
- `created_at` (timestamp)

Rode a migração no Supabase (ex.: via `supabase db push` ou pelo SQL Editor do Supabase).

## Supabase: Storage

Config:
- Bucket padrão: `refeicoes-imagens`

Observação: a função de upload tenta criar o bucket automaticamente caso ele não exista (usando a `SUPABASE_SERVICE_ROLE_KEY`).

## Gemini: modelo

O código tenta primeiro modelos `gemini-1.5-flash` e variações. Se não existir na sua conta, ele faz fallback para outros modelos “flash” disponíveis via `models.list`/tratamento de erro.

## Variáveis de ambiente

Copie `/.env.example` para `/.env.local` e preencha os valores.

Arquivo:
- `.env.local`

Campos:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (chave sensível; usada apenas no backend)
- `SUPABASE_STORAGE_BUCKET` (opcional; padrão `refeicoes-imagens`)
- `GEMINI_API_KEY`

## Rodando localmente

1. Instale dependências:
   ```bash
   npm install
   ```
2. Suba o dev server:
   ```bash
   npm run dev
   ```
3. Abra:
   - `http://localhost:3000`
4. Teste tirando uma foto e clicando em **Analisar**.

## Endpoints

### `POST /api/analisar-refeicao`

Envia imagem para o Gemini e salva no Supabase.

**Entrada (JSON, via base64 dataURL):**
```json
{ "imageBase64": "data:image/png;base64,...." }
```

**Saída (JSON válido e validado por schema):**
```json
{
  "itens": [
    {
      "nome": "string",
      "peso_g": 0,
      "kcal": 0,
      "macros": { "p": 0, "c": 0, "g": 0 }
    }
  ],
  "total_kcal": 0
}
```

## Observações e boas práticas

- O backend usa `SUPABASE_SERVICE_ROLE_KEY` para:
  - upload/Storage
  - insert em `refeicoes`
- Por segurança, **não** exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- O retorno da IA é forçado a seguir o JSON esperado (Zod valida antes de salvar/mostrar).

