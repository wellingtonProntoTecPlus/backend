import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ServiceRequest, RequestStatus } from "@/lib/types";
import { useColors } from "@/hooks/useColors";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { trpc } from "@/lib/trpc";

interface ServiceRequestCardProps {
  request: ServiceRequest;
  onPress: () => void;
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: string }> = {
  solicitado: { label: "Solicitado", color: "#F5A623", icon: "schedule" },
  em_analise: { label: "Em análise", color: "#8B5CF6", icon: "search" },
  orcamento_enviado: { label: "Orçamento enviado", color: "#3B82F6", icon: "request-quote" },
  servico_aprovado: { label: "Serviço aprovado", color: "#0891B2", icon: "thumb-up" },
  tecnico_a_caminho: { label: "Técnico a caminho", color: "#F97316", icon: "directions-car" },
  em_andamento: { label: "Em andamento", color: "#3B82F6", icon: "engineering" },
  aguardando_confirmacao: { label: "Aguardando confirmação", color: "#D97706", icon: "pending" },
  finalizado_cliente: { label: "Finalizado", color: "#10B981", icon: "check-circle" },
  encerrado: { label: "Encerrado", color: "#6B7280", icon: "done-all" },
  cancelado: { label: "Cancelado", color: "#EF4444", icon: "cancel" },
};

// Badge de mensagens não lidas para o card do chamado
function UnreadChatBadge({ requestId }: { requestId: string | number }) {
  const numericId = typeof requestId === "string" ? parseInt(requestId.replace(/^server_/, ""), 10) : requestId;
  const { data: unreadCount = 0 } = trpc.chat.unreadCount.useQuery(
    { requestId: numericId },
    {
      enabled: numericId > 0,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    }
  );
  if (unreadCount <= 0) return null;
  return (
    <View style={styles.chatBadgeRow}>
      <MaterialIcons name="chat" size={13} color="#EF4444" />
      <Text style={styles.chatBadgeText}>
        {unreadCount} nova{unreadCount > 1 ? "s" : ""} mensagem{unreadCount > 1 ? "s" : ""}
      </Text>
    </View>
  );
}

export function ServiceRequestCard({ request, onPress }: ServiceRequestCardProps) {
  const colors = useColors();
  const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.solicitado;
  const category = SERVICE_CATEGORIES.find((c) => c.id === request.category);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.categoryIcon, { backgroundColor: (category?.color || "#6B7280") + "20" }]}>
          <MaterialIcons
            name={(category?.icon || "build") as any}
            size={18}
            color={category?.color || "#6B7280"}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
            {category?.label || request.category}
          </Text>
          <Text style={[styles.date, { color: colors.muted }]}>
            {formatDate(request.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
          <MaterialIcons name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
        {request.description}
      </Text>
      {/* Badge de mensagens não lidas — visível para cliente e técnico */}
      <UnreadChatBadge requestId={request.id} />
      {request.technician && (
        <View style={[styles.technicianRow, { borderTopColor: colors.border }]}>
          <MaterialIcons name="person" size={14} color={colors.muted} />
          <Text style={[styles.technicianName, { color: colors.muted }]}>
            {request.technician.companyName || request.technician.name}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  date: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  chatBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  technicianRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  technicianName: {
    fontSize: 12,
  },
});
