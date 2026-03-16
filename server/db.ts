import { eq, desc, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  technicians,
  serviceRequests,
  quotes,
  reviews,
  chatMessages,
  type InsertUser,
  type InsertTechnician,
  type InsertServiceRequest,
  type InsertQuote,
  type InsertReview,
  type InsertChatMessage,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS (core auth) ────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateUserProfile(
  id: number,
  data: {
    name?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    addressStreet?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    addressNeighborhood?: string | null;
    addressZipCode?: string | null;
    addressLat?: string | null;
    addressLng?: string | null;
    avatarUrl?: string | null;
    mode?: "cliente" | "tecnico";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

// ─── TECHNICIANS ──────────────────────────────────────────────────────────────

export async function getAllTechnicians() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(technicians)
    .where(eq(technicians.isActive, true))
    .orderBy(desc(technicians.rating));
}

export async function getTechnicianByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(technicians)
    .where(eq(technicians.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTechnicianByDocument(document: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(technicians)
    .where(eq(technicians.document, document))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTechnicianByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(technicians)
    .where(or(eq(technicians.phone, phone), eq(technicians.whatsapp, phone)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTechnicianById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(technicians)
    .where(eq(technicians.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTechnician(data: InsertTechnician) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(technicians).values(data);
  return result[0].insertId;
}

export async function updateTechnician(id: number, data: Partial<InsertTechnician>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(technicians).set(data).where(eq(technicians.id, id));
}

// ─── SERVICE REQUESTS ─────────────────────────────────────────────────────────

export async function getRequestsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.clientId, clientId))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function getRequestsByTechnicianId(technicianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.technicianId, technicianId))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function getAllOpenRequests() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.status, "solicitado"))
    .orderBy(desc(serviceRequests.createdAt));
}

export async function getRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createServiceRequest(data: InsertServiceRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceRequests).values(data);
  return result[0].insertId;
}

export async function updateServiceRequestStatus(
  id: number,
  status: InsertServiceRequest["status"],
  technicianId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertServiceRequest> = { status };
  if (technicianId !== undefined) updateData.technicianId = technicianId;
  await db.update(serviceRequests).set(updateData).where(eq(serviceRequests.id, id));
}

// ─── QUOTES ───────────────────────────────────────────────────────────────────

export async function getQuotesByRequestId(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(quotes)
    .where(eq(quotes.requestId, requestId))
    .orderBy(desc(quotes.createdAt));
}

export async function createQuote(data: InsertQuote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quotes).values(data);
  return result[0].insertId;
}

export async function updateQuoteStatus(id: number, status: "pendente" | "aceito" | "recusado") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quotes).set({ status }).where(eq(quotes.id, id));
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function getReviewsByTechnicianId(technicianId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.technicianId, technicianId))
    .orderBy(desc(reviews.createdAt));
}

// ─── CHAT MESSAGES ────────────────────────────────────────────────────────────

export async function getChatMessages(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.requestId, requestId))
    .orderBy(chatMessages.createdAt);
}

export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chatMessages).values(data);
  return result[0].insertId;
}

export async function markMessagesAsRead(requestId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(eq(chatMessages.requestId, requestId));
}

export async function getUnreadMessageCount(requestId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.requestId, requestId));
  return messages.filter(m => !m.isRead && m.senderId !== userId).length;
}

export async function getTotalUnreadMessages(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.isRead, false));
  return messages.filter(m => m.senderId !== userId).length;
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  const allReviews = await getReviewsByTechnicianId(data.technicianId);
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await updateTechnician(data.technicianId, {
    rating: avg.toFixed(2),
    totalReviews: allReviews.length,
  });
  return result[0].insertId;
}

// ─── AUTORIZAÇÃO DE IMAGEM E DEPOIMENTO ──────────────────────────────────────

export async function saveImageAuthorization(
  userId: number,
  decision: "accepted" | "refused",
  documentVersion: string = "1.0"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    `INSERT INTO image_authorizations (user_id, decision, document_version, decided_at)
     VALUES (${userId}, '${decision}', '${documentVersion}', NOW())
     ON DUPLICATE KEY UPDATE decision = '${decision}', document_version = '${documentVersion}', decided_at = NOW()`
  );
}

export async function getImageAuthorization(userId: number): Promise<{
  decision: string;
  document_version: string;
  decided_at: Date;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.execute(
    `SELECT decision, document_version, decided_at FROM image_authorizations WHERE user_id = ${userId} LIMIT 1`
  ) as any;
  const data = rows[0] as any[];
  return data?.[0] ?? null;
}

// ─── EXCLUSÃO PERMANENTE DE CONTA ────────────────────────────────────────────

export async function deletePushTokensByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(`DELETE FROM push_tokens WHERE userId = ${userId}`);
  } catch (e) {
    console.warn("[Delete] push_tokens:", e);
  }
}

export async function deleteChatMessagesByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(chatMessages).where(eq(chatMessages.senderId, userId));
  const clientRequests = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(eq(serviceRequests.clientId, userId));
  for (const req of clientRequests) {
    await db.delete(chatMessages).where(eq(chatMessages.requestId, req.id));
  }
  const tech = await getTechnicianByUserId(userId);
  if (tech) {
    const techRequests = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.technicianId, tech.id));
    for (const req of techRequests) {
      await db.delete(chatMessages).where(eq(chatMessages.requestId, req.id));
    }
  }
}

export async function deleteReviewsByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(reviews).where(eq(reviews.clientId, userId));
  const tech = await getTechnicianByUserId(userId);
  if (tech) {
    await db.delete(reviews).where(eq(reviews.technicianId, tech.id));
  }
}

export async function deleteQuotesByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const clientRequests = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(eq(serviceRequests.clientId, userId));
  for (const req of clientRequests) {
    await db.delete(quotes).where(eq(quotes.requestId, req.id));
  }
  const tech = await getTechnicianByUserId(userId);
  if (tech) {
    await db.delete(quotes).where(eq(quotes.technicianId, tech.id));
    const techRequests = await db
      .select({ id: serviceRequests.id })
      .from(serviceRequests)
      .where(eq(serviceRequests.technicianId, tech.id));
    for (const req of techRequests) {
      await db.delete(quotes).where(eq(quotes.requestId, req.id));
    }
  }
}

export async function deleteServiceRequestsByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(serviceRequests).where(eq(serviceRequests.clientId, userId));
  const tech = await getTechnicianByUserId(userId);
  if (tech) {
    await db.delete(serviceRequests).where(eq(serviceRequests.technicianId, tech.id));
  }
}

export async function deleteTechnicianByUserId(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(technicians).where(eq(technicians.userId, userId));
}

export async function deleteUserById(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}
