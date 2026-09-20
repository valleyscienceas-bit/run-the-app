import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type RagChunk = {
  id: string;
  source: string;
  text: string;
  grade?: string;
  topics: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS_DIR = path.join(__dirname, "../../training/grade3");

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreChunk(queryTokens: string[], chunk: RagChunk): number {
  const hay = tokenize(`${chunk.text} ${chunk.topics.join(" ")} ${chunk.source}`);
  if (hay.length === 0 || queryTokens.length === 0) return 0;
  let hits = 0;
  for (const q of queryTokens) {
    if (hay.includes(q)) hits += 1;
  }
  return hits / queryTokens.length;
}

/** Load markdown/text chunks from training/grade3 (and optional subfolders). */
export function loadGrade3Corpus(corpusDir = DEFAULT_CORPUS_DIR): RagChunk[] {
  if (!fs.existsSync(corpusDir)) return [];

  const chunks: RagChunk[] = [];
  const files = fs.readdirSync(corpusDir).filter((f) => /\.(md|txt)$/i.test(f));

  for (const file of files) {
    const full = path.join(corpusDir, file);
    const raw = fs.readFileSync(full, "utf8");
    const parts = raw
      .split(/\n(?=#{1,3}\s)/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40);

    const sections = parts.length > 0 ? parts : [raw.trim()];
    sections.forEach((text, i) => {
      const topicMatch = text.match(/^#+\s*(.+)$/m);
      const topic = topicMatch?.[1]?.trim() || file;
      chunks.push({
        id: `${file}-${i}`,
        source: file,
        text: text.slice(0, 1200),
        grade: "3",
        topics: tokenize(topic).slice(0, 12),
      });
    });
  }

  return chunks;
}

let cachedCorpus: RagChunk[] | null = null;

export function getGrade3Corpus(forceReload = false): RagChunk[] {
  if (!cachedCorpus || forceReload) {
    cachedCorpus = loadGrade3Corpus();
  }
  return cachedCorpus;
}

/**
 * Keyword RAG v1: retrieve top-k Grade 3 chunks for a query / module context.
 * Swap embeddings later without changing the chat call site.
 */
export function retrieveGrade3Context(
  query: string,
  options?: { k?: number; moduleContext?: string }
): string {
  const k = options?.k ?? 3;
  const corpus = getGrade3Corpus();
  if (corpus.length === 0) return "";

  const queryTokens = tokenize(`${query}\n${options?.moduleContext || ""}`);
  const ranked = corpus
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  if (ranked.length === 0) {
    // Fall back to first chunks so small models still get Grade 3 grounding
    return corpus
      .slice(0, Math.min(k, corpus.length))
      .map((c) => `[${c.source}]\n${c.text}`)
      .join("\n\n");
  }

  return ranked.map((r) => `[${r.chunk.source}]\n${r.chunk.text}`).join("\n\n");
}
