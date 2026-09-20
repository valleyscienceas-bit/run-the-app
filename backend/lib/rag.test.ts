import { describe, expect, it } from "vitest";
import { loadGrade3Corpus, retrieveGrade3Context } from "../services/rag.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corpusDir = path.join(__dirname, "../../training/grade3");

describe("grade3 RAG", () => {
  it("loads markdown corpus from training/grade3", () => {
    const chunks = loadGrade3Corpus(corpusDir);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c) => c.source.includes("balanced-forces"))).toBe(true);
  });

  it("retrieves force-related context for a balanced-forces query", () => {
    const text = retrieveGrade3Context("What is net force and equilibrium?", {
      k: 2,
      moduleContext: "Balanced Forces Module 3001",
    });
    expect(text.toLowerCase()).toMatch(/force|equilibrium|net/);
  });
});
