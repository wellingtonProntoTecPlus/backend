/**
 * Sistema de Notificações do ProntoTEC+
 *
 * 3 tipos de alerta:
 * 🔴 URGENTE  — channelId: prontotec-urgent (som alto + vibração máxima)
 * 🟡 CHAT     — channelId: prontotec-chat (push simples com som)
 * 🔵 ATUALIZAÇÃO — channelId: prontotec-default (notificação padrão)
 */
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

// Detecta se está rodando no Expo Go (não suporta remote push desde SDK 53)
const isExpoGo = Constants.executionEnvironment === "storeClient";

/**
 * Handler global de notificações.
 * Garante que notificações apareçam com som e alerta mesmo com o app em foreground.
 * DEVE ser chamado antes de qualquer uso de Notifications.
 */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as Record<string, unknown> | null;
      const type = data?.type as string | undefined;

      // Chamados urgentes: sempre mostrar com som máximo
      if (type === "new_request" && data?.urgency === "urgente") {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        };
      }

      // Mensagens de chat: mostrar com som
      if (type === "new_message") {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      }

      // Atualizações de status: mostrar sem som
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

/**
 * Configura o listener de toque em notificações para navegar para a tela correta.
 * Deve ser chamado no _layout.tsx.
 * Retorna a função de cleanup para usar no useEffect.
 */
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | null;
    if (!data) return;

    const type = data.type as string | undefined;
    const requestId = data.requestId as number | undefined;

    try {
      if (type === "new_message" && requestId) {
        // Navegar para o chat do chamado
        router.push(`/chat/${requestId}` as any);
      } else if ((type === "new_request" || type === "request_accepted" || type === "request_declined") && requestId) {
        // Navegar para o detalhe do chamado
        router.push(`/request/${requestId}` as any);
      }
    } catch {
      // Silencia erros de navegação (ex: app ainda carregando)
    }
  });

  return () => subscription.remove();
}

/**
 * Solicita permissão para notificações e configura os canais Android.
 * Retorna true se a permissão foi concedida.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // Configurar canais Android (não funciona no Expo Go)
  if (Platform.OS === "android" && !isExpoGo) {
    // Canal padrão — atualizações de status
    await Notifications.setNotificationChannelAsync("prontotec-default", {
      name: "ProntoTEC+ Notificações",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: "#1A3A5C",
      sound: "default",
    });

    // Canal de chat — mensagens
    await Notifications.setNotificationChannelAsync("prontotec-chat", {
      name: "ProntoTEC+ Chat",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0a7ea4",
      sound: "default",
    });

    // Canal urgente — novos chamados urgentes
    await Notifications.setNotificationChannelAsync("prontotec-urgent", {
      name: "ProntoTEC+ Urgente",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: "#EF4444",
      sound: "default",
      bypassDnd: true, // ignora modo não perturbe
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

/**
 * Agenda uma notificação local imediata.
 */
async function scheduleLocal(
  content: Notifications.NotificationContentInput,
  channelId: string = "prontotec-default"
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: "default",
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: null, // imediato
    });
  } catch {
    // Silencia erros para não quebrar o fluxo do app
  }
}

/**
 * 🔴 URGENTE — Notifica o técnico sobre um novo serviço urgente.
 */
export async function notifyTechnicianNewUrgentService(params: {
  clientName: string;
  serviceType: string;
  city: string;
}) {
  await scheduleLocal(
    {
      title: "🚨 CHAMADO URGENTE!",
      body: `${params.clientName} precisa de ${params.serviceType} em ${params.city}. Toque para aceitar.`,
      data: { type: "urgent_service", city: params.city },
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    "prontotec-urgent"
  );
}

/**
 * 🔵 ATUALIZAÇÃO — Notifica o técnico sobre uma nova solicitação de serviço.
 */
export async function notifyTechnicianNewRequest(params: {
  clientName: string;
  serviceType: string;
}) {
  await scheduleLocal(
    {
      title: "📥 Nova Solicitação de Serviço",
      body: `${params.clientName} solicitou: ${params.serviceType}. Veja os detalhes e envie um orçamento.`,
      data: { type: "new_request" },
    },
    "prontotec-default"
  );
}

/**
 * 🔵 ATUALIZAÇÃO — Notifica o cliente que um técnico aceitou seu pedido.
 */
export async function notifyClientTechnicianAccepted(params: {
  technicianName: string;
  serviceType: string;
}) {
  await scheduleLocal(
    {
      title: "✅ Técnico Aceitou seu Pedido!",
      body: `${params.technicianName} aceitou sua solicitação de ${params.serviceType}. Entre em contato pelo chat.`,
      data: { type: "request_accepted" },
    },
    "prontotec-default"
  );
}

/**
 * 🔵 ATUALIZAÇÃO — Notifica o cliente que recebeu um novo orçamento.
 */
export async function notifyClientNewQuote(params: {
  technicianName: string;
  serviceType: string;
  price: number;
}) {
  await scheduleLocal(
    {
      title: "💰 Novo Orçamento Recebido",
      body: `${params.technicianName} enviou um orçamento de R$ ${params.price.toFixed(2)} para ${params.serviceType}.`,
      data: { type: "new_quote" },
    },
    "prontotec-default"
  );
}

/**
 * 🟡 CHAT — Notifica sobre nova mensagem no chat.
 */
export async function notifyNewMessage(params: {
  senderName: string;
  message: string;
}) {
  await scheduleLocal(
    {
      title: `💬 ${params.senderName}`,
      body: params.message.length > 80 ? params.message.slice(0, 80) + "..." : params.message,
      data: { type: "new_message" },
    },
    "prontotec-chat"
  );
}

/**
 * 🔵 ATUALIZAÇÃO — Notifica que um serviço foi concluído e solicita avaliação.
 */
export async function notifyServiceCompleted(params: {
  technicianName: string;
  serviceType: string;
  requestId: string;
}) {
  await scheduleLocal(
    {
      title: "🎉 Serviço Concluído!",
      body: `${params.serviceType} por ${params.technicianName} foi concluído. Avalie o atendimento!`,
      data: { type: "service_completed", requestId: params.requestId },
    },
    "prontotec-default"
  );
}

/** Alias para compatibilidade */
export const notifyClientRequestAccepted = notifyClientTechnicianAccepted;
