import { z } from "zod";

export const MacroSchema = z.object({
  p: z.number().finite(),
  c: z.number().finite(),
  g: z.number().finite()
});

export const ItemSchema = z.object({
  nome: z.string().min(1),
  peso_g: z.number().finite(),
  kcal: z.number().finite(),
  macros: MacroSchema
});

export const AnaliseSchema = z.object({
  itens: z.array(ItemSchema).min(1),
  total_kcal: z.number().finite()
});

// Tentativa de coerção numérica caso a IA retorne strings.
export const AnaliseSchemaCoerce = AnaliseSchema.extend({
  itens: z
    .array(
      z.object({
        nome: z.string().min(1),
        peso_g: z.coerce.number().finite(),
        kcal: z.coerce.number().finite(),
        macros: z.object({
          p: z.coerce.number().finite(),
          c: z.coerce.number().finite(),
          g: z.coerce.number().finite()
        })
      })
    )
    .min(1),
  total_kcal: z.coerce.number().finite()
});

export type Macro = z.infer<typeof MacroSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Analise = z.infer<typeof AnaliseSchema>;

export function parseAnaliseStrict(input: unknown) {
  // Primeiro: parse com coerção (menos chance de falhar por tipo string).
  const parsed0 = AnaliseSchemaCoerce.safeParse(input);
  if (parsed0.success) return parsed0.data;

  const asString = typeof input === "string" ? input.trim() : null;
  if (asString) {
    // 1) tenta JSON direto
    try {
      const maybeObj = JSON.parse(asString) as unknown;
      const parsed1 = AnaliseSchemaCoerce.safeParse(maybeObj);
      if (parsed1.success) return parsed1.data;
    } catch {
      // segue para tentativas abaixo
    }

    // 2) tenta extrair o primeiro JSON completo (entre primeiro "{" e último "}")
    const first = asString.indexOf("{");
    const last = asString.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      const slice = asString.slice(first, last + 1);
      try {
        const maybeObj = JSON.parse(slice) as unknown;
        const parsed2 = AnaliseSchemaCoerce.safeParse(maybeObj);
        if (parsed2.success) return parsed2.data;
      } catch {
        // ignore
      }
    }
  }

  const fallback = AnaliseSchemaCoerce.safeParse(input);
  const details =
    typeof fallback.error?.message === "string" ? fallback.error.message : "sem detalhes";
  const snippet =
    typeof input === "string" ? input.slice(0, 400).replace(/\s+/g, " ") : "";
  throw new Error(
    `Resposta da IA não corresponde ao JSON esperado (schema inválido). detalhes=${details}${
      snippet ? ` | snippet="${snippet}"` : ""
    }`
  );
}

