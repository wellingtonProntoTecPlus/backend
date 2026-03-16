import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
} from "react-native";
import { useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TechnicianCard } from "@/components/segtec/TechnicianCard";
import { ServiceCategoryButton } from "@/components/segtec/ServiceCategoryButton";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { ServiceCategory, isTechnicianDestaque } from "@/lib/types";
import { DestaqueBadge } from "@/components/segtec/DestaqueBadge";
import { notifyTechnicianNewUrgentService } from "@/lib/notifications";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";

export default function HomeScreen() {
  const colors = useColors();
  const { technicians, user, profilePhoto, updateTechnicianProfile } = useAppContext();

  // Busca técnicos do servidor e mescla com os locais
  const { data: serverTechnicians } = trpc.technicians.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  // Mescla técnicos do servidor com os locais ao receber dados
  useEffect(() => {
    if (!serverTechnicians) return;
    serverTechnicians.forEach((t) => {
      updateTechnicianProfile({
        id: `server_${t.id}`,
        name: t.name,
        companyName: t.companyName || t.name,
        document: t.document || "",
        city: t.city,
        state: t.state,
        address: {
          street: t.addressStreet || "",
          number: t.addressNumber || "",
          neighborhood: t.addressNeighborhood || "",
          city: t.city,
          state: t.state,
          zipCode: t.addressZipCode || "",
        },
        type: (t.type as "empresa" | "autonomo") || "autonomo",
        badge: "autonomo" as const,
        level: "autonomo" as const,
        avatar: t.photoUri || "",
        totalServices: 0,
        yearsExperience: 0,
        workPhotos: [],
        specialties: (t.specialties as any[]) || [],
        phone: t.phone,
        whatsapp: t.whatsapp || t.phone,
        description: t.description || "",
        photoUri: t.photoUri || undefined,
        rating: t.rating || 5.0,
        totalReviews: 0,
        reviews: [],
        planType: "gratuito" as const,
        availability: "disponivel" as const,
      } as any);
    });
  }, [serverTechnicians]);
  const [urgentModalVisible, setUrgentModalVisible] = useState(false);
  const [urgentSent, setUrgentSent] = useState(false);

  const isTecnico = user.mode === "tecnico";
  const featuredTechnicians = technicians.filter((t) => t.planType === "destaque" || t.planType === "basico");
  const availableTechnicians = technicians.filter((t) => t.availability === "disponivel");
  const destaqueTechnicians = technicians.filter((t) => isTechnicianDestaque(t));

  const handleCategoryPress = (categoryId: ServiceCategory) => {
    router.push({ pathname: "/(tabs)/search", params: { category: categoryId } });
  };

  const handleTechnicianPress = (id: string) => {
    router.push({ pathname: "/technician/[id]" as any, params: { id } });
  };

  const handleUrgentCall = () => {
    setUrgentModalVisible(true);
    setUrgentSent(false);
  };

const createRequest = trpc.requests.create.useMutation();

  const confirmUrgentCall = async () => {
  try {
    setUrgentSent(true);

    await createRequest.mutateAsync({
      category: "Emergência de Segurança",
      description: "Chamado urgente solicitado pelo cliente",
      location: user.city || "Uberlândia",
      urgency: "urgente",
      clientName: user.name || "Cliente",
      clientPhone: user.phone || "",
    });

    setTimeout(() => {
      setUrgentModalVisible(false);
      setUrgentSent(false);
      router.push("/(tabs)/requests");
    }, 1500);

  } catch (err) {
    console.error("Erro ao criar chamado:", err);
  }
};
  return (
    <ScreenContainer containerClassName="bg-primary">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Olá, {user.name.split(" ")[0]}!</Text>
            <View style={styles.locationRow}>
              <MaterialIcons name="place" size={14} color="#F5A623" />
              <Text style={styles.location}>{user.city || "Uberlândia, MG"}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => router.push("/notifications" as any)}
              style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialIcons name="notifications-none" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/profile" as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialIcons name="person" size={22} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)" }]}
        >
          <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.7)" />
          <Text style={styles.searchPlaceholder}>Buscar técnico ou serviço...</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BOTÃO URGENTE + EMERGÊNCIA - apenas para clientes */}
        {!isTecnico && (
          <>
        <Pressable
          onPress={handleUrgentCall}
          style={({ pressed }) => [
            styles.urgentButton,
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <View style={styles.urgentLeft}>
            <View style={styles.urgentPulse}>
              <MaterialIcons name="flash-on" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.urgentTitle}>CHAMAR TÉCNICO AGORA</Text>
              <Text style={styles.urgentSubtitle}>
                {availableTechnicians.length} técnico{availableTechnicians.length !== 1 ? "s" : ""} disponível{availableTechnicians.length !== 1 ? "is" : ""} próximo de você
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#fff" />
        </Pressable>

        {/* SEÇÃO DE EMERGÊNCIA */}
        <View style={[styles.emergencySection, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIconWrap}>
              <MaterialIcons name="warning" size={22} color="#DC2626" />
            </View>
            <View style={styles.emergencyHeaderText}>
              <Text style={styles.emergencyTitle}>🚨 Emergência de Segurança</Text>
              <Text style={styles.emergencySubtitle}>Atendimento prioritário imediato</Text>
            </View>
          </View>
          <View style={styles.emergencyItems}>
            {[
              { icon: "lock", label: "Portão travado", color: "#DC2626" },
              { icon: "notifications-active", label: "Alarme disparando", color: "#D97706" },
              { icon: "videocam-off", label: "Câmera parou", color: "#7C3AED" },
            ].map((item) => (
              <View key={item.label} style={[styles.emergencyItem, { backgroundColor: "#fff" }]}>
                <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                <Text style={styles.emergencyItemText}>{item.label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={handleUrgentCall}
            style={({ pressed }) => [
              styles.emergencyBtn,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <MaterialIcons name="flash-on" size={18} color="#fff" />
            <Text style={styles.emergencyBtnText}>Chamar Técnico Urgente</Text>
          </Pressable>
        </View>
          </>
        )}

        {/* ANÚNCIOS DE FORNECEDOR - apenas para técnicos */}
        {isTecnico && (
          <View style={{ paddingHorizontal: 0, gap: 10, marginBottom: 4 }}>
            {/* Anúncio 1: Kit Portão Eletrônico */}
            <Pressable
              style={({ pressed }) => [{
                backgroundColor: "#1A3A6B",
                borderRadius: 14,
                padding: 16,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                gap: 14,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderLeftWidth: 5,
                borderLeftColor: "#F5A623",
              }]}
              onPress={() => Alert.alert("Oferta Especial", "Kit Portão Eletrônico\n\nMotor deslizante 1/4 HP + 2 controles + suporte\n\nEm breve: contato direto com fornecedor no app!")}
            >
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(245,166,35,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="settings" size={28} color="#F5A623" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <View style={{ backgroundColor: "#F5A623", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#1A3A6B", fontSize: 10, fontWeight: "800" }}>OFERTA FORNECEDOR</Text>
                  </View>
                </View>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", lineHeight: 20 }}>Kit Portão Eletrônico</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>Motor + 2 controles + suporte de instalação</Text>
                <Text style={{ color: "#F5A623", fontSize: 13, fontWeight: "700", marginTop: 4 }}>Ver oferta →</Text>
              </View>
            </Pressable>

            {/* Anúncio 2: Câmera de Segurança */}
            <Pressable
              style={({ pressed }) => [{
                backgroundColor: "#0F2D4A",
                borderRadius: 14,
                padding: 16,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                gap: 14,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                borderLeftWidth: 5,
                borderLeftColor: "#22C55E",
              }]}
              onPress={() => Alert.alert("Oferta Especial", "Kit Câmera de Segurança\n\nCâmera IP Full HD 1080p + DVR 4 canais + HD 1TB\n\nEm breve: contato direto com fornecedor no app!")}
            >
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="videocam" size={28} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <View style={{ backgroundColor: "#22C55E", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>OFERTA FORNECEDOR</Text>
                  </View>
                </View>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", lineHeight: 20 }}>Kit Câmera de Segurança</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>IP Full HD 1080p + DVR 4 canais + HD 1TB</Text>
                <Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "700", marginTop: 4 }}>Ver oferta →</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Banner CTA */}
        <Pressable
          onPress={() => router.push("/request/new" as any)}
          style={({ pressed }) => [
            styles.banner,
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Image
            source={require("@/assets/images/logo_completa.png")}
            style={{ width: 70, height: 70, resizeMode: "contain" }}
          />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Solicitar Serviço</Text>
            <Text style={styles.bannerSubtitle}>Receba propostas em minutos</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={20} color="#1A3A6B" />
        </Pressable>

        {/* Categorias */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Serviços</Text>
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={[styles.seeAll, { color: "#1A3A5C" }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {SERVICE_CATEGORIES.map((cat) => (
              <ServiceCategoryButton
                key={cat.id}
                label={cat.label}
                icon={cat.icon as any}
                color={cat.color}
                onPress={() => handleCategoryPress(cat.id as ServiceCategory)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Estimativas de Preço */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tabela de Preços</Text>
          </View>
          <View style={[styles.priceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.priceHeader}>
              <MaterialIcons name="attach-money" size={18} color="#1A3A5C" />
              <Text style={[styles.priceHeaderText, { color: colors.foreground }]}>Estimativas de referência</Text>
            </View>
            {SERVICE_CATEGORIES.slice(0, 6).map((cat, idx) => (
              <View
                key={cat.id}
                style={[
                  styles.priceRow,
                  idx < 5 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.priceRowLeft}>
                  <View style={[styles.priceDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.priceLabel, { color: colors.foreground }]}>{cat.label}</Text>
                </View>
                <Text style={[styles.priceValue, { color: "#1A3A5C" }]}>
                  R$ {cat.priceRange.min}–{cat.priceRange.max}
                  <Text style={[styles.priceUnit, { color: colors.muted }]}> /{cat.priceRange.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tecnicos Destaque ProntoTEC+ */}
        {destaqueTechnicians.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialIcons name="emoji-events" size={20} color="#92400E" />
                <Text style={[styles.sectionTitle, { color: "#92400E" }]}>Tecnicos Destaque</Text>
              </View>
              <Pressable onPress={() => router.push("/(tabs)/search")}>
                <Text style={[styles.seeAll, { color: "#92400E" }]}>Ver todos</Text>
              </Pressable>
            </View>
            <View style={{ backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: "#F59E0B" }}>
              <Text style={{ fontSize: 12, color: "#92400E", lineHeight: 17 }}>
                Profissionais que conquistaram o selo por avaliacao acima de 4.8, mais de 50 servicos e zero reclamacoes.
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {destaqueTechnicians.map((tech) => (
                <TechnicianCard
                  key={tech.id}
                  technician={tech}
                  onPress={() => handleTechnicianPress(tech.id)}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Técnicos em Destaque */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Técnicos em Destaque</Text>
            <Pressable onPress={() => router.push("/(tabs)/search")}>
              <Text style={[styles.seeAll, { color: "#1A3A5C" }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredTechnicians.map((tech) => (
              <TechnicianCard
                key={tech.id}
                technician={tech}
                onPress={() => handleTechnicianPress(tech.id)}
                compact
              />
            ))}
          </ScrollView>
        </View>

        {/* Todos os Técnicos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximos de Você</Text>
            <Pressable
              onPress={() => router.push("/map" as any)}
              style={({ pressed }) => [{
                flexDirection: "row" as const,
                alignItems: "center" as const,
                gap: 4,
                backgroundColor: "#1A3A5C",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <MaterialIcons name="map" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Ver mapa</Text>
            </Pressable>
          </View>
          {technicians.slice(0, 3).map((tech) => (
            <TechnicianCard
              key={tech.id}
              technician={tech}
              onPress={() => handleTechnicianPress(tech.id)}
            />
          ))}
        </View>

        {/* Painel Clientes Satisfeitos */}
        <Pressable
          onPress={() => router.push("/satisfied-clients" as any)}
          style={({ pressed }) => [
            styles.satisfiedPanel,
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <View style={styles.satisfiedLeft}>
            <View style={styles.satisfiedIconWrap}>
              <MaterialIcons name="thumb-up" size={24} color="#F5A623" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.satisfiedTitle}>Clientes Satisfeitos</Text>
              <Text style={styles.satisfiedSubtitle}>Depoimentos reais · Avaliações · Recomendações</Text>
              <View style={styles.satisfiedStars}>
                {[1,2,3,4,5].map((s) => (
                  <MaterialIcons key={s} name="star" size={14} color="#F5A623" />
                ))}
                <Text style={styles.satisfiedRating}>4.9 · 1.200+ serviços</Text>
              </View>
            </View>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </ScrollView>

      {/* Modal Urgente */}
      <Modal
        visible={urgentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUrgentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            {!urgentSent ? (
              <>
                <View style={styles.modalIconWrap}>
                  <MaterialIcons name="flash-on" size={40} color="#DC2626" />
                </View>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Chamar Técnico Agora</Text>
                <Text style={[styles.modalDesc, { color: colors.muted }]}>
                  Um alerta será enviado para os {availableTechnicians.length} técnicos disponíveis próximos a você. O primeiro a aceitar será notificado.
                </Text>
                <View style={styles.modalStats}>
                  <View style={[styles.modalStatItem, { backgroundColor: colors.surface }]}>
                    <MaterialIcons name="people" size={20} color="#1A3A5C" />
                    <Text style={[styles.modalStatValue, { color: colors.foreground }]}>{availableTechnicians.length}</Text>
                    <Text style={[styles.modalStatLabel, { color: colors.muted }]}>disponíveis</Text>
                  </View>
                  <View style={[styles.modalStatItem, { backgroundColor: colors.surface }]}>
                    <MaterialIcons name="timer" size={20} color="#1A3A5C" />
                    <Text style={[styles.modalStatValue, { color: colors.foreground }]}>~15 min</Text>
                    <Text style={[styles.modalStatLabel, { color: colors.muted }]}>resposta</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.modalConfirmBtn, { opacity: pressed ? 0.9 : 1 }]}
                  onPress={confirmUrgentCall}
                >
                  <MaterialIcons name="flash-on" size={18} color="#fff" />
                  <Text style={styles.modalConfirmText}>Confirmar Chamado Urgente</Text>
                </Pressable>
                <Pressable onPress={() => setUrgentModalVisible(false)} style={styles.modalCancelBtn}>
                  <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.modalSuccess}>
                <MaterialIcons name="check-circle" size={60} color="#22C55E" />
                <Text style={[styles.modalSuccessTitle, { color: colors.foreground }]}>Alerta Enviado!</Text>
                <Text style={[styles.modalSuccessDesc, { color: colors.muted }]}>
                  Notificamos {availableTechnicians.length} técnicos próximos. Você será avisado quando alguém aceitar.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  location: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchPlaceholder: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Botão Urgente
  urgentButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  urgentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  urgentPulse: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  urgentTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  urgentSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  // Banner
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    borderWidth: 1.5,
    borderColor: "#1A3A6B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#1A3A6B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 12,
  },
  bannerContent: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: "#1A3A6B",
    fontSize: 16,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "#1A3A6B",
    fontSize: 12,
    opacity: 0.7,
  },
  bannerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bannerButtonText: {
    color: "#1A3A6B",
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoriesRow: {
    gap: 10,
    paddingRight: 16,
  },
  featuredRow: {
    paddingRight: 16,
  },
  // Tabela de Preços
  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(26,58,92,0.06)",
  },
  priceHeaderText: {
    fontSize: 13,
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  priceRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: "400",
  },
  // Seção de Emergência
  emergencySection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emergencyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyHeaderText: {
    flex: 1,
    gap: 2,
  },
  emergencyTitle: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "800",
  },
  emergencySubtitle: {
    color: "#B91C1C",
    fontSize: 12,
    opacity: 0.8,
  },
  emergencyItems: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  emergencyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  emergencyItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  emergencyBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  emergencyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Modal Urgente
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
  },
  modalIconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  modalStats: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  modalStatItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalStatLabel: {
    fontSize: 12,
  },
  modalConfirmBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  modalCancelBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  modalCancelText: {
    fontSize: 14,
  },
  modalSuccess: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  modalSuccessTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalSuccessDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  satisfiedPanel: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#1A3A5C",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  satisfiedLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  satisfiedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(245,166,35,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  satisfiedTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  satisfiedSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginBottom: 4,
  },
  satisfiedStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  satisfiedRating: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "600",
  },
});
