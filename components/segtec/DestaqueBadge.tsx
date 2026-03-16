import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface DestaqueBadgeProps {
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

/**
 * Selo "Técnico Destaque" — concedido automaticamente a técnicos que atendem:
 * - Avaliação ≥ 4.8
 * - Mais de 50 serviços realizados
 * - Zero reclamações formais
 */
export function DestaqueBadge({ size = "medium", showLabel = true }: DestaqueBadgeProps) {
  const iconSize = size === "small" ? 12 : size === "large" ? 20 : 14;
  const fontSize = size === "small" ? 10 : size === "large" ? 13 : 11;
  const paddingH = size === "small" ? 6 : size === "large" ? 12 : 8;
  const paddingV = size === "small" ? 3 : size === "large" ? 6 : 4;

  return (
    <View style={[styles.badge, { paddingHorizontal: paddingH, paddingVertical: paddingV }]}>
      <MaterialIcons name="emoji-events" size={iconSize} color="#92400E" />
      {showLabel && (
        <Text style={[styles.label, { fontSize }]}>Técnico Destaque</Text>
      )}
    </View>
  );
}

/**
 * Banner completo de Técnico Destaque para o topo do perfil
 */
export function DestaqueBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={styles.trophyCircle}>
          <MaterialIcons name="emoji-events" size={32} color="#92400E" />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>🏆 Técnico Destaque</Text>
          <Text style={styles.bannerSub}>Reconhecimento ProntoTEC+</Text>
        </View>
      </View>
      <View style={styles.bannerRight}>
        <MaterialIcons name="verified" size={20} color="#92400E" />
      </View>
    </View>
  );
}

/**
 * Card de critérios para exibir no perfil do técnico destaque
 */
export function DestaqueCriteriaCard() {
  return (
    <View style={styles.criteriaCard}>
      <View style={styles.criteriaHeader}>
        <MaterialIcons name="emoji-events" size={18} color="#92400E" />
        <Text style={styles.criteriaTitle}>Critérios para Técnico Destaque</Text>
      </View>
      <View style={styles.criteriaList}>
        <CriteriaItem icon="star" text="Avaliação acima de 4.8" />
        <CriteriaItem icon="build" text="Mais de 50 serviços realizados" />
        <CriteriaItem icon="thumb-up" text="Nenhuma reclamação formal" />
      </View>
      <Text style={styles.criteriaNote}>
        O selo é concedido automaticamente pela plataforma e revisado mensalmente.
      </Text>
    </View>
  );
}

function CriteriaItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.criteriaItem}>
      <View style={styles.criteriaIconWrap}>
        <MaterialIcons name={icon as any} size={14} color="#92400E" />
      </View>
      <Text style={styles.criteriaItemText}>{text}</Text>
    </View>
  );
}

const GOLD_BG = "#FEF3C7";
const GOLD_BORDER = "#F59E0B";
const GOLD_TEXT = "#92400E";

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GOLD_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 20,
  },
  label: {
    color: GOLD_TEXT,
    fontWeight: "700",
  },
  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GOLD_BG,
    borderWidth: 1.5,
    borderColor: GOLD_BORDER,
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GOLD_BORDER,
  },
  bannerText: { gap: 2 },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: GOLD_TEXT,
  },
  bannerSub: {
    fontSize: 12,
    color: "#B45309",
  },
  bannerRight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  // Criteria Card
  criteriaCard: {
    backgroundColor: GOLD_BG,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  criteriaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  criteriaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: GOLD_TEXT,
  },
  criteriaList: {
    gap: 8,
  },
  criteriaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  criteriaIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  criteriaItemText: {
    fontSize: 13,
    color: GOLD_TEXT,
    fontWeight: "500",
  },
  criteriaNote: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 16,
    fontStyle: "italic",
  },
});
