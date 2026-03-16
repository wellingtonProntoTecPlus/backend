import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Technician } from "@/lib/types";
import { useColors } from "@/hooks/useColors";
import { VerificationBadge } from "./VerificationBadge";
import { StarRating } from "./StarRating";
import { DestaqueBadge } from "./DestaqueBadge";
import { isTechnicianDestaque } from "@/lib/types";

interface TechnicianCardProps {
  technician: Technician;
  onPress: () => void;
  compact?: boolean;
}

const AVAILABILITY_CONFIG = {
  disponivel: { label: "Disponível agora", color: "#22C55E", dot: "#22C55E" },
  agenda_cheia: { label: "Agenda cheia", color: "#F59E0B", dot: "#F59E0B" },
  indisponivel: { label: "Indisponível", color: "#9CA3AF", dot: "#9CA3AF" },
};

const LEVEL_CONFIG = {
  autonomo: { label: "Autônomo", color: "#6B7280", icon: "person" as const },
  empresa_verificada: { label: "Empresa Verificada", color: "#2563EB", icon: "verified" as const },
  parceiro_prontotec: { label: "Parceiro ProntoTEC+", color: "#D97706", icon: "workspace-premium" as const },
};

export function TechnicianCard({ technician, onPress, compact = false }: TechnicianCardProps) {
  const colors = useColors();
  const avail = AVAILABILITY_CONFIG[technician.availability] ?? AVAILABILITY_CONFIG.disponivel;
  const level = LEVEL_CONFIG[technician.level] ?? LEVEL_CONFIG.autonomo;
  const isDestaque = isTechnicianDestaque(technician);

  // ─── CARD COMPACTO (scroll horizontal na Home) ────────────────────────────
  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDestaque ? "#F59E0B" : colors.border,
            borderWidth: isDestaque ? 1.5 : 1,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {/* Avatar + indicadores */}
        <View style={styles.compactAvatarWrap}>
          <Image source={{ uri: technician.photoUri || technician.avatar }} style={styles.compactAvatar} />
          <View style={[styles.availDot, { backgroundColor: avail.dot }]} />
          {isDestaque && (
            <View style={styles.trophyBadge}>
              <MaterialIcons name="emoji-events" size={11} color="#92400E" />
            </View>
          )}
        </View>

        {/* Informações — largura limitada pelo card */}
        <View style={styles.compactInfo}>
          {/* Nome: 2 linhas máximo, ellipsis */}
          <Text
            style={[styles.compactName, { color: colors.foreground }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {technician.companyName || technician.name}
          </Text>

          {/* Avaliação */}
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={11} color="#F5A623" />
            <Text style={[styles.ratingText, { color: colors.muted }]}>
              {Number(technician.rating || 0).toFixed(1)} ({technician.totalReviews || 0})
            </Text>
          </View>

          {/* Badge de status */}
          {isDestaque ? (
            <DestaqueBadge size="small" />
          ) : (
            <View style={[styles.availBadge, { backgroundColor: avail.color + "20" }]}>
              <Text style={[styles.availBadgeText, { color: avail.color }]} numberOfLines={1}>
                {avail.label}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // ─── CARD NORMAL (lista vertical na Busca) ────────────────────────────────
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDestaque ? "#F59E0B" : colors.border,
          borderWidth: isDestaque ? 1.5 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Faixa de destaque no topo */}
      {isDestaque && (
        <View style={styles.destaqueStrip}>
          <MaterialIcons name="emoji-events" size={13} color="#fff" />
          <Text style={styles.destaqueStripText}>Técnico Destaque ProntoTEC+</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Avatar + Logo da empresa */}
        <View style={styles.avatarWrap}>
          <Image source={{ uri: technician.photoUri || technician.avatar }} style={styles.avatar} />
          <View style={[styles.availDotLarge, { backgroundColor: avail.dot }]} />

        </View>

        {/* Informações — flex:1 garante que não ultrapasse o card */}
        <View style={styles.info}>
          {/* Nome + badge de verificação */}
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {technician.companyName || technician.name}
            </Text>
            <VerificationBadge badge={technician.badge} small />
          </View>

          {/* Nível */}
          <View style={styles.levelRow}>
            <MaterialIcons name={level.icon} size={11} color={level.color} />
            <Text style={[styles.levelText, { color: level.color }]} numberOfLines={1}>
              {level.label}
            </Text>
          </View>

          {/* Cidade */}
          <Text style={[styles.city, { color: colors.muted }]} numberOfLines={1}>
            {technician.city}, {technician.state}
          </Text>

          {/* Estrelas */}
          <StarRating rating={technician.rating} totalReviews={technician.totalReviews} small />

          {/* Rodapé: serviços + distância + disponibilidade */}
          <View style={styles.bottomRow}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialIcons name="work" size={11} color={colors.muted} />
                <Text style={[styles.statText, { color: colors.muted }]}>
                  {technician.totalServices} serv.
                </Text>
              </View>
              {technician.distance !== undefined && (
                <View style={styles.stat}>
                  <MaterialIcons name="place" size={11} color={colors.muted} />
                  <Text style={[styles.statText, { color: colors.muted }]}>
                    {Number(technician.distance || 0).toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.availPill, { backgroundColor: avail.color + "18" }]}>
              <View style={[styles.availPillDot, { backgroundColor: avail.dot }]} />
              <Text style={[styles.availPillText, { color: avail.color }]} numberOfLines={1}>
                {avail.label}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ── Card Normal ──────────────────────────────────────────────────────────
  card: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  destaqueStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 5,
    backgroundColor: "#F59E0B",
  },
  destaqueStripText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    alignItems: "flex-start",
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  availDotLarge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
  },

  info: {
    flex: 1,
    minWidth: 0, // essencial para o texto respeitar o flex
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    lineHeight: 19,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
  },
  city: {
    fontSize: 12,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    flexShrink: 1,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 11,
  },
  availPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  availPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availPillText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // ── Card Compacto ─────────────────────────────────────────────────────────
  compactCard: {
    width: 130,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 6,
    marginRight: 10,
  },
  compactAvatarWrap: {
    position: "relative",
  },
  compactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  availDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  trophyBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  compactInfo: {
    alignItems: "center",
    gap: 3,
    width: "100%", // ocupa toda a largura do card
  },
  compactName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
    width: "100%", // garante que o texto não ultrapasse o card
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
  },
  availBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: "100%",
  },
  availBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
});
