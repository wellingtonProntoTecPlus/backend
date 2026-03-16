import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { notifyTechniciansNewRequest, notifyClientRequestAccepted, notifyClientRequestDeclined, notifyNewChatMessage } from "./push-service";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── PERFIL DO USUÁRIO ─────────────────────────────────────────────────────
  user: router({
    getProfile: protectedProcedure.query(({ ctx }) =>
      db.getUserById(ctx.user.id)
    ),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          phone: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          addressStreet: z.string().optional(),
          addressNumber: z.string().optional(),
          addressComplement: z.string().optional(),
          addressNeighborhood: z.string().optional(),
          addressZipCode: z.string().optional(),
          addressLat: z.string().optional(),
          addressLng: z.string().optional(),
          avatarUrl: z.string().optional(),
          mode: z.enum(["cliente", "tecnico"]).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.updateUserProfile(ctx.user.id, input)
      ),

    // Salvar decisão de Autorização de Imagem e Depoimento
    saveImageAuthorization: protectedProcedure
      .input(
        z.object({
          decision: z.enum(["accepted", "refused"]),
          documentVersion: z.string().default("1.0"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.saveImageAuthorization(ctx.user.id, input.decision, input.documentVersion);
        return { success: true };
      }),

    // Obter decisão atual de Autorização de Imagem
    getImageAuthorization: protectedProcedure.query(async ({ ctx }) => {
      return db.getImageAuthorization(ctx.user.id);
    }),

    // Exclusão permanente de conta — exigida pelo Google Play e Apple App Store
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      try {
        // 1. Apagar tokens push
        await db.deletePushTokensByUserId(userId);
        // 2. Apagar mensagens de chat dos pedidos do usuário
        await db.deleteChatMessagesByUserId(userId);
        // 3. Apagar avaliações
        await db.deleteReviewsByUserId(userId);
        // 4. Apagar orçamentos
        await db.deleteQuotesByUserId(userId);
        // 5. Apagar pedidos de serviço
        await db.deleteServiceRequestsByUserId(userId);
        // 6. Apagar perfil de técnico
        await db.deleteTechnicianByUserId(userId);
        // 7. Apagar o usuário (deve ser o último)
        await db.deleteUserById(userId);
        // 8. Limpar cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        console.log(`[Account] Conta do usuário ${userId} excluída permanentemente`);
        return { success: true };
      } catch (err) {
        console.error(`[Account] Erro ao excluir conta do usuário ${userId}:`, err);
        throw new Error("Falha ao excluir conta. Tente novamente.");
      }
    }),
  }),

  // ─── TÉCNICOS ─────────────────────────────────────────────────────────────
  technicians: router({
    list: publicProcedure.query(() => db.getAllTechnicians()),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getTechnicianById(input.id)),

    getMyProfile: protectedProcedure.query(({ ctx }) =>
      db.getTechnicianByUserId(ctx.user.id)
    ),

    register: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          companyName: z.string().optional(),
          document: z.string().optional(),
          phone: z.string(),
          whatsapp: z.string().optional(),
          description: z.string().optional(),
          city: z.string(),
          state: z.string(),
          addressStreet: z.string().optional(),
          addressNumber: z.string().optional(),
          addressComplement: z.string().optional(),
          addressNeighborhood: z.string().optional(),
          addressZipCode: z.string().optional(),
          addressLat: z.string().optional(),
          addressLng: z.string().optional(),
          type: z.enum(["empresa", "autonomo", "certificada"]),
          specialties: z.array(z.string()),
          yearsExperience: z.number().optional(),
          photoUri: z.string().optional(),
          avatarUrl: z.string().optional(),
          companyLogoUrl: z.string().optional(),
          planType: z.enum(["basico", "destaque", "gratuito"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const badge = input.type === "empresa" ? "verificado" : "autonomo";
        const level = input.type === "empresa" ? "empresa_verificada" : "autonomo";
        // Verificar duplicação por CPF/CNPJ
        if (input.document) {
          const docClean = input.document.replace(/\D/g, "");
          const existingDoc = await db.getTechnicianByDocument(docClean);
          if (existingDoc && existingDoc.userId !== ctx.user.id) {
            throw new Error("CPF/CNPJ já cadastrado. Verifique seus dados ou entre em contato com o suporte.");
          }
        }
        // Verificar duplicação por telefone
        if (input.phone) {
          const phoneClean = input.phone.replace(/\D/g, "");
          const existingPhone = await db.getTechnicianByPhone(phoneClean);
          if (existingPhone && existingPhone.userId !== ctx.user.id) {
            throw new Error("Telefone já cadastrado por outro técnico. Verifique seus dados.");
          }
        }
        // Verificar se já tem perfil de técnico
        const existing = await db.getTechnicianByUserId(ctx.user.id);
        if (existing) {
          // Atualizar perfil existente — incluindo foto, logo e tipo
          await db.updateTechnician(existing.id, {
            name: input.name,
            companyName: input.companyName,
            document: input.document,
            phone: input.phone,
            whatsapp: input.whatsapp ?? input.phone,
            description: input.description ?? "",
            city: input.city,
            state: input.state,
            addressStreet: input.addressStreet,
            addressNumber: input.addressNumber,
            addressComplement: input.addressComplement,
            addressNeighborhood: input.addressNeighborhood,
            addressZipCode: input.addressZipCode,
            addressLat: input.addressLat,
            addressLng: input.addressLng,
            type: input.type,
            badge,
            level,
            specialties: input.specialties,
            yearsExperience: input.yearsExperience ?? existing.yearsExperience,
            planType: input.planType ?? existing.planType,
            ...(input.photoUri ? { photoUri: input.photoUri, avatarUrl: input.photoUri } : {}),
            ...(input.avatarUrl ? { avatarUrl: input.avatarUrl, photoUri: input.avatarUrl } : {}),
            ...(input.companyLogoUrl ? { companyLogoUrl: input.companyLogoUrl } : {}),
          });
          // Atualizar mode do user para tecnico
          await db.updateUserProfile(ctx.user.id, { mode: "tecnico" });
          return { id: existing.id, updated: true };
        }
        // Criar novo perfil
        const id = await db.createTechnician({
          userId: ctx.user.id,
          name: input.name,
          companyName: input.companyName,
          document: input.document,
          phone: input.phone,
          whatsapp: input.whatsapp ?? input.phone,
          description: input.description ?? "",
          city: input.city,
          state: input.state,
          addressStreet: input.addressStreet,
          addressNumber: input.addressNumber,
          addressComplement: input.addressComplement,
          addressNeighborhood: input.addressNeighborhood,
          addressZipCode: input.addressZipCode,
          addressLat: input.addressLat,
          addressLng: input.addressLng,
          type: input.type,
          badge,
          level,
          availability: "disponivel",
          photoUri: input.avatarUrl || input.photoUri,
          avatarUrl: input.avatarUrl || input.photoUri,
          companyLogoUrl: input.companyLogoUrl,
          specialties: input.specialties,
          yearsExperience: input.yearsExperience ?? 0,
          planType: input.planType ?? "gratuito",
        });
        // Atualizar mode do user para tecnico
        await db.updateUserProfile(ctx.user.id, { mode: "tecnico" });
        return { id, updated: false };
      }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          companyName: z.string().optional(),
          document: z.string().optional(),
          phone: z.string().optional(),
          whatsapp: z.string().optional(),
          description: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          addressStreet: z.string().optional(),
          addressNumber: z.string().optional(),
          addressComplement: z.string().optional(),
          addressNeighborhood: z.string().optional(),
          addressZipCode: z.string().optional(),
          availability: z.enum(["disponivel", "agenda_cheia", "indisponivel"]).optional(),
          photoUri: z.string().optional(),
          avatarUrl: z.string().optional(),
          companyLogoUrl: z.string().optional(),
          type: z.enum(["empresa", "autonomo", "certificada"]).optional(),
          specialties: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tech = await db.getTechnicianByUserId(ctx.user.id);
        if (!tech) throw new Error("Perfil de técnico não encontrado");
        // Recalcular badge e level se o tipo mudar
        const updateData: any = { ...input };
        if (input.type) {
          updateData.badge = input.type === "empresa" ? "verificado" : "autonomo";
          updateData.level = input.type === "empresa" ? "empresa_verificada" : "autonomo";
        }
        await db.updateTechnician(tech.id, updateData);
      }),
  }),

  // ─── SOLICITAÇÕES DE SERVIÇO ──────────────────────────────────────────────
  requests: router({
    myRequests: protectedProcedure.query(({ ctx }) =>
      db.getRequestsByClientId(ctx.user.id)
    ),

    openRequests: protectedProcedure.query(() =>
      db.getAllOpenRequests()
    ),

    // Busca chamados aceitos/em andamento pelo técnico logado
    myTechnicianRequests: protectedProcedure.query(async ({ ctx }) => {
      const tech = await db.getTechnicianByUserId(ctx.user.id);
      if (!tech) return [];
      return db.getRequestsByTechnicianId(tech.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getRequestById(input.id)),

    create: protectedProcedure
      .input(
        z.object({
          category: z.string(),
          description: z.string(),
          photoUrl: z.string().optional(),
          location: z.string(),
          urgency: z.enum(["normal", "urgente"]).optional(),
          clientName: z.string().optional(),
          clientPhone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const requestId = await db.createServiceRequest({
          clientId: ctx.user.id,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          category: input.category,
          description: input.description,
          photoUrl: input.photoUrl,
          location: input.location,
          urgency: input.urgency ?? "normal",
          status: "solicitado",
        });
        // Notificar técnicos disponíveis via push remoto (excluindo o próprio cliente)
        notifyTechniciansNewRequest({
          id: requestId,
          clientName: input.clientName || "Cliente",
          serviceType: input.category,
          city: input.location,
          clientUserId: ctx.user.id,
          urgency: (input.urgency as "normal" | "urgente") ?? "normal",
        }).catch((err) => console.error("[Push] Erro ao notificar técnicos:", err));
        return requestId;
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
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
          ]),
          technicianId: z.number().optional(),
          technicianName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateServiceRequestStatus(input.id, input.status, input.technicianId);

        // Enviar push para o cliente quando técnico aceita ou recusa
        if (input.status === "em_analise" || input.status === "tecnico_a_caminho" || input.status === "em_andamento") {
          const request = await db.getRequestById(input.id);
          if (request?.clientId) {
            notifyClientRequestAccepted({
              clientUserId: request.clientId,
              technicianName: input.technicianName || "Técnico",
              requestId: input.id,
            }).catch((err) => console.error("[Push] Erro ao notificar cliente:", err));
          }
        } else if (input.status === "cancelado") {
          const request = await db.getRequestById(input.id);
          if (request?.clientId && input.technicianName) {
            notifyClientRequestDeclined({
              clientUserId: request.clientId,
              technicianName: input.technicianName,
              requestId: input.id,
            }).catch((err) => console.error("[Push] Erro ao notificar cliente:", err));
          }
        }
      }),
  }),

  // ─── ORÇAMENTOS ───────────────────────────────────────────────────────────
  quotes: router({
    byRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(({ input }) => db.getQuotesByRequestId(input.requestId)),

    create: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          price: z.string(),
          description: z.string(),
          estimatedTime: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tech = await db.getTechnicianByUserId(ctx.user.id);
        if (!tech) throw new Error("Perfil de técnico não encontrado");
        return db.createQuote({
          requestId: input.requestId,
          technicianId: tech.id,
          price: input.price,
          description: input.description,
          estimatedTime: input.estimatedTime,
          status: "pendente",
        });
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pendente", "aceito", "recusado"]),
        })
      )
      .mutation(({ input }) => db.updateQuoteStatus(input.id, input.status)),
  }),

  // ─── CHAT ───────────────────────────────────────────────────────────────
  chat: router({
    getMessages: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(({ input }) => db.getChatMessages(input.requestId)),

    sendMessage: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        const senderName = user?.name || "Usuário";
        const messageId = await db.createChatMessage({
          requestId: input.requestId,
          senderId: ctx.user.id,
          senderName,
          content: input.content,
          isRead: false,
        });

        // Enviar push para o destinatário (quem não é o remetente)
        try {
          const request = await db.getRequestById(input.requestId);
          if (request) {
            // Se remetente é o cliente, notificar o técnico; se é o técnico, notificar o cliente
            let recipientUserId: number | null = null;
            if (request.clientId === ctx.user.id && request.technicianId) {
              // Remetente é o cliente — buscar userId do técnico
              const tech = await db.getTechnicianById(request.technicianId);
              if (tech?.userId) recipientUserId = tech.userId;
            } else if (request.clientId !== ctx.user.id) {
              // Remetente é o técnico — notificar o cliente
              recipientUserId = request.clientId;
            }

            if (recipientUserId && recipientUserId !== ctx.user.id) {
              notifyNewChatMessage({
                recipientUserId,
                senderName,
                requestId: input.requestId,
                messagePreview: input.content,
              }).catch((err) => console.error("[Push] Erro ao notificar mensagem:", err));
            }
          }
        } catch (err) {
          console.error("[Push] Erro ao buscar dados para notificação de chat:", err);
        }

        return { id: messageId, success: true };
      }),

    markRead: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Atualiza o lastSeenId para o ID máximo da conversa (por usuário)
        // Isso não afeta o outro usuário — cada um tem seu próprio lastSeenId
        const dbConn = await db.getDb();
        if (!dbConn) return;
        const rows = await dbConn.execute(
          `SELECT MAX(id) as maxId FROM chatMessages WHERE requestId = ${input.requestId}`
        ) as any[];
        const data = Array.isArray(rows[0]) ? rows[0] : rows;
        const maxId = data[0]?.maxId ?? 0;
        if (maxId > 0) {
          await dbConn.execute(
            `INSERT INTO chat_last_seen (userId, requestId, lastSeenId) VALUES (${ctx.user.id}, ${input.requestId}, ${maxId})
             ON DUPLICATE KEY UPDATE lastSeenId = GREATEST(lastSeenId, ${maxId}), updatedAt = NOW()`
          );
        }
        // Mantém compatibilidade: também marca isRead para mensagens enviadas pelo outro
        await db.markMessagesAsRead(input.requestId, ctx.user.id);
      }),

    unreadCount: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Conta mensagens enviadas pelo outro usuário que são mais novas que o lastSeenId
        const dbConn = await db.getDb();
        if (!dbConn) return 0;
        const rows = await dbConn.execute(
          `SELECT COUNT(*) as cnt FROM chatMessages cm
           WHERE cm.requestId = ${input.requestId}
             AND cm.senderId != ${ctx.user.id}
             AND cm.id > COALESCE(
               (SELECT lastSeenId FROM chat_last_seen WHERE userId = ${ctx.user.id} AND requestId = ${input.requestId}),
               0
             )`
        ) as any[];
        const data = Array.isArray(rows[0]) ? rows[0] : rows;
        return Number(data[0]?.cnt ?? 0);
      }),

    totalUnread: protectedProcedure.query(async ({ ctx }) => {
      // Conta todas as mensagens não vistas pelo usuário em todos os seus chamados
      const dbConn = await db.getDb();
      if (!dbConn) return 0;
      const userId = ctx.user.id;
      const rows = await dbConn.execute(
        `SELECT COUNT(*) as cnt
         FROM chatMessages cm
         INNER JOIN serviceRequests sr ON cm.requestId = sr.id
         WHERE cm.senderId != ${userId}
           AND (sr.clientId = ${userId}
             OR sr.technicianId IN (SELECT id FROM technicians WHERE userId = ${userId}))
           AND cm.id > COALESCE(
             (SELECT lastSeenId FROM chat_last_seen WHERE userId = ${userId} AND requestId = cm.requestId),
             0
           )`
      ) as any[];
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      return Number(data[0]?.cnt ?? 0);
    }),

    // Retorna mensagens não vistas com detalhes do remetente para o monitor global
    getUnreadSummary: protectedProcedure.query(async ({ ctx }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const userId = ctx.user.id;
        // Busca mensagens que o usuário ainda não viu (id > lastSeenId)
        // Filtra pelos pedidos onde o usuário é cliente ou técnico
        const rows = await dbConn.execute(
          `SELECT cm.id, cm.requestId, cm.senderId, cm.senderName, cm.content, cm.createdAt
           FROM chatMessages cm
           INNER JOIN serviceRequests sr ON cm.requestId = sr.id
           WHERE cm.senderId != ${userId}
             AND (sr.clientId = ${userId}
               OR sr.technicianId IN (SELECT id FROM technicians WHERE userId = ${userId}))
             AND cm.id > COALESCE(
               (SELECT lastSeenId FROM chat_last_seen WHERE userId = ${userId} AND requestId = cm.requestId),
               0
             )
           ORDER BY cm.createdAt DESC
           LIMIT 20`
        ) as any[];
        const data = Array.isArray(rows[0]) ? rows[0] : rows;
        return data as Array<{ id: number; requestId: number; senderId: number; senderName: string; content: string; createdAt: string }>;
      } catch {
        return [];
      }
    }),
  }),

  // ─── AVALIAÇÕES ───────────────────────────────────────────────────────────
  reviews: router({
    byTechnician: publicProcedure
      .input(z.object({ technicianId: z.number() }))
      .query(({ input }) => db.getReviewsByTechnicianId(input.technicianId)),

    create: protectedProcedure
      .input(
        z.object({
          technicianId: z.number(),
          requestId: z.number().optional(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
          tags: z.array(z.string()).optional(),
          serviceCategory: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        db.createReview({
          technicianId: input.technicianId,
          clientId: ctx.user.id,
          requestId: input.requestId,
          clientName: "Cliente",
          rating: input.rating,
          comment: input.comment,
          tags: input.tags,
          serviceCategory: input.serviceCategory,
        })
      ),
  }),
});

export type AppRouter = typeof appRouter;
