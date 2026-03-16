import { Express } from "express";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import * as db from "./db";

/**
 * Rota de upload de foto de perfil do técnico.
 * Recebe a imagem em base64, faz upload para S3 e salva a URL no banco.
 * POST /api/technician/photo
 * Body: { base64: string, mimeType: string }
 * Headers: Authorization: Bearer <session_token>
 */
export function registerTechnicianUploadRoutes(app: Express) {
  // Upload de foto de perfil do técnico
  app.post("/api/technician/photo", async (req, res) => {
    try {
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

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1] || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const fileKey = `technicians/photo-${user.id}-${randomSuffix}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Atualizar avatarUrl do técnico no banco
      const technician = await db.getTechnicianByUserId(user.id);
      if (technician) {
        await db.updateTechnician(technician.id, { avatarUrl: url, photoUri: url });
      }

      res.json({ url });
    } catch (error) {
      console.error("[TechnicianPhotoUpload] Error:", error);
      res.status(500).json({ error: "Erro ao fazer upload da foto." });
    }
  });

  // Upload de logo da empresa do técnico
  app.post("/api/technician/logo", async (req, res) => {
    try {
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

      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1] || "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const fileKey = `technicians/logo-${user.id}-${randomSuffix}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Atualizar companyLogoUrl do técnico no banco
      const technician = await db.getTechnicianByUserId(user.id);
      if (technician) {
        await db.updateTechnician(technician.id, { companyLogoUrl: url } as any);
      }

      res.json({ url });
    } catch (error) {
      console.error("[TechnicianLogoUpload] Error:", error);
      res.status(500).json({ error: "Erro ao fazer upload da logo." });
    }
  });
}
