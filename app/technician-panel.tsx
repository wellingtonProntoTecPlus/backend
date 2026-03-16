import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";

// Botão de chat com badge de mensagens não lidas
function ChatButtonWithBadge({ requestId, clientName, style }: { requestId: number; clientName: string; style?: object }) {
  const { data: unreadCount = 0 } = trpc.chat.unreadCount.useQuery(
    { requestId },
    { refetchInterval: 5000, refetchIntervalInBackground: true }
  );
  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(requestId), clientName } })}
      style={[{ backgroundColor: "#1A3A5C", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6, flex: 1, justifyContent: "center", position: "relative" }, style]}
      activeOpacity={0.85}
    >
      <MaterialIcons name="chat" size={18} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Chat</Text>
      {unreadCount > 0 && (
        <View style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}


const CATEGORY_LABELS: Record<string, string> = {
  cftv: "Câmeras CFTV",
  alarmes: "Alarmes",
  portao: "Portão Eletrônico",
  interfone: "Interfone",
  fechadura: "Fechadura Digital",
  cerca: "Cerca Elétrica",
  wifi: "Redes Wi-Fi",
  acesso: "Controle de Acesso",
  monitoramento: "Monitoramento",
  portaria_remota: "Portaria Remota",
};

const CATEGORY_ICONS: Record<string, string> = {
  cftv: "videocam",
  alarmes: "notifications-active",
  portao: "garage",
  interfone: "phone-in-talk",
  fechadura: "lock",
  cerca: "electric-bolt",
  wifi: "wifi",
  acesso: "badge",
  monitoramento: "monitor",
  portaria_remota: "security",
};

type FilterTab = "pendentes" | "aceitos" | "recusados";

// Tipo do banco de dados para solicitações
type DbRequest = {
  id: number;
  clientId: number;
  clientName: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  technicianId: number | null;
  category: string;
  description: string;
  photoUrl: string | null;
  location: string;
  status: string;
  urgency: string;
  createdAt: Date;
  updatedAt: Date;
};

const ALL_CATEGORIES = "todos";

export default function TechnicianPanelScreen() {
  const colors = useColors();
  const { technicianActive, setTechnicianActive, user } = useAppContext();
  const [activeTab, setActiveTab] = useState<FilterTab>("pendentes");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);

  // Buscar solicitações abertas do banco (para o técnico ver)
  const openRequestsQuery = trpc.requests.openRequests.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Buscar chamados aceitos/em andamento pelo técnico logado (por technicianId)
  const myRequestsQuery = trpc.requests.myTechnicianRequests.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const updateStatusMutation = trpc.requests.updateStatus.useMutation({
    onSuccess: () => {
      openRequestsQuery.refetch();
      myRequestsQuery.refetch();
    },
  });

  const isLoading = openRequestsQuery.isLoading || myRequestsQuery.isLoading;
  const isRefreshing = openRequestsQuery.isFetching || myRequestsQuery.isFetching;

  // Pendentes = solicitações abertas no banco (status "solicitado")
  const pendingRequests: DbRequest[] = (openRequestsQuery.data ?? []) as DbRequest[];

  // Aceitos = minhas solicitações com status em andamento ou concluídas
  const acceptedRequests: DbRequest[] = ((myRequestsQuery.data ?? []) as DbRequest[]).filter((r) =>
    ["em_analise", "orcamento_enviado", "servico_aprovado", "tecnico_a_caminho", "em_andamento",
     "aguardando_confirmacao", "finalizado_cliente", "encerrado"].includes(r.status)
  );

  // Recusados = solicitações canceladas pelo técnico
  const declinedRequests: DbRequest[] = ((myRequestsQuery.data ?? []) as DbRequest[]).filter((r) =>
    r.status === "cancelado"
  );

  const getBaseTabRequests = (): DbRequest[] => {
    switch (activeTab) {
      case "pendentes": return pendingRequests;
      case "aceitos": return acceptedRequests;
      case "recusados": return declinedRequests;
    }
  };

  const getTabRequests = (): DbRequest[] => {
    const base = getBaseTabRequests();
    if (categoryFilter === ALL_CATEGORIES) return base;
    return base.filter((r) => r.category === categoryFilter);
  };

  // Categorias presentes na aba atual
  const availableCategories = Array.from(
    new Set(getBaseTabRequests().map((r) => r.category))
  );

  const handleRefresh = () => {
    openRequestsQuery.refetch();
    myRequestsQuery.refetch();
  };

  const handleAccept = (request: DbRequest) => {
    Alert.alert(
      "Aceitar solicitação?",
      "Você confirma que irá atender este serviço?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          onPress: async () => {
            try {
              // Aceitar: status "em_analise" + technicianId para vincular o técnico ao chamado
              // O servidor dispara push remoto para o cliente ao receber status em_analise
              const techId = user.technicianProfile?.id
                ? parseInt(String(user.technicianProfile.id).replace(/^server_/, ""), 10)
                : undefined;
              await updateStatusMutation.mutateAsync({
                id: request.id,
                status: "em_analise",
                technicianId: techId,
                technicianName: user.technicianProfile?.name || user.name || "Técnico",
              });
              Alert.alert("Solicitação aceita!", "O cliente foi notificado. Entre em contato para combinar os detalhes.");
            } catch (e) {
              Alert.alert("Erro", "Não foi possível aceitar a solicitação. Tente novamente.");
            }
          },
        },
      ]
    );
  };

  const handleDecline = (request: DbRequest) => {
    Alert.alert(
      "Recusar solicitação?",
      "Tem certeza que deseja recusar este serviço?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recusar",
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatusMutation.mutateAsync({
                id: request.id,
                status: "cancelado",
                technicianName: user.technicianProfile?.name || user.name || "Técnico",
              });
            } catch (e) {
              Alert.alert("Erro", "Não foi possível recusar a solicitação.");
            }
          },
        },
      ]
    );
  };

  const handleComplete = (request: DbRequest) => {
    Alert.alert(
      "Marcar como concluído?",
      "Confirme que o serviço foi finalizado com sucesso.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Concluir",
          onPress: async () => {
            try {
              await updateStatusMutation.mutateAsync({
                id: request.id,
                status: "aguardando_confirmacao",
              });
            } catch (e) {
              Alert.alert("Erro", "Não foi possível marcar como concluído.");
            }
          },
        },
      ]
    );
  };

  const getTimeAgo = (date: Date | string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  const renderRequest = ({ item }: { item: DbRequest }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header do card */}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: "#1A3A5C15" }]}>
          <MaterialIcons
            name={(CATEGORY_ICONS[item.category] || "build") as any}
            size={22}
            color="#1A3A5C"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.categoryLabel, { color: colors.foreground }]}>
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="place" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
              {item.location}
            </Text>
            <Text style={[styles.metaDot, { color: colors.muted }]}>•</Text>
            <Text style={[styles.metaText, { color: colors.muted }]}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        {item.urgency === "urgente" && (
          <View style={styles.urgentBadge}>
            <MaterialIcons name="flash-on" size={12} color="#fff" />
            <Text style={styles.urgentText}>Urgente</Text>
          </View>
        )}
      </View>

      {/* Cliente */}
      {item.clientName && (
        <View style={styles.clientRow}>
          <MaterialIcons name="person" size={14} color={colors.muted} />
          <Text style={[styles.clientText, { color: colors.muted }]}>{item.clientName}</Text>
        </View>
      )}

      {/* Descrição */}
      <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Ações */}
      {activeTab === "pendentes" && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleDecline(item)}
            style={[styles.declineButton, { borderColor: "#EF4444" }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={18} color="#EF4444" />
            <Text style={[styles.declineText, { color: "#EF4444" }]}>Recusar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAccept(item)}
            style={[styles.acceptButton, { backgroundColor: "#1A3A5C" }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.acceptText}>Aceitar</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "aceitos" && (
        <View style={styles.actions}>
          <ChatButtonWithBadge requestId={item.id} clientName={item.clientName || "Cliente"} style={styles.chatButton} />
          <TouchableOpacity
            onPress={() => handleComplete(item)}
            style={[styles.completeButton, { backgroundColor: "#22C55E" }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="done-all" size={18} color="#fff" />
            <Text style={styles.completeText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === "recusados" && (
        <View style={[styles.completedRow, { borderTopColor: colors.border }]}>
          <MaterialIcons name="check-circle" size={16} color="#22C55E" />
          <Text style={[styles.completedLabel, { color: "#22C55E" }]}>Serviço concluído</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel do Técnico</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status Ativo */}
      <View style={[styles.statusBar, { backgroundColor: technicianActive ? "#22C55E15" : colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: technicianActive ? "#22C55E" : "#9BA1A6" }]} />
          <View>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>
              {technicianActive ? "Disponível para Serviço" : "Modo Inativo"}
            </Text>
            <Text style={[styles.statusSub, { color: colors.muted }]}>
              {technicianActive ? "Recebendo novas solicitações" : "Ative para receber solicitações"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (technicianActive) {
              Alert.alert(
                "Desativar disponibilidade?",
                "Você não receberá novas solicitações enquanto estiver inativo.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Desativar", style: "destructive", onPress: () => setTechnicianActive(false) },
                ]
              );
            } else {
              setTechnicianActive(true);
            }
          }}
          style={[styles.toggleBtn, { backgroundColor: technicianActive ? "#22C55E" : colors.border }]}
          activeOpacity={0.8}
        >
          <View style={[styles.toggleKnob, { left: technicianActive ? 22 : 2 }]} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#F59E0B" }]}>{pendingRequests.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Pendentes</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#3B82F6" }]}>{acceptedRequests.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Aceitos</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#EF4444" }]}>{declinedRequests.length}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Recusados</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["pendentes", "aceitos", "recusados"] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => { setActiveTab(tab); setCategoryFilter(ALL_CATEGORIES); }}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: "#1A3A5C", borderBottomWidth: 2 },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? "#1A3A5C" : colors.muted }]}>
              {tab === "pendentes" ? "Pendentes" : tab === "aceitos" ? "Aceitos" : "Recusados"}
            </Text>
            {tab === "pendentes" && pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Chips de filtro por categoria */}
      {availableCategories.length > 1 && (
        <View style={[styles.chipsRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setCategoryFilter(ALL_CATEGORIES)}
            style={[
              styles.chip,
              categoryFilter === ALL_CATEGORIES
                ? { backgroundColor: "#1A3A5C" }
                : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: categoryFilter === ALL_CATEGORIES ? "#fff" : colors.muted }]}>Todos</Text>
          </TouchableOpacity>
          {availableCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[
                styles.chip,
                categoryFilter === cat
                  ? { backgroundColor: "#1A3A5C" }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: categoryFilter === cat ? "#fff" : colors.muted }]}>
                {CATEGORY_LABELS[cat] || cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A3A5C" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando solicitações...</Text>
        </View>
      ) : (
        /* Lista */
        <FlatList
          data={getTabRequests()}
          renderItem={renderRequest}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#1A3A5C"]}
              tintColor="#1A3A5C"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons
                name={activeTab === "pendentes" ? "inbox" : activeTab === "aceitos" ? "build" : "cancel"}
                size={48}
                color={colors.muted}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {activeTab === "pendentes" ? "Nenhuma solicitação pendente" :
                 activeTab === "aceitos" ? "Nenhum serviço aceito" :
                 "Nenhuma solicitação recusada"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                {activeTab === "pendentes" && !technicianActive
                  ? "Ative o modo disponível para receber solicitações"
                  : "As solicitações aparecerão aqui"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 14, fontWeight: "700" },
  statusSub: { fontSize: 12, marginTop: 1 },
  toggleBtn: {
    width: 46,
    height: 26,
    borderRadius: 13,
    position: "relative",
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: { fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, flexShrink: 1 },
  metaDot: { fontSize: 12 },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clientText: { fontSize: 12 },
  description: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  declineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  declineText: { fontSize: 14, fontWeight: "600" },
  acceptButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  chatText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  completedLabel: { fontSize: 13, fontWeight: "600" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  empty: {
    alignItems: "center",
    paddingVertical: 64,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
