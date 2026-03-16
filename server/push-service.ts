/**
 * Serviço de Push Notifications Remotas via Expo Push API.
 *
 * Tipos de alerta:
 * 🔴 URGENTE  — novo chamado urgente (channelId: prontotec-urgent, som alto, vibração máxima)
 * 🟡 CHAT     — nova mensagem de chat (channelId: prontotec-chat, push simples com som)
 * 🔵 ATUALIZAÇÃO — status do chamado atualizado (channelId: prontotec-default, silenciosa)
 *
 * Fluxo:
 * 1. App registra token Expo Push no servidor ao iniciar (POST /api/push/register)
 * 2. Servidor envia push para técnicos disponíveis quando cliente cria pedido
 * 3. Servidor envia push para o destinatário correto quando mensagem de chat é enviada
 */
import { Request, Response, Express } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  ttl?: number;
  expiration?: number;
  mutableContent?: boolean;
}

/**
 * Envia push notifications via Expo Push API.
 */
async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[Push] Falha ao enviar push:", response.status, text);
      return;
    }

    const result = await response.json();
    console.log("[Push] Push enviado com sucesso:", JSON.stringify(result).substring(0, 200));
  } catch (err) {
    console.error("[Push] Erro ao enviar push:", err);
  }
}

/**
 * Busca tokens push de um usuário específico.
 */
async function getTokensByUserId(userId: number): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const rows = await db.execute(
      `SELECT token FROM push_tokens WHERE userId = ${userId}`
    ) as any[];

    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    return data.map((r: any) => r.token).filter(Boolean);
  } catch (err) {
    console.error("[Push] Erro ao buscar tokens:", err);
    return [];
  }
}

/**
 * Busca tokens push de todos os técnicos disponíveis, excluindo o cliente que criou o pedido.
 */
async function getTokensForAvailableTechnicians(excludeUserId?: number): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const rows = await db.execute(
      `SELECT t.userId FROM technicians t 
       WHERE t.availability = 'disponivel' AND t.userId IS NOT NULL`
    ) as any[];

    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    console.log(`[Push] Técnicos disponíveis no banco: ${data.length}`);
    if (data.length === 0) {
      console.log("[Push] Nenhum técnico com availability=disponivel encontrado");
      return [];
    }

    let userIds = data.map((r: any) => r.userId).filter(Boolean);
    console.log(`[Push] userIds dos técnicos disponíveis: [${userIds.join(", ")}]`);
    if (excludeUserId) {
      userIds = userIds.filter((id: number) => id !== excludeUserId);
      console.log(`[Push] Após excluir cliente (userId=${excludeUserId}): [${userIds.join(", ")}]`);
    }
    if (userIds.length === 0) {
      console.log("[Push] Nenhum técnico restante após exclusão do cliente");
      return [];
    }

    const tokenRows = await db.execute(
      `SELECT userId, token FROM push_tokens WHERE userId IN (${userIds.join(",")})`
    ) as any[];

    const tokenData = Array.isArray(tokenRows[0]) ? tokenRows[0] : tokenRows;
    console.log(`[Push] Tokens encontrados para técnicos: ${tokenData.length}`);
    if (tokenData.length === 0) {
      console.log("[Push] ATENÇÃO: Técnicos disponíveis existem mas não têm token push registrado.");
      console.log("[Push] Isso significa que os técnicos não abriram o app em dispositivo físico ou não concederam permissão de notificação.");
    }
    return tokenData.map((r: any) => r.token).filter(Boolean);
  } catch (err) {
    console.error("[Push] Erro ao buscar tokens de técnicos:", err);
    return [];
  }
}

/**
 * 🔴 URGENTE — Envia push para todos os técnicos disponíveis quando cliente cria pedido.
 * Usa channelId "prontotec-urgent" para som alto e vibração máxima no Android.
 */
export async function notifyTechniciansNewRequest(requestData: {
  id: number;
  clientName: string;
  serviceType: string;
  city: string;
  clientUserId?: number;
  urgency?: "normal" | "urgente";
}): Promise<void> {
  const tokens = await getTokensForAvailableTechnicians(requestData.clientUserId);
  if (tokens.length === 0) {
    console.log("[Push] Nenhum técnico disponível com token registrado");
    return;
  }

  const isUrgent = requestData.urgency === "urgente";
  const title = isUrgent ? "🚨 CHAMADO URGENTE!" : "🔔 Novo Pedido de Serviço";
  const body = `${requestData.clientName} precisa de ${requestData.serviceType} em ${requestData.city}`;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data: { type: "new_request", requestId: requestData.id, urgency: requestData.urgency ?? "normal" },
    sound: "default",
    priority: "high",
    channelId: isUrgent ? "prontotec-urgent" : "prontotec-default",
    ttl: 300, // expira em 5 minutos se não entregue
  }));

  console.log(`[Push] Enviando push ${isUrgent ? "URGENTE" : "normal"} para ${tokens.length} técnico(s)...`);
  await sendExpoPush(messages);
}

