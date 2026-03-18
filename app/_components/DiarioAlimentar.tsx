"use client";

import { Camera, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type Macro = { p: number; c: number; g: number };
type Item = { nome: string; peso_g: number; kcal: number; macros: Macro };
type Analise = { itens: Item[]; total_kcal: number };

function toNumberSafe(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DiarioAlimentar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Analise | null>(null);

  const totaisMacros = useMemo((): Macro => {
    if (!resultado) return { p: 0, c: 0, g: 0 };
    const p = resultado.itens.reduce((acc, it) => acc + it.macros.p, 0);
    const c = resultado.itens.reduce((acc, it) => acc + it.macros.c, 0);
    const g = resultado.itens.reduce((acc, it) => acc + it.macros.g, 0);
    return { p, c, g };
  }, [resultado]);

  async function fileToBase64(file: File) {
    // Converte para dataURL para facilitar envio ao backend.
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Falha ao ler imagem"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  async function onSelecionarImagem(file: File) {
    setErro(null);
    setResultado(null);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const base64 = await fileToBase64(file);
      setImageBase64(base64);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    }
  }

  async function analisar() {
    if (!imageBase64) return;
    setAnalisando(true);
    setErro(null);
    try {
      const res = await fetch("/api/analisar-refeicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Falha na análise: ${text || res.statusText}`);
      }

      const data = (await res.json()) as Analise;
      // Pequena proteção caso o backend retorne strings.
      const itens = data.itens.map((it) => ({
        ...it,
        peso_g: toNumberSafe(it.peso_g),
        kcal: toNumberSafe(it.kcal),
        macros: {
          p: toNumberSafe(it.macros.p),
          c: toNumberSafe(it.macros.c),
          g: toNumberSafe(it.macros.g)
        }
      }));
      setResultado({ itens, total_kcal: toNumberSafe(data.total_kcal) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Diário Alimentar</h1>
        <p className="text-zinc-400">
          Tire uma foto da refeição e deixe o Gemini estimar peso e macros.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium">Foto da refeição</div>
              <div className="text-sm text-zinc-400">Captura pela câmera do celular</div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void onSelecionarImagem(file);
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Tirar Foto
          </button>
        </div>

        {previewUrl && (
          <div className="mt-4">
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Prévia da refeição" className="h-64 w-full object-cover" />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={!imageBase64 || analisando}
            onClick={() => void analisar()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-emerald-500"
          >
            {analisando ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </span>
            ) : (
              "Analisar"
            )}
          </button>
        </div>

        {erro && (
          <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {erro}
          </p>
        )}
      </section>

      {resultado && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Resumo da análise</h2>
              <p className="text-sm text-zinc-400">Estimativas por item e total.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">Total</div>
              <div className="text-3xl font-bold">{resultado.total_kcal.toFixed(0)} kcal</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MacroCard title="Proteínas" value={`${totaisMacros.p.toFixed(1)} g`} subtitle="p" />
            <MacroCard title="Carboidratos" value={`${totaisMacros.c.toFixed(1)} g`} subtitle="c" />
            <MacroCard title="Gorduras" value={`${totaisMacros.g.toFixed(1)} g`} subtitle="g" />
          </div>

          <div className="space-y-2">
            {resultado.itens.map((it, idx) => (
              <div
                key={`${it.nome}-${idx}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{it.nome}</div>
                  <div className="text-right text-sm text-zinc-400">
                    {it.peso_g.toFixed(0)} g • {it.kcal.toFixed(0)} kcal
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-sm text-zinc-300">
                  <span>p: {it.macros.p.toFixed(1)} g</span>
                  <span>c: {it.macros.c.toFixed(1)} g</span>
                  <span>g: {it.macros.g.toFixed(1)} g</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MacroCard({
  title,
  value,
  subtitle
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">macro {subtitle}</div>
    </div>
  );
}

