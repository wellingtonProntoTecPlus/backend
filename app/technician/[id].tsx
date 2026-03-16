import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { StarRating } from "@/components/segtec/StarRating";
import { VerificationBadge } from "@/components/segtec/VerificationBadge";
import { DestaqueBanner, DestaqueCriteriaCard } from "@/components/segtec/DestaqueBadge";
import { isTechnicianDestaque } from "@/lib/types";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";

const { width } = Dimensions.get("window");

export default function TechnicianProfileScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { technicians } = useAppContext();
  const technician = technicians.find((t) => t.id === id);

  if (!technician) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Técnico não encontrado</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: "#1A3A5C" }}>Voltar</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const specialtyCategories = SERVICE_CATEGORIES.filter((c) =>
    technician.specialties.includes(c.id as any)
  );
  const isDestaque = isTechnicianDestaque(technician);

  const handleCall = () => {
    const phone = technician.phone.replace(/\D/g, "");
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Erro", "Não foi possível realizar a ligação.")
    );
  };

  const handleWhatsApp = () => {
    const phone = (technician.whatsapp || technician.phone).replace(/\D/g, "");
    Linking.openURL(`https://wa.me/55${phone}`).catch(() =>
      Alert.alert("Erro", "Não foi possível abrir o WhatsApp.")
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header com foto de capa */}
        <View style={[styles.coverContainer, { backgroundColor: "#1A3A5C" }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: "rgba(0,0,0,0.3)" }]}
          >
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
          </Pressable>

          {isDestaque && (
            <View style={[styles.destaqueBanner, { backgroundColor: "#F59E0B" }]}>
              <MaterialIcons name="emoji-events" size={14} color="#fff" />
              <Text style={styles.destaqueBannerText}>Tecnico Destaque ProntoTEC+</Text>
            </View>
          )}

          <View style={styles.profileHeader}>
            <Image source={{ uri: technician.avatar }} style={styles.profileAvatar} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {technician.companyName || technician.name}
              </Text>
              {technician.companyName && (
                <Text style={styles.profileSubname}>{technician.name}</Text>
              )}
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={13} color="#F5A623" />
                <Text style={styles.profileLocation}>
                  {technician.city}, {technician.state}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#1A3A5C" }]}>{Number(technician.rating || 0).toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Avaliação</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#1A3A5C" }]}>{technician.totalServices}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Serviços</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#1A3A5C" }]}>{technician.yearsExperience}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Anos Exp.</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#1A3A5C" }]}>{technician.totalReviews}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Avaliações</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Banner Tecnico Destaque */}
          {isDestaque && <DestaqueBanner />}

          {/* Badge de Verificação */}
          <VerificationBadge badge={technician.badge} />

          {/* Avaliação */}
          <StarRating rating={technician.rating} totalReviews={technician.totalReviews} />

          {/* Criterios de Destaque */}
          {isDestaque && (
            <View style={styles.section}>
              <DestaqueCriteriaCard />
            </View>
          )}

          {/* Sobre */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sobre</Text>
            <Text style={[styles.description, { color: colors.muted }]}>{technician.description}</Text>
          </View>

          {/* Especialidades */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Especialidades</Text>
            <View style={styles.specialtiesGrid}>
              {specialtyCategories.map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.specialtyChip, { backgroundColor: cat.color + "15", borderColor: cat.color }]}
                >
                  <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                  <Text style={[styles.specialtyText, { color: cat.color }]}>{cat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Fotos de Trabalhos */}
          {technician.workPhotos.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trabalhos Realizados</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
                {technician.workPhotos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.workPhoto} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Avaliações */}
          {technician.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Avaliações ({technician.totalReviews})
              </Text>
              {technician.reviews.map((review) => (
                <View
                  key={review.id}
                  style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <MaterialIcons name="person" size={18} color={colors.muted} />
                    </View>
                    <View style={styles.reviewInfo}>
                      <Text style={[styles.reviewName, { color: colors.foreground }]}>
                        {review.clientName}
                      </Text>
                      <Text style={[styles.reviewDate, { color: colors.muted }]}>
                        {review.date || review.createdAt ? new Date(review.date ?? review.createdAt ?? "").toLocaleDateString("pt-BR") : ""}
                      </Text>
                    </View>
                    <StarRating rating={review.rating} small />
                  </View>
                  <Text style={[styles.reviewComment, { color: colors.muted }]}>{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Botões de Ação */}
      <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleCall}
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: "#10B981", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="phone" size={22} color="#10B981" />
        </Pressable>
        <Pressable
          onPress={handleWhatsApp}
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: "#25D366", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="chat" size={22} color="#25D366" />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: "/request/new", params: { technicianId: technician.id } } as any)}
          style={({ pressed }) => [
            styles.requestButton,
            { backgroundColor: "#1A3A5C", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <MaterialIcons name="build" size={20} color="#fff" />
          <Text style={styles.requestButtonText}>Solicitar Serviço</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 17,
  },
  coverContainer: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 16,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  destaqueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  destaqueBannerText: {
    color: "#1A3A5C",
    fontSize: 12,
    fontWeight: "700",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#F5A623",
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  profileSubname: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  profileLocation: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 32,
    alignSelf: "center",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  specialtiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialtyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  photosRow: {
    gap: 10,
  },
  workPhoto: {
    width: 160,
    height: 120,
    borderRadius: 10,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "700",
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 2,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  requestButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  requestButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
