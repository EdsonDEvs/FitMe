import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitme - Diário Alimentar",
  description: "Diário alimentar com Gemini + Supabase"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
      </body>
    </html>
  );
}

