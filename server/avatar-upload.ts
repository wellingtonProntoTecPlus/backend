import { Express } from "express";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import * as db from "./db";

/**
 * Rota de upload de avatar do usuário.
 * Recebe a imagem em base64, faz upload para S3 e salva a URL no banco.
 * POST /api/user/avatar
 * Body: { base64: string, mimeType: string }
 * Headers: Authorization: Bearer <session_token>
 */
export function registerAvatarUploadRoute(app: Express) {
  app.post("/api/user/avatar", async (req, res) => {
    try {
      // Autenticar usuário
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autorizado." });
        return;
      }

      const { base64, mimeType = "image/jpeg" } = req.body;
      if (!base64) {
        res.status(400).json({ error: "Imagem não fornecida." });
        return;
      }

      // Converter base64 para Buffer
      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1] || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const fileKey = `avatars/user-${user.id}-${randomSuffix}.${ext}`;

      // Upload para S3
      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Salvar URL no banco
      await db.updateUserProfile(user.id, { avatarUrl: url });

      res.json({ url });
    } catch (error) {
      console.error("[AvatarUpload] Error:", error);
      res.status(500).json({ error: "Erro ao fazer upload da foto." });
    }
  });
}
