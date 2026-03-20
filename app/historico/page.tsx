"use client";

import { useEffect, useState } from "react";
import { Calendar, Filter, Loader2, Trash2, Image as ImageIcon } from "lucide-react";

type Macro = { p: number; c: number; g: number };
type Item = { nome: string; peso_g: number; kcal: number; macros: Macro };
type Analise = { itens: Item[]; total_kcal: number };

type Refeicao = {
  id: string;
  imagem_url: string | null;
  resultado: Analise;
  created_at: string;
};

export default function HistoricoPage() {
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filtroAtivo, setFiltroAtivo] = useState(false);

  async function carregarRefeicoes() {
    setCarregando(true);
    setErro(null);

    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const url = `/api/refeicoes${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Falha ao carregar: ${text || res.statusText}`);
      }

      const data = await res.json();
      setRefeicoes(data);
      setFiltroAtivo(startDate !== "" || endDate !== "");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarRefeicoes();
  }, []);

  function aplicarFiltros() {
    carregarRefeicoes();
  }

  function limparFiltros() {
    setStartDate("");
    setEndDate("");
    carregarRefeicoes();
  }

  function formatarData(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function calcularTotais(reinicio: Refeicao) {
    const p = reinicio.resultado.itens.reduce((acc, it) => acc + it.macros.p, 0);
    const c = reinicio.resultado.itens.reduce((acc, it) => acc + it.macros.c, 0);
    const g = reinicio.resultado.itens.reduce((acc, it) => acc + it.macros.g, 0);
    return { p, c, g, kcal: reinicio.resultado.total_kcal };
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Histórico de Refeições</h1>
        <p className="text-zinc-400">
          Veja todas as suas refeições analisadas e filtre por período.
        </p>
      </header>

      {/* Filtros */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-zinc-400" />
          <h2 className="font-medium">Filtros por data</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={aplicarFiltros}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={limparFiltros}
              disabled={!filtroAtivo}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar
            </button>
          </div>
        </div>

        {filtroAtivo && (
          <div className="mt-3 text-sm text-zinc-400">
            {startDate && endDate
              ? `Filtrando de ${new Date(startDate).toLocaleDateString("pt-BR")} até ${new Date(endDate).toLocaleDateString("pt-BR")}`
              : startDate
              ? `Filtrando desde ${new Date(startDate).toLocaleDateString("pt-BR")}`
              : `Filtrando até ${new Date(endDate).toLocaleDateString("pt-BR")}`}
          </div>
        )}
      </section>

      {/* Lista de refeições */}
      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <span className="ml-3 text-zinc-400">Carregando histórico...</span>
        </div>
      ) : erro ? (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {erro}
        </p>
      ) : refeicoes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400">
            {filtroAtivo
              ? "Nenhuma refeição encontrada no período selecionado."
              : "Nenhuma refeição registrada ainda."}
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">
              {refeicoes.length} {refeicoes.length === 1 ? "refeição" : "refeições"} encontrada{refeicoes.length === 1 ? "" : "s"}
            </h2>
          </div>

          {refeicoes.map((refeicao) => {
            const totais = calcularTotais(refeicao);
            return (
              <div
                key={refeicao.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Imagem */}
                  <div className="flex-shrink-0">
                    {refeicao.imagem_url ? (
                      <img
                        src={refeicao.imagem_url}
                        alt="Refeição"
                        className="h-24 w-24 md:h-32 md:w-32 object-cover rounded-lg border border-zinc-800"
                      />
                    ) : (
                      <div className="h-24 w-24 md:h-32 md:w-32 rounded-lg border border-zinc-800 bg-zinc-800 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="font-medium text-lg">
                        {refeicao.resultado.itens.length} {refeicao.resultado.itens.length === 1 ? "item" : "itens"} identificados
                      </div>
                      <div className="text-sm text-zinc-400">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatarData(refeicao.created_at)}
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {refeicao.resultado.itens.map((it, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
                        >
                          {it.nome} • {it.peso_g.toFixed(0)}g
                        </span>
                      ))}
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-center">
                        <div className="text-xs text-zinc-400">Kcal</div>
                        <div className="font-semibold text-emerald-400">{totais.kcal.toFixed(0)}</div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-center">
                        <div className="text-xs text-zinc-400">Proteína</div>
                        <div className="font-semibold text-blue-400">{totais.p.toFixed(0)}g</div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-center">
                        <div className="text-xs text-zinc-400">Carbo</div>
                        <div className="font-semibold text-yellow-400">{totais.c.toFixed(0)}g</div>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-center">
                        <div className="text-xs text-zinc-400">Gordura</div>
                        <div className="font-semibold text-red-400">{totais.g.toFixed(0)}g</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
