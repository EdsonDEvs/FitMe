import { uploadImageToSupabase } from "@/lib/supabase/storage";
import { getGenAI } from "@/lib/gemini/client";
import { parseAnaliseStrict } from "@/lib/gemini/diarioSchema";
import { saveRefeicao } from "@/lib/refeicoes/saveRefeicao";
import { SchemaType } from "@google/generative-ai";

export const runtime = "nodejs";

function base64FromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:.+?;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

function mimeTypeFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,/);
  return match ? match[1] : "image/jpeg";
}

async function imageFromRequest(req: Request): Promise<string> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("image");
    if (!file || typeof (file as any).arrayBuffer !== "function") {
      throw new Error("Multipart inválido: envie um arquivo no campo `image`.");
    }

    const arrayBuffer = await (file as any).arrayBuffer();
    const mimeType = (file as any).type || "image/jpeg";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }

  // default: JSON
  const body = (await req.json()) as { imageBase64?: string; imageUrl?: string };
  if (!body.imageBase64) {
    throw new Error("Body inválido: envie `imageBase64` (dataURL base64).");
  }
  return body.imageBase64;
}

export async function POST(req: Request) {
  try {
    const imageDataUrl = await imageFromRequest(req);
    const imageBase64Only = base64FromDataUrl(imageDataUrl);
    const mimeType = mimeTypeFromDataUrl(imageDataUrl);

    // Upload da imagem para o Storage
    const { imageUrl } = await uploadImageToSupabase({ base64DataUrl: imageDataUrl });

    const prompt = [
      "Você é um nutricionista experiente.",
      "Analise a foto de uma refeição e:",
      "- Identifique os alimentos presentes.",
      "- Estime o peso de cada item em gramas (peso_g).",
      "- Calcule calorias (kcal) e macros (proteínas p, carboidratos c, gorduras g) para cada item.",
      "- Considere porções realistas para alimentos comuns.",
      "",
      "Regras IMPORTANTES:",
      "1) Retorne SOMENTE um JSON válido (sem markdown, sem texto extra).",
      "2) Estrutura obrigatória:",
      "{ \"itens\": [{ \"nome\": \"string\", \"peso_g\": number, \"kcal\": number, \"macros\": { \"p\": number, \"c\": number, \"g\": number } }], \"total_kcal\": number }",
      "3) Use números (não strings) para peso_g, kcal e macros.",
      "4) `total_kcal` deve ser a soma de kcal dos itens.",
      "",
      "Agora retorne o JSON com a análise da refeição."
    ].join("\n");

    const responseSchema: any = {
      type: SchemaType.OBJECT,
      properties: {
        itens: {
          type: SchemaType.ARRAY,
          minItems: 1,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              nome: { type: SchemaType.STRING },
              peso_g: { type: SchemaType.NUMBER, format: "double" },
              kcal: { type: SchemaType.NUMBER, format: "double" },
              macros: {
                type: SchemaType.OBJECT,
                properties: {
                  p: { type: SchemaType.NUMBER, format: "double" },
                  c: { type: SchemaType.NUMBER, format: "double" },
                  g: { type: SchemaType.NUMBER, format: "double" }
                },
                required: ["p", "c", "g"]
              }
            },
            required: ["nome", "peso_g", "kcal", "macros"]
          }
        },
        total_kcal: { type: SchemaType.NUMBER, format: "double" }
      },
      required: ["itens", "total_kcal"]
    };

    const modelCandidates = [
      // Preferência (conforme pedido)
      "gemini-1.5-flash",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-1.5-pro-001",

      // Fallback real para contas que não habilitam 1.5
      // (na sua chave, os modelos “flash” disponíveis começam em gemini-2.x)
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash-lite"
    ];

    let lastError: unknown = null;
    let parsed: ReturnType<typeof parseAnaliseStrict> | null = null;

    for (const modelName of modelCandidates) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64Only
                  }
                }
              ]
            }
          ]
        });

        const text = await result.response.text();
        parsed = parseAnaliseStrict(text);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!parsed) throw lastError ?? new Error("Falha ao analisar com Gemini (sem modelo válido).");

    await saveRefeicao({ imageUrl, resultado: parsed });

    return Response.json(parsed, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return Response.json({ error: message }, { status: 400 });
  }
}