/**
 * 🔵 ATUALIZAÇÃO — Envia push para o cliente quando técnico aceita o pedido.
 */
export async function notifyClientRequestAccepted(data: {
  clientUserId: number;
  technicianName: string;
  requestId: number;
}): Promise<void> {
  const tokens = await getTokensByUserId(data.clientUserId);
  if (tokens.length === 0) {
    console.log("[Push] Cliente sem token registrado:", data.clientUserId);
    return;
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: "✅ Pedido Aceito!",
    body: `${data.technicianName} aceitou seu pedido e está a caminho`,
    data: { type: "request_accepted", requestId: data.requestId },
    sound: "default",
    priority: "high",
    channelId: "prontotec-default",
  }));

  console.log(`[Push] Enviando push de aceitação para cliente ${data.clientUserId}...`);
  await sendExpoPush(messages);
}

/**
 * 🔵 ATUALIZAÇÃO — Envia push para o cliente quando técnico recusa o pedido.
 */
export async function notifyClientRequestDeclined(data: {
  clientUserId: number;
  technicianName: string;
  requestId: number;
}): Promise<void> {
  const tokens = await getTokensByUserId(data.clientUserId);
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: "❌ Pedido Recusado",
    body: `${data.technicianName} não pode atender seu pedido no momento`,
    data: { type: "request_declined", requestId: data.requestId },
    sound: "default",
    priority: "normal",
    channelId: "prontotec-default",
  }));

  await sendExpoPush(messages);
}

/**
 * 🟡 CHAT — Envia push para o destinatário quando uma nova mensagem de chat é enviada.
 * Usa channelId "prontotec-chat" para push simples com som.
 */
export async function notifyNewChatMessage(data: {
  recipientUserId: number;
  senderName: string;
  requestId: number;
  messagePreview: string;
}): Promise<void> {
  const tokens = await getTokensByUserId(data.recipientUserId);
  if (tokens.length === 0) {
    console.log("[Push] Destinatário sem token registrado:", data.recipientUserId);
    return;
  }

  const preview = data.messagePreview.length > 80
    ? data.messagePreview.substring(0, 77) + "..."
    : data.messagePreview;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: `💬 ${data.senderName}`,
    body: preview,
    data: { type: "new_message", requestId: data.requestId },
    sound: "default",
    priority: "high",
    channelId: "prontotec-chat",
    mutableContent: true, // permite modificar a notificação no iOS
  }));

  console.log(`[Push] Enviando push de nova mensagem para userId ${data.recipientUserId}...`);
  await sendExpoPush(messages);
}

/**
 * Registra as rotas de push no Express.
 */
export function registerPushRoutes(app: Express): void {
  // POST /api/push/register — registra token Expo Push do dispositivo
  app.post("/api/push/register", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token de autenticação necessário" });
        return;
      }

      let session: any;
      try {
        session = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Sessão inválida" });
        return;
      }

      const { pushToken, platform = "unknown" } = req.body;
      if (!pushToken || typeof pushToken !== "string") {
        res.status(400).json({ error: "pushToken é obrigatório" });
        return;
      }

      // Validar formato do token Expo
      const isValidExpoToken = pushToken.startsWith("ExponentPushToken[") ||
        pushToken.startsWith("ExpoPushToken[");
      if (!isValidExpoToken) {
        console.warn(`[Push] Token com formato inesperado (rejeitado): ${pushToken.substring(0, 40)}`);
        res.status(400).json({ error: "Formato de token inválido. Use um dispositivo físico com Expo Go ou APK instalado." });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Banco de dados indisponível" });
        return;
      }

      const userId = session.id;
      // Inserir ou atualizar token — suporta múltiplos dispositivos por usuário
      await db.execute(
        `INSERT INTO push_tokens (userId, token, platform) VALUES (${userId}, '${pushToken.replace(/'/g, "''")}', '${platform}')
         ON DUPLICATE KEY UPDATE platform = '${platform}', updatedAt = NOW()`
      );

      console.log(`[Push] Token registrado para userId ${userId} (${platform}): ${pushToken.substring(0, 30)}...`);
      res.json({ success: true });
    } catch (err) {
      console.error("[Push] Erro ao registrar token:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // DELETE /api/push/unregister — remove token ao fazer logout
  app.delete("/api/push/unregister", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Token de autenticação necessário" });
        return;
      }

      let session: any;
      try {
        session = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Sessão inválida" });
        return;
      }

      const { pushToken } = req.body;
      const db = await getDb();
      if (db && pushToken) {
        await db.execute(
          `DELETE FROM push_tokens WHERE userId = ${session.id} AND token = '${pushToken.replace(/'/g, "''")}'`
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Push] Erro ao remover token:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });
}
