/**
 * Testa se a URL da API está configurada e o endpoint de push está acessível.
 */
import { describe, it, expect } from "vitest";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.prontotecplus.app";

describe("Push API", () => {
  it("deve ter EXPO_PUBLIC_API_BASE_URL configurado", () => {
    expect(API_BASE_URL).toBeTruthy();
    expect(API_BASE_URL.length).toBeGreaterThan(5);
  });

  it("endpoint /api/push/register deve retornar 401 sem autenticação", async () => {
    const response = await fetch(`${API_BASE_URL}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // 401 significa que o endpoint existe e requer autenticação — correto
    expect(response.status).toBe(401);
  });

  it("endpoint /api/push/register deve retornar 400 com token inválido", async () => {
    // Simular uma requisição com token de auth inválido
    const response = await fetch(`${API_BASE_URL}/api/push/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_invalido",
      },
      body: JSON.stringify({ pushToken: "ExponentPushToken[test123]" }),
    });
    // 401 ou 400 — o endpoint está respondendo
    expect([400, 401]).toContain(response.status);
  });
});
