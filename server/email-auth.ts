/**
 * Email Authentication System for ProntoTEC+
 * - Sends 6-digit verification codes via Resend
 * - Codes expire in 10 minutes
 * - Stores codes in memory (Map) — sufficient for single-instance server
 *
 * NOTE: Resend free tier only allows sending to the verified account email
 * until a custom domain is verified. Once prontotecplus.app domain is verified
 * in Resend, emails will work for all users.
 */

import { Resend } from "resend";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory store: email -> { code, expiresAt, name }
const pendingCodes = new Map<string, { code: string; expiresAt: number; name: string }>();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildUserResponse(user: {
  id?: number | null;
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressZipCode?: string | null;
  avatarUrl?: string | null;
  mode?: string | null;
}) {
  return {
    id: user.id ?? null,
    openId: user.openId ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
    phone: user.phone ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    addressStreet: user.addressStreet ?? null,
    addressNumber: user.addressNumber ?? null,
    addressComplement: user.addressComplement ?? null,
    addressNeighborhood: user.addressNeighborhood ?? null,
    addressZipCode: user.addressZipCode ?? null,
    avatarUrl: user.avatarUrl ?? null,
    mode: user.mode ?? null,
  };
}

/**
 * Parse Resend error to provide user-friendly message
 */
function parseResendError(error: any): string {
  const message = error?.message || "";
  // Resend test mode: can only send to verified account email
  if (message.includes("testing emails") || message.includes("verify a domain")) {
    return "RESEND_TEST_MODE";
  }
  return "SEND_FAILED";
}

