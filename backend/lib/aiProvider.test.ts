import { describe, expect, it } from "vitest";
import { describeActiveAi, resolveAiProvider } from "../services/llm.js";

describe("ai provider selection", () => {
  it("defaults to auto", () => {
    expect(resolveAiProvider({})).toBe("auto");
  });

  it("respects AI_PROVIDER=local", () => {
    expect(resolveAiProvider({ AI_PROVIDER: "local" })).toBe("local");
  });

  it("describes local model", () => {
    const label = describeActiveAi({
      AI_PROVIDER: "local",
      LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
      LOCAL_LLM_MODEL: "phi-4-mini-instruct",
    });
    expect(label).toContain("local");
    expect(label).toContain("phi-4-mini-instruct");
  });
});
