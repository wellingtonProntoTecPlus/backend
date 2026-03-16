import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";

const AVAILABILITY_COLORS: Record<string, string> = {
  disponivel: "#22C55E",
  agenda_cheia: "#F59E0B",
  indisponivel: "#9BA1A6",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  disponivel: "Disponível agora",
  agenda_cheia: "Agenda cheia",
  indisponivel: "Indisponível",
};

export default function MapScreen() {
  const colors = useColors();
  const { technicians } = useAppContext();
  const [filterAvailable, setFilterAvailable] = useState(false);

  const filteredTechs = filterAvailable
    ? technicians.filter((t) => t.availability === "disponivel")
    : technicians;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Técnicos Próximos</Text>
        <TouchableOpacity
          onPress={() => setFilterAvailable(!filterAvailable)}
          activeOpacity={0.8}
          style={[styles.filterBtn, { backgroundColor: filterAvailable ? "#F59E0B" : "rgba(255,255,255,0.2)" }]}
        >
          <MaterialIcons name="filter-list" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Aviso web */}
      <View style={[styles.webBanner, { backgroundColor: "#EEF4FF", borderBottomColor: "#1A3A6B30" }]}>
        <MaterialIcons name="info-outline" size={16} color="#1A3A6B" />
        <Text style={[styles.webBannerText, { color: "#1A3A6B" }]}>
          O mapa interativo está disponível apenas no app mobile (iOS/Android).
        </Text>
      </View>

      {/* Lista de técnicos */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {filteredTechs.length} técnico{filteredTechs.length !== 1 ? "s" : ""} na região
        </Text>
        {filteredTechs.map((tech) => {
          const dotColor = AVAILABILITY_COLORS[tech.availability] ?? "#9BA1A6";
          const initials = tech.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
          return (
            <TouchableOpacity
              key={tech.id}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/technician/[id]", params: { id: tech.id } } as any)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: "#1A3A5C" }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>{tech.name}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={[styles.statusText, { color: dotColor }]}>
                    {AVAILABILITY_LABELS[tech.availability]}
                  </Text>
                </View>
                <Text style={[styles.specialties, { color: colors.muted }]} numberOfLines={1}>
                  {tech.specialties.slice(0, 3).join(" • ")}
                </Text>
              </View>
              <View style={styles.ratingBox}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={[styles.ratingText, { color: colors.foreground }]}>{tech.rating}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {filteredTechs.length === 0 && (
          <View style={styles.empty}>
            <MaterialIcons name="location-off" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {filterAvailable ? "Nenhum técnico disponível agora" : "Nenhum técnico cadastrado"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#fff" },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  webBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  webBannerText: { flex: 1, fontSize: 12, fontWeight: "500" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  name: { fontSize: 15, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "500" },
  specialties: { fontSize: 12, marginTop: 2 },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
