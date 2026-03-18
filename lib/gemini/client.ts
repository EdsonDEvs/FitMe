import { GoogleGenerativeAI } from "@google/generative-ai";
import { ensureEnvLoaded } from "@/lib/env/loadEnv";

let cached: GoogleGenerativeAI | null = null;

export function getGenAI() {
  if (cached) return cached;

  ensureEnvLoaded();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing env: GEMINI_API_KEY");
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

