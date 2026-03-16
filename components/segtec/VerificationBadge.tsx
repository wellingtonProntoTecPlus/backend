import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { VerificationBadge as BadgeType } from "@/lib/types";

interface VerificationBadgeProps {
  badge: BadgeType;
  small?: boolean;
}

const BADGE_CONFIG = {
  verificado: {
    label: "Empresa Verificada",
    shortLabel: "Verificada",
    color: "#2563EB",
    icon: "verified" as const,
    level: "Nível 2",
  },
  autonomo: {
    label: "Profissional Autônomo",
    shortLabel: "Autônomo",
    color: "#6B7280",
    icon: "person" as const,
    level: "Nível 1",
  },
  certificada: {
    label: "Parceiro ProntoTEC+",
    shortLabel: "Parceiro",
    color: "#D97706",
    icon: "workspace-premium" as const,
    level: "Nível 3",
  },
};

export function VerificationBadge({ badge, small = false }: VerificationBadgeProps) {
  const config = BADGE_CONFIG[badge];

  if (small) {
    return (
      <View style={[styles.smallBadge, { backgroundColor: config.color + "20", borderColor: config.color }]}>
        <MaterialIcons name={config.icon} size={10} color={config.color} />
        <Text style={[styles.smallText, { color: config.color }]}>{config.shortLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: config.color + "15", borderColor: config.color }]}>
      <MaterialIcons name={config.icon} size={14} color={config.color} />
      <View>
        <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.levelText, { color: config.color }]}>{config.level} · Verificado pelo ProntoTEC+</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
  },
  levelText: {
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.8,
    marginTop: 1,
  },
  smallBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
