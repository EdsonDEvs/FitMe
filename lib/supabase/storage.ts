type UploadImageInput = {
  base64DataUrl: string; // data:image/jpeg;base64,...
  mimeType?: string;
  bucket?: string;
};

const ensuredBuckets = new Set<string>();

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function inferMimeTypeFromBase64(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return undefined;
  return parsed.mimeType;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadImageToSupabase({
  base64DataUrl,
  mimeType,
  bucket
}: UploadImageInput) {
  const { getSupabaseServer } = await import("./server");
  const supabaseServer = getSupabaseServer();

  const storageBucketRaw = bucket ?? process.env.SUPABASE_STORAGE_BUCKET ?? "refeicoes-imagens";
  // Dotenv pode manter aspas dependendo do ambiente; removemos para garantir que o bucket exista.
  const storageBucket = String(storageBucketRaw).replace(/^"+|"+$/g, "").trim();
  const detectedMime = inferMimeTypeFromBase64(base64DataUrl);
  const finalMimeType = mimeType ?? detectedMime ?? "image/jpeg";

  async function ensureBucket() {
    if (ensuredBuckets.has(storageBucket)) return;
    // Se já existe, createBucket costuma retornar erro/ok; tanto faz, queremos ficar idempotente.
    const { error } = await supabaseServer.storage.createBucket(storageBucket, { public: true });
    if (!error) ensuredBuckets.add(storageBucket);
  }

  async function uploadWithRetry(params: {
    filePath: string;
    buf: Buffer;
    contentType: string;
  }) {
    const { filePath, buf, contentType } = params;
    let { error } = await supabaseServer.storage
      .from(storageBucket)
      .upload(filePath, buf, { contentType, upsert: false });

    if (error) {
      const msg = String(error.message ?? error);
      if (/bucket not found/i.test(msg)) {
        await ensureBucket();
        const retry = await supabaseServer.storage
          .from(storageBucket)
          .upload(filePath, buf, { contentType, upsert: false });
        error = retry.error ?? null;
      }
    }

    if (error) throw new Error(`Falha ao subir imagem (bucket="${storageBucket}"): ${error.message}`);

    const { data: publicData } = supabaseServer.storage.from(storageBucket).getPublicUrl(filePath);
    return { imageUrl: publicData.publicUrl ?? null, filePath };
  }

  const parsed = parseDataUrl(base64DataUrl);
  if (!parsed) {
    // Se vier só base64 puro, tentamos usar mimeType informado/detectado.
    const buf = Buffer.from(base64DataUrl, "base64");
    const ext = finalMimeType.includes("png") ? "png" : "jpg";
    const filePath = `refeicoes/${Date.now()}_${sanitizeFilename("imagem")}.${ext}`;
    return await uploadWithRetry({ filePath, buf, contentType: finalMimeType });
  }

  const buf = Buffer.from(parsed.base64, "base64");
  const ext = parsed.mimeType.includes("png") ? "png" : "jpg";
  const filePath = `refeicoes/${Date.now()}_${sanitizeFilename("imagem")}.${ext}`;

  return await uploadWithRetry({ filePath, buf, contentType: parsed.mimeType });
}

