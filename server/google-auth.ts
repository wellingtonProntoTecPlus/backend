/**
 * Google OAuth Authentication for ProntoTEC+
 * - Accepts Google ID token from the mobile app
 * - Verifies token with Google's tokeninfo API
 * - Creates or updates user in the database
 * - Returns a session token for the app
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import * as db from "./db";

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

export function registerGoogleAuthRoutes(app: Express) {
  /**
   * POST /api/auth/google
   * Verifies Google ID token and creates a session
   * Body: { idToken: string }
   */
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      res.status(400).json({ error: "ID token do Google é obrigatório" });
      return;
    }

    try {
      // Verify the Google ID token using Google's tokeninfo endpoint
      const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const tokenInfoResponse = await fetch(tokenInfoUrl);

      if (!tokenInfoResponse.ok) {
        console.error("[GoogleAuth] Token verification failed:", tokenInfoResponse.status);
        res.status(401).json({ error: "Token do Google inválido ou expirado" });
        return;
      }

      const tokenInfo = await tokenInfoResponse.json() as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        email_verified?: string;
        aud?: string;
      };

      // Validate the token is for our app
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (googleClientId && tokenInfo.aud !== googleClientId) {
        // Also check if aud contains the client ID (some tokens have multiple audiences)
        const audiences = Array.isArray(tokenInfo.aud) ? tokenInfo.aud : [tokenInfo.aud];
        if (!audiences.includes(googleClientId)) {
          console.error("[GoogleAuth] Token audience mismatch:", tokenInfo.aud, "expected:", googleClientId);
          res.status(401).json({ error: "Token não autorizado para este aplicativo" });
          return;
        }
      }

      if (!tokenInfo.sub || !tokenInfo.email) {
        res.status(401).json({ error: "Token do Google inválido: dados insuficientes" });
        return;
      }

      // Create a unique openId for Google users
      const openId = `google:${tokenInfo.sub}`;

      // Check if user already exists (to detect first login)
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      // Create or update user in the database
      await db.upsertUser({
        openId,
        name: tokenInfo.name || null,
        email: tokenInfo.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "Falha ao criar usuário. Tente novamente." });
        return;
      }

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: tokenInfo.name || user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        success: true,
        app_session_id: sessionToken,
        isNewUser,
        user: buildUserResponse(user),
      });
    } catch (error) {
      console.error("[GoogleAuth] Error:", error);
      res.status(500).json({ error: "Falha na autenticação com Google. Tente novamente." });
    }
  });
}
