import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { RequestStatus, Message, Quote } from "@/lib/types";
import { trpc } from "@/lib/trpc";

// Configuração de cada status do fluxo
const STATUS_STEPS: { status: RequestStatus; label: string; icon: string; description: string }[] = [
  { status: "solicitado", label: "Solicitado", icon: "send", description: "Chamado enviado, aguardando técnico" },
  { status: "em_analise", label: "Em Análise", icon: "search", description: "Técnico analisando o chamado" },
  { status: "orcamento_enviado", label: "Orçamento", icon: "request-quote", description: "Orçamento enviado pelo técnico" },
  { status: "servico_aprovado", label: "Aprovado", icon: "check-circle", description: "Orçamento aceito pelo cliente" },
  { status: "tecnico_a_caminho", label: "A Caminho", icon: "directions-car", description: "Técnico a caminho" },
  { status: "em_andamento", label: "Em Andamento", icon: "build", description: "Serviço sendo executado" },
  { status: "aguardando_confirmacao", label: "Aguardando", icon: "hourglass-top", description: "Aguardando confirmação do cliente" },
  { status: "finalizado_cliente", label: "Finalizado", icon: "done-all", description: "Cliente confirmou conclusão" },
  { status: "encerrado", label: "Encerrado", icon: "star", description: "Avaliação feita, chamado encerrado" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.status);

const STATUS_COLOR: Record<string, string> = {
  solicitado: "#F59E0B",
  em_analise: "#3B82F6",
  orcamento_enviado: "#8B5CF6",
  servico_aprovado: "#10B981",
  tecnico_a_caminho: "#06B6D4",
  em_andamento: "#F97316",
  aguardando_confirmacao: "#EAB308",
  finalizado_cliente: "#22C55E",
  encerrado: "#6B7280",
  cancelado: "#EF4444",
};

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { requests, user, technicians, updateRequest, addQuote, acceptQuote } = useAppContext();
  const [activeTab, setActiveTab] = useState<"status" | "chat">("status");
  const [inputText, setInputText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");
  const [quoteTime, setQuoteTime] = useState("");

  // Buscar do servidor se não encontrar localmente
  const localRequest = requests.find((r) => r.id === id);
  // Extrair o ID numérico: "server_5" → 5, "5" → 5, "req_1234" → NaN
  const numericId = id ? parseInt(id.replace(/^server_/, ""), 10) : NaN;
  const serverRequestQuery = trpc.requests.getById.useQuery(
    { id: isNaN(numericId) ? 0 : numericId },
    { enabled: !!id && !localRequest && !isNaN(numericId) }
  );

  const serverRequest = serverRequestQuery.data
    ? ({
        id: String(serverRequestQuery.data.id),
        clientId: String(serverRequestQuery.data.clientId),
        clientName: serverRequestQuery.data.clientName ?? undefined,
        clientPhone: serverRequestQuery.data.clientPhone ?? undefined,
        technicianId: serverRequestQuery.data.technicianId ? String(serverRequestQuery.data.technicianId) : undefined,
        category: serverRequestQuery.data.category as any,
        description: serverRequestQuery.data.description,
        photoUrl: serverRequestQuery.data.photoUrl ?? undefined,
        location: serverRequestQuery.data.location,
        status: serverRequestQuery.data.status as any,
        urgency: serverRequestQuery.data.urgency as any,
        quotes: [],
        createdAt: new Date(serverRequestQuery.data.createdAt).toISOString(),
        updatedAt: new Date(serverRequestQuery.data.updatedAt).toISOString(),
      } as any)
    : null;

  const request = localRequest ?? serverRequest;
  const technician = request?.technicianId
    ? technicians.find((t) => t.id === request.technicianId)
    : undefined;
  const isTechMode = user.mode === "tecnico";
  // Extrair o ID numérico para o chat: "server_5" → 5, "5" → 5, "req_1234" → 0
  const numericRequestId = id ? parseInt(id.replace(/^server_/, ""), 10) : NaN;
  const validNumericId = !isNaN(numericRequestId) && numericRequestId > 0 ? numericRequestId : 0;

  // Buscar mensagens do servidor com polling a cada 3 segundos
  const {
    data: serverMessages = [],
    refetch: refetchMessages,
  } = trpc.chat.getMessages.useQuery(
    { requestId: validNumericId },
    { enabled: validNumericId > 0, refetchInterval: 3000, refetchIntervalInBackground: false }
  );

  const { data: unreadCount = 0, refetch: refetchUnread } = trpc.chat.unreadCount.useQuery(
    { requestId: validNumericId },
    { enabled: validNumericId > 0, refetchInterval: 5000, refetchIntervalInBackground: true }
  );

  // Mutation para enviar mensagem via tRPC
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  // Mutation para marcar mensagens como lidas
  const markReadMutation = trpc.chat.markRead.useMutation({
    onSuccess: () => refetchUnread(),
  });

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      // Marcar mensagens como lidas ao abrir a aba de chat
      if (validNumericId > 0) {
        markReadMutation.mutate({ requestId: validNumericId });
      }
    }
  }, [activeTab, serverMessages.length]);

  if (!request) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <MaterialIcons name="error-outline" size={48} color={colors.muted} />
        <Text style={{ color: colors.foreground, fontSize: 16, marginTop: 12 }}>Chamado não encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: "#1A3A5C", fontWeight: "700" }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(request.status as RequestStatus);
  const statusConfig = STATUS_STEPS.find((s) => s.status === request.status);
  const statusColor = STATUS_COLOR[request.status] || "#6B7280";

  const handleSend = async () => {
    if (!inputText.trim() || chatSending || validNumericId <= 0) return;
    setChatSending(true);
    const text = inputText.trim();
    setInputText("");
    try {
      await sendMessageMutation.mutateAsync({ requestId: validNumericId, content: text });
    } catch (err) {
      console.error("[Chat] Erro ao enviar mensagem:", err);
      setInputText(text); // restaurar em caso de erro
    } finally {
      setChatSending(false);
    }
  };

  // Enviar orçamento
  const handleSubmitQuote = () => {
    const price = parseFloat(quotePrice.replace(",", "."));
    if (!price || price <= 0) {
      Alert.alert("Atenção", "Informe um valor válido para o orçamento.");
      return;
    }
    if (!quoteDesc.trim()) {
      Alert.alert("Atenção", "Descreva o serviço a ser realizado.");
      return;
    }
    if (!quoteTime.trim()) {
      Alert.alert("Atenção", "Informe o prazo estimado.");
      return;
    }
    const quote = {
      id: `quote_${Date.now()}`,
      requestId: id || "",
      technicianId: user.technicianProfile?.id || "tech1",
      price,
      description: quoteDesc.trim(),
      estimatedTime: quoteTime.trim(),
      createdAt: new Date().toISOString(),
      status: "pendente" as const,
    };
    addQuote(id || "", quote);
    setShowQuoteModal(false);
    setQuotePrice("");
    setQuoteDesc("");
    setQuoteTime("");
    const autoMsg: Message = {
      id: `msg_auto_${Date.now()}`,
      requestId: id || "",
      senderId: "system",
      senderName: "Sistema",
      content: `💰 Orçamento enviado: R$ ${price.toFixed(2)} — ${quoteDesc.trim()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      isFromMe: false,
    };
    if (validNumericId > 0) {
      sendMessageMutation.mutate({ requestId: validNumericId, content: autoMsg.content });
    }
    Alert.alert("Orçamento enviado!", "O cliente será notificado para analisar sua proposta.");
  };

  // Ações do técnico
  const handleTechnicianAction = () => {
    // Envio de orçamento abre modal
    if (request.status === "em_analise") {
      setShowQuoteModal(true);
      return;
    }
    const nextActions: Partial<Record<RequestStatus, { label: string; next: RequestStatus; message: string }>> = {
      solicitado: { label: "Analisar Chamado", next: "em_analise", message: "Você está analisando este chamado." },
      servico_aprovado: { label: "Confirmar Deslocamento", next: "tecnico_a_caminho", message: "Você está a caminho!" },
      tecnico_a_caminho: { label: "Iniciar Serviço", next: "em_andamento", message: "Serviço iniciado." },
      em_andamento: { label: "Marcar como Concluído", next: "aguardando_confirmacao", message: "Aguardando confirmação do cliente." },
    };
    const action = nextActions[request.status as RequestStatus];
    if (!action) return;
    Alert.alert(action.label, action.message + " Confirmar?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: () => {
          updateRequest(request.id, { status: action.next });
          const autoMsg: Message = {
            id: `msg_auto_${Date.now()}`,
            requestId: id || "",
            senderId: "system",
            senderName: "Sistema",
            content: `🔔 Status atualizado: ${STATUS_STEPS.find((s) => s.status === action.next)?.label}`,
            timestamp: new Date().toISOString(),
            isRead: false,
            isFromMe: false,
          };
          if (validNumericId > 0) {
            sendMessageMutation.mutate({ requestId: validNumericId, content: autoMsg.content });
          }
        },
      },
    ]);
  };

  // Ações do cliente
  const handleClientAction = () => {
    if (request.status === "aguardando_confirmacao") {
      Alert.alert(
        "Confirmar conclusão?",
        "Você confirma que o serviço foi realizado com sucesso?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: () => {
              updateRequest(request.id, { status: "finalizado_cliente" });
              const autoMsg: Message = {
                id: `msg_auto_${Date.now()}`,
                requestId: id || "",
                senderId: "system",
                senderName: "Sistema",
                content: "✅ Cliente confirmou a conclusão do serviço!",
                timestamp: new Date().toISOString(),
                isRead: false,
                isFromMe: false,
              };
              // mensagem de sistema via tRPC se tiver ID válido
              if (validNumericId > 0) {
                sendMessageMutation.mutate({ requestId: validNumericId, content: autoMsg.content });
              }
              Alert.alert(
                "Serviço confirmado!",
                "Deseja avaliar o técnico?",
                [
                  { text: "Agora não", style: "cancel" },
                  { text: "Avaliar", onPress: () => router.push({ pathname: "/review/[id]", params: { id: request.id } } as any) },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const canTechAct = isTechMode && ["solicitado", "em_analise", "servico_aprovado", "tecnico_a_caminho", "em_andamento"].includes(request.status);
  const canClientConfirm = !isTechMode && request.status === "aguardando_confirmacao";
  const canReview = !isTechMode && request.status === "finalizado_cliente" && !request.review;

  const renderMessage = ({ item }: { item: any }) => {
    // Suporta tanto o formato local (isFromMe, timestamp) quanto o formato do servidor (senderId, createdAt)
    // Usa serverId (ID numérico do banco) para comparar corretamente com senderId do servidor
    const myId = user?.serverId ?? user?.id;
    const isFromMe = item.isFromMe !== undefined
      ? item.isFromMe
      : String(item.senderId) === String(myId);
    const isSystem = item.senderId === "system" || item.senderId === 0;
    const msgTime = item.timestamp || item.createdAt;
    const msgContent = item.content;
    return (
      <View style={[styles.messageRow, isFromMe && styles.messageRowRight]}>
        {!isFromMe && (
          <View style={styles.avatarSmall}>
            {technician?.avatar ? (
              <Image source={{ uri: technician.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <MaterialIcons name="support-agent" size={16} color="#1A3A5C" />
            )}
          </View>
        )}
        <View style={[
          styles.bubble,
          {
            backgroundColor: isFromMe ? "#1A3A5C" : isSystem ? "#F5A62320" : colors.surface,
            borderWidth: isSystem ? 1 : 0,
            borderColor: isSystem ? "#F5A623" : "transparent",
          },
        ]}>
          {isSystem && (
            <Text style={{ fontSize: 11, color: "#F5A623", fontWeight: "700", marginBottom: 2 }}>Sistema</Text>
          )}
          <Text style={[styles.bubbleText, { color: isFromMe ? "#fff" : colors.foreground }]}>
            {msgContent}
          </Text>
          <Text style={[styles.bubbleTime, { color: isFromMe ? "rgba(255,255,255,0.6)" : colors.muted }]}>
            {formatTime(typeof msgTime === "string" ? msgTime : new Date(msgTime).toISOString())}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {request.category?.toUpperCase() || "Chamado"}
          </Text>
          <Text style={styles.headerSub}>{formatDate(request.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "30", borderColor: statusColor }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {statusConfig?.label || request.status}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["status", "chat"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: "#1A3A5C", borderBottomWidth: 2 }]}
          >
            <MaterialIcons
              name={tab === "status" ? "timeline" : "chat"}
              size={18}
              color={activeTab === tab ? "#1A3A5C" : colors.muted}
            />
            <Text style={[styles.tabText, { color: activeTab === tab ? "#1A3A5C" : colors.muted }]}>
              {tab === "status" ? "Acompanhar" : `Chat${serverMessages.length > 0 ? ` (${serverMessages.length})` : ""}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Conteúdo da aba Status */}
      {activeTab === "status" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Info do chamado */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Detalhes do Chamado</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.muted }]}>{request.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="description" size={16} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.muted }]}>{request.description}</Text>
            </View>
            {request.urgency === "urgente" && (
              <View style={[styles.urgentBadge]}>
                <MaterialIcons name="priority-high" size={14} color="#EF4444" />
                <Text style={styles.urgentText}>URGENTE</Text>
              </View>
            )}
          </View>

          {/* Técnico (se atribuído) */}
          {technician && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Técnico Responsável</Text>
              <View style={styles.techRow}>
                {technician.avatar ? (
                  <Image source={{ uri: technician.avatar }} style={styles.techAvatar} />
                ) : (
                  <View style={[styles.techAvatar, { backgroundColor: "#1A3A5C20", alignItems: "center", justifyContent: "center" }]}>
                    <MaterialIcons name="engineering" size={24} color="#1A3A5C" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.techName, { color: colors.foreground }]}>{technician.companyName || technician.name}</Text>
                  <Text style={[styles.techSub, { color: colors.muted }]}>{technician.city}, {technician.state}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MaterialIcons name="star" size={14} color="#F5A623" />
                    <Text style={[styles.techSub, { color: colors.muted }]}>{technician.rating} ({technician.totalReviews} avaliações)</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setActiveTab("chat")}
                  style={[styles.chatBtn, { backgroundColor: "#1A3A5C" }]}
                >
                  <View style={{ position: "relative" }}>
                    <MaterialIcons name="chat" size={18} color="#fff" />
                    {unreadCount > 0 && (
                      <View style={styles.chatBadge}>
                        <Text style={styles.chatBadgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {/* Orçamentos (se existirem) */}
          {request.quotes && request.quotes.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Orçamentos Recebidos</Text>
              {request.quotes.map((quote: Quote) => {
                const qTech = technicians.find((t) => t.id === quote.technicianId);
                return (
                  <View key={quote.id} style={[styles.quoteItem, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.quoteTech, { color: colors.foreground }]}>
                        {qTech?.companyName || qTech?.name || "Técnico"}
                      </Text>
                      <Text style={[styles.quotePrice, { color: "#1A3A5C" }]}>
                        R$ {quote.price.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[styles.quoteDesc, { color: colors.muted }]}>{quote.description}</Text>
                    <Text style={[styles.quoteTime, { color: colors.muted }]}>⏱ {quote.estimatedTime}</Text>
                    {quote.status === "pendente" && !isTechMode && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                        <Pressable
                          onPress={() => {
                            Alert.alert("Aceitar orçamento?", `R$ ${quote.price.toFixed(2)} - ${quote.description}`, [
                              { text: "Cancelar", style: "cancel" },
                              { text: "Aceitar", onPress: () => acceptQuote(request.id, quote.id) },
                            ]);
                          }}
                          style={[styles.quoteBtn, { backgroundColor: "#10B981" }]}
                        >
                          <Text style={styles.quoteBtnText}>Aceitar</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => router.push({ pathname: "/quotes/[id]", params: { id: request.id } } as any)}
                          style={[styles.quoteBtn, { backgroundColor: colors.border }]}
                        >
                          <Text style={[styles.quoteBtnText, { color: colors.foreground }]}>Ver Detalhes</Text>
                        </Pressable>
                      </View>
                    )}
                    {quote.status !== "pendente" && (
                      <View style={[styles.quoteStatusBadge, {
                        backgroundColor: quote.status === "aceito" ? "#10B98120" : "#EF444420"
                      }]}>
                        <Text style={{ color: quote.status === "aceito" ? "#10B981" : "#EF4444", fontSize: 12, fontWeight: "700" }}>
                          {quote.status === "aceito" ? "✓ Aceito" : "✗ Recusado"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Timeline de status */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Progresso do Chamado</Text>
            {request.status === "cancelado" ? (
              <View style={styles.canceledRow}>
                <MaterialIcons name="cancel" size={24} color="#EF4444" />
                <Text style={{ color: "#EF4444", fontWeight: "700", fontSize: 15 }}>Chamado Cancelado</Text>
              </View>
            ) : (
              STATUS_STEPS.map((step, index) => {
                const stepIndex = STATUS_ORDER.indexOf(step.status);
                const isDone = stepIndex < currentStatusIndex;
                const isCurrent = stepIndex === currentStatusIndex;
                const isPending = stepIndex > currentStatusIndex;
                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        {
                          backgroundColor: isDone ? "#10B981" : isCurrent ? statusColor : colors.border,
                          borderColor: isDone ? "#10B981" : isCurrent ? statusColor : colors.border,
                        }
                      ]}>
                        {isDone ? (
                          <MaterialIcons name="check" size={12} color="#fff" />
                        ) : (
                          <MaterialIcons name={step.icon as any} size={12} color={isCurrent ? "#fff" : colors.muted} />
                        )}
                      </View>
                      {index < STATUS_STEPS.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: isDone ? "#10B981" : colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[
                        styles.timelineLabel,
                        { color: isPending ? colors.muted : colors.foreground, fontWeight: isCurrent ? "700" : "500" }
                      ]}>
                        {step.label}
                        {isCurrent && " ←"}
                      </Text>
                      {(isDone || isCurrent) && (
                        <Text style={[styles.timelineDesc, { color: colors.muted }]}>{step.description}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Ações */}
          {canTechAct && (
            <Pressable
              onPress={handleTechnicianAction}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#1A3A5C", opacity: pressed ? 0.85 : 1 }]}
            >
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>
                {request.status === "solicitado" && "Analisar Chamado"}
                {request.status === "em_analise" && "Enviar Orçamento"}
                {request.status === "servico_aprovado" && "Confirmar Deslocamento"}
                {request.status === "tecnico_a_caminho" && "Iniciar Serviço"}
                {request.status === "em_andamento" && "Marcar como Concluído"}
              </Text>
            </Pressable>
          )}
          {canClientConfirm && (
            <Pressable
              onPress={handleClientAction}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#10B981", opacity: pressed ? 0.85 : 1 }]}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Confirmar Conclusão do Serviço</Text>
            </Pressable>
          )}
          {canReview && (
            <Pressable
              onPress={() => router.push({ pathname: "/review/[id]", params: { id: request.id } } as any)}
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#F5A623", opacity: pressed ? 0.85 : 1 }]}
            >
              <MaterialIcons name="star" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Avaliar o Técnico</Text>
            </Pressable>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Conteúdo da aba Chat */}
      {activeTab === "chat" && (
        <>
          <FlatList
            ref={flatListRef}
            data={serverMessages as any[]}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MaterialIcons name="chat-bubble-outline" size={48} color={colors.muted} />
                <Text style={[styles.emptyChatText, { color: colors.muted }]}>
                  Nenhuma mensagem ainda
                </Text>
                <Text style={[styles.emptyChatSub, { color: colors.muted }]}>
                  Use o chat para combinar detalhes com o{isTechMode ? " cliente" : " técnico"}
                </Text>
              </View>
            }
          />
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Digite uma mensagem..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: inputText.trim() ? "#1A3A5C" : colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <MaterialIcons name="send" size={20} color={inputText.trim() ? "#fff" : colors.muted} />
            </Pressable>
          </View>
        </>
      )}

      {/* Modal de Envio de Orçamento */}
      {showQuoteModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Enviar Orçamento</Text>
            <Text style={[styles.modalSub, { color: colors.muted }]}>Preencha os dados do seu orçamento para este chamado</Text>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Valor (R$) *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 250,00"
              placeholderTextColor={colors.muted}
              value={quotePrice}
              onChangeText={setQuotePrice}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Descrição do Serviço *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Descreva o que será feito..."
              placeholderTextColor={colors.muted}
              value={quoteDesc}
              onChangeText={setQuoteDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Prazo Estimado *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: 2 horas, 1 dia"
              placeholderTextColor={colors.muted}
              value={quoteTime}
              onChangeText={setQuoteTime}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowQuoteModal(false)}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitQuote}
                style={[styles.modalBtn, { backgroundColor: "#1A3A5C" }]}
              >
                <Text style={styles.modalBtnText}>Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  card: {
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EF444420",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  urgentText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  techRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  techAvatar: { width: 48, height: 48, borderRadius: 24 },
  techName: { fontSize: 15, fontWeight: "700" },
  techSub: { fontSize: 12, marginTop: 1 },
  chatBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quoteItem: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    gap: 4,
  },
  quoteTech: { fontSize: 14, fontWeight: "700" },
  quotePrice: { fontSize: 18, fontWeight: "700" },
  quoteDesc: { fontSize: 13, lineHeight: 18 },
  quoteTime: { fontSize: 12 },
  quoteBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  quoteBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  quoteStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  canceledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    minHeight: 44,
  },
  timelineLeft: {
    alignItems: "center",
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    minHeight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
    paddingTop: 2,
  },
  timelineLabel: { fontSize: 14 },
  timelineDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  messageRowRight: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, alignSelf: "flex-end" },
  messagesList: {
    padding: 16,
    gap: 4,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  emptyChatText: { fontSize: 16, fontWeight: "600" },
  emptyChatSub: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 21,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 999,
  },
  modalBox: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalSub: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldInputMulti: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  chatBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700" as const,
  },
});
