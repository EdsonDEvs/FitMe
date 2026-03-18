import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

let loaded = false;
let loadedPath: string | null = null;
let lastDotenvError: string | null = null;
let lastParsedKeys: string[] = [];

function tryLoadEnv(envPath: string) {
  if (!fs.existsSync(envPath)) return false;
  lastDotenvError = null;
  lastParsedKeys = [];
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    lastDotenvError = String(result.error.message ?? result.error);
    return false;
  }
  lastParsedKeys = result.parsed ? Object.keys(result.parsed) : [];
  return true;
}

export function ensureEnvLoaded() {
  if (loaded) return;

  // Caminho baseado no arquivo (funciona mesmo se o process.cwd() não for a raiz do projeto).
  const here = path.dirname(fileURLToPath(import.meta.url));

  // Sobe até algumas camadas procurando `.env.local`.
  // Isso resolve casos em que o Next não carregou o arquivo por causa do cwd / restart.
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, ".env.local");
    if (tryLoadEnv(candidate)) {
      loaded = true;
      loadedPath = candidate;
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // fallback: tentar pelo cwd (caso seja a raiz mesmo)
  if (tryLoadEnv(path.join(process.cwd(), ".env.local"))) {
    loaded = true;
    loadedPath = path.join(process.cwd(), ".env.local");
  } else {
    // Mantém loaded=false, para permitir nova tentativa se o arquivo aparecer depois.
    loaded = false;
  }
}

export function getEnvLoadedPath() {
  return loadedPath;
}

export function getDotenvDebug() {
  return { lastDotenvError, lastParsedKeys };
}

