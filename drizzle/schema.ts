import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Perfil do usuário/cliente
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  addressStreet: varchar("addressStreet", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressZipCode: varchar("addressZipCode", { length: 10 }),
  addressLat: decimal("addressLat", { precision: 10, scale: 7 }),
  addressLng: decimal("addressLng", { precision: 10, scale: 7 }),
  avatarUrl: text("avatarUrl"),
  mode: mysqlEnum("mode", ["cliente", "tecnico"]).default("cliente").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de técnicos — perfil profissional completo.
 */
export const technicians = mysqlTable("technicians", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK para users.id
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  document: varchar("document", { length: 20 }), // CPF ou CNPJ
  phone: varchar("phone", { length: 20 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 20 }),
  description: text("description"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  addressStreet: varchar("addressStreet", { length: 255 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressZipCode: varchar("addressZipCode", { length: 10 }),
  addressLat: decimal("addressLat", { precision: 10, scale: 7 }),
  addressLng: decimal("addressLng", { precision: 10, scale: 7 }),
  type: mysqlEnum("type", ["empresa", "autonomo", "certificada"]).default("autonomo").notNull(),
  badge: mysqlEnum("badge", ["verificado", "autonomo", "certificada"]).default("autonomo").notNull(),
  level: mysqlEnum("level", ["autonomo", "empresa_verificada", "parceiro_prontotec"]).default("autonomo").notNull(),
  availability: mysqlEnum("availability", ["disponivel", "agenda_cheia", "indisponivel"]).default("disponivel").notNull(),
  avatarUrl: text("avatarUrl"),
  photoUri: text("photoUri"),
  companyLogoUrl: text("companyLogoUrl"),
  specialties: json("specialties").$type<string[]>().notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00"),
  totalReviews: int("totalReviews").default(0).notNull(),
  totalServices: int("totalServices").default(0).notNull(),
  yearsExperience: int("yearsExperience").default(0).notNull(),
  planType: mysqlEnum("planType", ["basico", "destaque", "gratuito"]).default("gratuito").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Technician = typeof technicians.$inferSelect;
export type InsertTechnician = typeof technicians.$inferInsert;

/**
 * Solicitações de serviço dos clientes.
 */
export const serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(), // FK para users.id
  clientName: varchar("clientName", { length: 255 }),
  clientPhone: varchar("clientPhone", { length: 20 }),
  clientAddress: text("clientAddress"),
  technicianId: int("technicianId"), // FK para technicians.id (opcional)
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photoUrl"),
  location: varchar("location", { length: 255 }).notNull(),
  status: mysqlEnum("status", [
    "solicitado",
    "em_analise",
    "orcamento_enviado",
    "servico_aprovado",
    "tecnico_a_caminho",
    "em_andamento",
    "aguardando_confirmacao",
    "finalizado_cliente",
    "encerrado",
    "cancelado",
  ]).default("solicitado").notNull(),
  urgency: mysqlEnum("urgency", ["normal", "urgente"]).default("normal").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Orçamentos enviados pelos técnicos.
 */
export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(), // FK para serviceRequests.id
  technicianId: int("technicianId").notNull(), // FK para technicians.id
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  estimatedTime: varchar("estimatedTime", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pendente", "aceito", "recusado"]).default("pendente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

/**
 * Avaliações dos clientes sobre os técnicos.
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  technicianId: int("technicianId").notNull(), // FK para technicians.id
  clientId: int("clientId").notNull(), // FK para users.id
  requestId: int("requestId"), // FK para serviceRequests.id (opcional)
  clientName: varchar("clientName", { length: 255 }).notNull(),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment"),
  tags: json("tags").$type<string[]>(),
  serviceCategory: varchar("serviceCategory", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Mensagens de chat entre cliente e técnico.
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(), // FK para serviceRequests.id
  senderId: int("senderId").notNull(), // FK para users.id
  senderName: varchar("senderName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