export function registerEmailAuthRoutes(app: Express) {
  /**
   * POST /api/auth/email/send-code
   * Sends a 6-digit verification code to the provided email
   */
  app.post("/api/auth/email/send-code", async (req: Request, res: Response) => {
    const { email, name } = req.body as { email?: string; name?: string };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "E-mail inválido" });
      return;
    }

    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    pendingCodes.set(email.toLowerCase(), { code, expiresAt, name: name || "" });

    try {
      const { error } = await resend.emails.send({
        from: "ProntoTEC+ <noreply@prontotecplus.app>",
        to: [email],
        subject: `${code} — Seu código de verificação ProntoTEC+`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #1A3A5C; border-radius: 12px; padding: 12px 20px;">
                <span style="color: #F5A623; font-size: 22px; font-weight: 900; letter-spacing: 1px;">ProntoTEC+</span>
              </div>
            </div>
            <h2 style="color: #1A3A5C; font-size: 20px; margin-bottom: 8px; text-align: center;">
              Seu código de verificação
            </h2>
            <p style="color: #687076; font-size: 14px; text-align: center; margin-bottom: 24px;">
              ${name ? `Olá, ${name}! Use` : "Use"} o código abaixo para confirmar seu e-mail no ProntoTEC+.
            </p>
            <div style="background: #1A3A5C; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="color: #F5A623; font-size: 42px; font-weight: 900; letter-spacing: 12px;">${code}</span>
            </div>
            <p style="color: #687076; font-size: 13px; text-align: center;">
              Este código expira em <strong>10 minutos</strong>.<br/>
              Se você não solicitou este código, ignore este e-mail.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
            <p style="color: #9BA1A6; font-size: 11px; text-align: center;">
              ProntoTEC+ — Plataforma de Técnicos de Segurança Eletrônica
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[EmailAuth] Resend error:", error);
        const errorType = parseResendError(error);
        if (errorType === "RESEND_TEST_MODE") {
          res.status(503).json({
            error: "O serviço de e-mail está em modo de teste. Use o login com Google ou aguarde a ativação do domínio prontotecplus.app.",
            code: "RESEND_TEST_MODE",
          });
        } else {
          res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
        }
        return;
      }

      res.json({ success: true, message: "Código enviado para " + email });
    } catch (err: any) {
      console.error("[EmailAuth] Send code error:", err);
      const errorType = parseResendError(err);
      if (errorType === "RESEND_TEST_MODE") {
        res.status(503).json({
          error: "O serviço de e-mail está em modo de teste. Use o login com Google ou aguarde a ativação do domínio prontotecplus.app.",
          code: "RESEND_TEST_MODE",
        });
      } else {
        res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
      }
    }
  });

  /**
   * POST /api/auth/email/verify-code
   * Verifies the code and creates/logs in the user
   */
  app.post("/api/auth/email/verify-code", async (req: Request, res: Response) => {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.status(400).json({ error: "E-mail e código são obrigatórios" });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const pending = pendingCodes.get(normalizedEmail);

    if (!pending) {
      res.status(400).json({ error: "Nenhum código pendente para este e-mail. Solicite um novo código." });
      return;
    }

    if (Date.now() > pending.expiresAt) {
      pendingCodes.delete(normalizedEmail);
      res.status(400).json({ error: "Código expirado. Solicite um novo código." });
      return;
    }

    if (pending.code !== code.trim()) {
      res.status(400).json({ error: "Código incorreto. Verifique e tente novamente." });
      return;
    }

    // Code is valid — remove from pending
    pendingCodes.delete(normalizedEmail);

    // Create or update user in DB
    const openId = `email:${normalizedEmail}`;
    await db.upsertUser({
      openId,
      name: pending.name || null,
      email: normalizedEmail,
      loginMethod: "email",
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByOpenId(openId);

    if (!user) {
      res.status(500).json({ error: "Falha ao criar usuário. Tente novamente." });
      return;
    }

    // Create session token
    const sessionToken = await sdk.createSessionToken(openId, {
      name: pending.name || user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    res.json({
      success: true,
      app_session_id: sessionToken,
      user: buildUserResponse(user),
    });
  });

  /**
   * POST /api/auth/email/login
   * Login with email — sends a new verification code (passwordless)
   */
  app.post("/api/auth/email/login", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "E-mail inválido" });
      return;
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const openId = `email:${normalizedEmail}`;
    const existingUser = await db.getUserByOpenId(openId);

    if (!existingUser) {
      res.status(404).json({ error: "E-mail não cadastrado. Crie uma conta primeiro." });
      return;
    }

    // Send verification code for login
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pendingCodes.set(normalizedEmail, { code, expiresAt, name: existingUser.name || "" });

    try {
      const { error } = await resend.emails.send({
        from: "ProntoTEC+ <noreply@prontotecplus.app>",
        to: [email],
        subject: `${code} — Código de acesso ProntoTEC+`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #1A3A5C; border-radius: 12px; padding: 12px 20px;">
                <span style="color: #F5A623; font-size: 22px; font-weight: 900; letter-spacing: 1px;">ProntoTEC+</span>
              </div>
            </div>
            <h2 style="color: #1A3A5C; font-size: 20px; margin-bottom: 8px; text-align: center;">
              Código de acesso
            </h2>
            <p style="color: #687076; font-size: 14px; text-align: center; margin-bottom: 24px;">
              Olá, ${existingUser.name || ""}! Use o código abaixo para acessar sua conta.
            </p>
            <div style="background: #1A3A5C; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="color: #F5A623; font-size: 42px; font-weight: 900; letter-spacing: 12px;">${code}</span>
            </div>
            <p style="color: #687076; font-size: 13px; text-align: center;">
              Este código expira em <strong>10 minutos</strong>.<br/>
              Se você não solicitou este código, ignore este e-mail.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
            <p style="color: #9BA1A6; font-size: 11px; text-align: center;">
              ProntoTEC+ — Plataforma de Técnicos de Segurança Eletrônica
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("[EmailAuth] Login Resend error:", error);
        const errorType = parseResendError(error);
        if (errorType === "RESEND_TEST_MODE") {
          res.status(503).json({
            error: "O serviço de e-mail está em modo de teste. Use o login com Google ou aguarde a ativação do domínio prontotecplus.app.",
            code: "RESEND_TEST_MODE",
          });
        } else {
          res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
        }
        return;
      }

      res.json({ success: true, message: "Código enviado para " + email });
    } catch (err: any) {
      console.error("[EmailAuth] Login send error:", err);
      const errorType = parseResendError(err);
      if (errorType === "RESEND_TEST_MODE") {
        res.status(503).json({
          error: "O serviço de e-mail está em modo de teste. Use o login com Google ou aguarde a ativação do domínio prontotecplus.app.",
          code: "RESEND_TEST_MODE",
        });
      } else {
        res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
      }
    }
  });

  /**
   * POST /api/auth/check-duplicate
   * Checks if a technician already exists with the given document (CPF/CNPJ) or phone
   */
  app.post("/api/auth/check-duplicate", async (req: Request, res: Response) => {
    const { document, phone, email } = req.body as { document?: string; phone?: string; email?: string };

    try {
      // Check email duplicate
      if (email) {
        const normalizedEmail = email.toLowerCase();
        const openId = `email:${normalizedEmail}`;
        const existingUser = await db.getUserByOpenId(openId);
        if (existingUser) {
          res.json({ duplicate: true, field: "email", message: "Este e-mail já está cadastrado. Faça login ou use outro e-mail." });
          return;
        }
      }

      // Check document (CPF/CNPJ) duplicate
      if (document) {
        const cleanDoc = document.replace(/\D/g, "");
        const existing = await db.getTechnicianByDocument(cleanDoc);
        if (existing) {
          const type = cleanDoc.length === 14 ? "CNPJ" : "CPF";
          res.json({ duplicate: true, field: "document", message: `Este ${type} já está cadastrado na plataforma.` });
          return;
        }
      }

      // Check phone duplicate
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        const existing = await db.getTechnicianByPhone(cleanPhone);
        if (existing) {
          res.json({ duplicate: true, field: "phone", message: "Este telefone já está cadastrado na plataforma." });
          return;
        }
      }

      res.json({ duplicate: false });
    } catch (err) {
      console.error("[CheckDuplicate] Error:", err);
      res.json({ duplicate: false }); // fail open — don't block registration on DB error
    }
  });
}
