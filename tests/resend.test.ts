import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API Key", () => {
  it("deve validar a chave da API Resend", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^re_/);

    const resend = new Resend(apiKey);
    // Verificar que a API key é válida listando domínios (endpoint leve)
    const { data, error } = await resend.domains.list();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
