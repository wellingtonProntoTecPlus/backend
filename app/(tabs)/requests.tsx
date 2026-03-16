import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ServiceRequestCard } from "@/components/segtec/ServiceRequestCard";
import { ServiceAuthorizationModal, type ServiceAuthorizationResult } from "@/components/segtec/ServiceAuthorizationModal";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import type { ServiceRequest } from "@/lib/types";

type FilterTab = "todos" | "ativos" | "historico";

// Converte o registro do banco para o tipo ServiceRequest do app
function adaptDbRequest(r: {
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
}): ServiceRequest {
  return {
    id: String(r.id),
    clientId: String(r.clientId),
    clientName: r.clientName ?? undefined,
    clientPhone: r.clientPhone ?? undefined,
    clientAddress: r.clientAddress ?? undefined,
    technicianId: r.technicianId ? String(r.technicianId) : undefined,
    category: r.category as any,
    description: r.description,
    photoUrl: r.photoUrl ?? undefined,
    location: r.location,
    status: r.status as any,
    urgency: r.urgency as any,
    createdAt: new Date(r.createdAt).toISOString(),
    updatedAt: new Date(r.updatedAt).toISOString(),
  };
}

export default function RequestsScreen() {
  const colors = useColors();
  const { requests: localRequests, isAuthenticated, user } = useAppContext();
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const [authModal, setAuthModal] = useState<{
    visible: boolean;
    serviceId: string;
    technicianId: string;
    technicianName: string;
    serviceType: string;
  }>({
    visible: false,
    serviceId: "",
    technicianId: "",
    technicianName: "",
    serviceType: "",
  });

  const handleAuthorizationComplete = useCallback((result: ServiceAuthorizationResult) => {
    // Salvar resultado da autorização (pode ser enviado ao servidor futuramente)
    console.log("Autorização registrada:", result);
    setAuthModal((prev) => ({ ...prev, visible: false }));
  }, []);

  // Buscar solicitações do servidor (apenas se autenticado)
  const serverRequestsQuery = trpc.requests.myRequests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Combinar dados do servidor com dados locais (fallback)
  const serverRequests: ServiceRequest[] = (serverRequestsQuery.data ?? []).map(adaptDbRequest);
  const allRequests: ServiceRequest[] = serverRequests.length > 0 ? serverRequests : localRequests;

  const filteredRequests = allRequests.filter((r) => {
    if (activeTab === "ativos") return [
      "solicitado", "em_analise", "orcamento_enviado",
      "servico_aprovado", "tecnico_a_caminho", "em_andamento", "aguardando_confirmacao"
    ].includes(r.status);
    if (activeTab === "historico") return [
      "finalizado_cliente", "encerrado", "cancelado"
    ].includes(r.status);
    return true;
  });

  const isLoading = serverRequestsQuery.isLoading;
  const isRefreshing = serverRequestsQuery.isFetching;

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "ativos", label: "Ativos" },
    { id: "historico", label: "Histórico" },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {user.mode === "tecnico" && (
            <TouchableOpacity
              onPress={() => router.push("/technician-panel" as any)}
              style={styles.panelButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="dashboard" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/request/new" as any)}
            style={styles.newButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={20} color="#1A3A5C" />
            <Text style={styles.newButtonText}>Novo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: "#1A3A5C", borderBottomWidth: 2 },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? "#1A3A5C" : colors.muted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A3A5C" />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando pedidos...</Text>
        </View>
      ) : (
        /* Lista */
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceRequestCard
              request={item}
              onPress={() => {
                router.push({ pathname: "/request/[id]", params: { id: item.id } } as any);
              }}
            />
          )}
          contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
          style={{ backgroundColor: colors.background }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => serverRequestsQuery.refetch()}
              colors={["#1A3A5C"]}
              tintColor="#1A3A5C"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="inbox" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Nenhum pedido encontrado
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                Solicite um serviço para começar
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/request/new" as any)}
                style={[styles.emptyButton, { backgroundColor: "#1A3A5C" }]}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Solicitar Serviço</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal de Autorização de Imagem/Depoimento */}
      <ServiceAuthorizationModal
        visible={authModal.visible}
        technicianName={authModal.technicianName}
        serviceType={authModal.serviceType}
        serviceId={authModal.serviceId}
        technicianId={authModal.technicianId}
        clientId={user?.id ?? ""}
        onComplete={handleAuthorizationComplete}
        onDismiss={() => setAuthModal((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  panelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5A623",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newButtonText: {
    color: "#1A3A5C",
    fontSize: 13,
    fontWeight: "700",
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
