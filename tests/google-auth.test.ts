import { describe, it, expect } from "vitest";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.prontotecplus.app";

describe("Google Auth Route /api/auth/google", () => {
  it("deve retornar 400 quando idToken não é fornecido", async () => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("deve retornar 401 quando idToken é inválido", async () => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "invalid_token_xyz" }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error).toContain("inválido");
  });

  it("deve retornar 404 para rota GET (apenas POST é suportado)", async () => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: "GET",
    });
    // Express returns 404 for unregistered GET routes
    expect(res.status).toBe(404);
  });
});

describe("Email Auth Route /api/auth/email/send-code", () => {
  it("deve retornar 400 para e-mail inválido", async () => {
    const res = await fetch(`${API_BASE}/api/auth/email/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("deve retornar sucesso ou erro de modo teste para e-mail válido", async () => {
    const res = await fetch(`${API_BASE}/api/auth/email/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "wellingtonportes@gmail.com", name: "Wellington" }),
    });
    // Either success (200) or test mode error (503)
    expect([200, 503]).toContain(res.status);
    const data = await res.json();
    if (res.status === 200) {
      expect(data.success).toBe(true);
    } else {
      expect(data.code).toBe("RESEND_TEST_MODE");
    }
  });
});

describe("Health Check", () => {
  it("deve retornar ok do servidor", async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
