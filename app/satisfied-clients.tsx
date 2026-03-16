import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";

// Depoimentos e avaliações de exemplo (serão substituídos por dados reais do banco)
const TESTIMONIALS = [
  {
    id: "1",
    clientName: "Ana Paula S.",
    avatar: null,
    technicianName: "Carlos Mendes",
    technicianSpecialty: "Elétrica",
    rating: 5,
    comment: "Serviço impecável! O Carlos chegou no horário combinado, resolveu o problema elétrico rapidamente e deixou tudo limpo. Super recomendo!",
    serviceType: "Instalação Elétrica",
    date: "Fevereiro 2026",
    verified: true,
  },
  {
    id: "2",
    clientName: "Roberto Lima",
    avatar: null,
    technicianName: "Marcos Oliveira",
    technicianSpecialty: "Hidráulica",
    rating: 5,
    comment: "Excelente profissional! Resolveu o vazamento que eu tinha há meses em menos de 2 horas. Preço justo e trabalho de qualidade.",
    serviceType: "Conserto de Vazamento",
    date: "Janeiro 2026",
    verified: true,
  },
  {
    id: "3",
    clientName: "Fernanda Costa",
    avatar: null,
    technicianName: "João Pedro A.",
    technicianSpecialty: "Ar-Condicionado",
    rating: 5,
    comment: "Meu ar-condicionado voltou a funcionar perfeitamente. O João foi muito atencioso, explicou tudo que estava fazendo. Nota 10!",
    serviceType: "Manutenção de Ar-Condicionado",
    date: "Janeiro 2026",
    verified: true,
  },
  {
    id: "4",
    clientName: "Marcelo T.",
    avatar: null,
    technicianName: "Ricardo Santos",
    technicianSpecialty: "Câmeras de Segurança",
    rating: 5,
    comment: "Instalação das câmeras feita com perfeição. O Ricardo conhece muito bem o que faz, configurou tudo no celular e ainda ensinou como usar o sistema.",
    serviceType: "Instalação de Câmeras",
    date: "Dezembro 2025",
    verified: true,
  },
  {
    id: "5",
    clientName: "Patrícia Alves",
    avatar: null,
    technicianName: "Diego Ferreira",
    technicianSpecialty: "Informática",
    rating: 4,
    comment: "Meu computador estava muito lento e o Diego resolveu tudo. Formatou, instalou os programas e ainda deu dicas de manutenção. Ótimo serviço!",
    serviceType: "Manutenção de Computador",
    date: "Dezembro 2025",
    verified: true,
  },
  {
    id: "6",
    clientName: "Luiz Henrique M.",
    avatar: null,
    technicianName: "Carlos Mendes",
    technicianSpecialty: "Elétrica",
    rating: 5,
    comment: "Segunda vez que chamo o Carlos. Sempre pontual, educado e faz um trabalho limpo. É o meu técnico de confiança para elétrica!",
    serviceType: "Troca de Disjuntores",
    date: "Novembro 2025",
    verified: true,
  },
];

const STATS = [
  { label: "Serviços Realizados", value: "1.200+", icon: "build" },
  { label: "Clientes Satisfeitos", value: "98%", icon: "thumb-up" },
  { label: "Avaliação Média", value: "4.9", icon: "star" },
  { label: "Técnicos Verificados", value: "85+", icon: "verified" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialIcons
          key={star}
          name={star <= rating ? "star" : "star-border"}
          size={14}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

function TestimonialCard({ item }: { item: typeof TESTIMONIALS[0] }) {
  const colors = useColors();
  return (
    <View style={[styles.testimonialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header do depoimento */}
      <View style={styles.testimonialHeader}>
        <View style={styles.clientAvatar}>
          <Text style={styles.clientAvatarText}>
            {item.clientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.clientName, { color: colors.foreground }]}>{item.clientName}</Text>
            {item.verified && (
              <MaterialIcons name="verified" size={14} color="#2563EB" />
            )}
          </View>
          <Text style={[styles.testimonialDate, { color: colors.muted }]}>{item.date}</Text>
        </View>
        <StarRating rating={item.rating} />
      </View>

      {/* Comentário */}
      <Text style={[styles.testimonialComment, { color: colors.foreground }]}>
        "{item.comment}"
      </Text>

      {/* Técnico e serviço */}
      <View style={[styles.technicianTag, { backgroundColor: "#1A3A5C10", borderColor: "#1A3A5C20" }]}>
        <MaterialIcons name="engineering" size={14} color="#1A3A5C" />
        <Text style={[styles.technicianTagText, { color: "#1A3A5C" }]}>
          {item.technicianName} · {item.serviceType}
        </Text>
      </View>
    </View>
  );
}

export default function SatisfiedClientsScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState<"todos" | "5estrelas" | "recentes">("todos");

  const filteredTestimonials = TESTIMONIALS.filter((t) => {
    if (filter === "5estrelas") return t.rating === 5;
    return true;
  });

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Clientes Satisfeitos</Text>
          <Text style={styles.headerSubtitle}>Depoimentos reais de quem confia no ProntoTEC+</Text>
        </View>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: "#1A3A5C" }]}>
          <View style={styles.statsGrid}>
            {STATS.map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <MaterialIcons name={stat.icon as any} size={22} color="#F5A623" />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          {[
            { key: "todos", label: "Todos" },
            { key: "5estrelas", label: "⭐ 5 Estrelas" },
          ].map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key as any)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: filter === f.key ? "#1A3A5C" : colors.surface,
                  borderColor: filter === f.key ? "#1A3A5C" : colors.border,
                },
              ]}
            >
              <Text style={[
                styles.filterBtnText,
                { color: filter === f.key ? "#fff" : colors.foreground },
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Destaque — Citação principal */}
        <View style={[styles.highlightCard, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
          <MaterialIcons name="format-quote" size={32} color="#F59E0B" />
          <Text style={[styles.highlightText, { color: "#92400E" }]}>
            Mais de 98% dos nossos clientes recomendam o ProntoTEC+ para amigos e familiares.
          </Text>
          <View style={styles.highlightStars}>
            {[1, 2, 3, 4, 5].map((s) => (
              <MaterialIcons key={s} name="star" size={18} color="#F59E0B" />
            ))}
          </View>
        </View>

        {/* Lista de depoimentos */}
        <View style={styles.testimonialsList}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {filteredTestimonials.length} depoimentos
          </Text>
          {filteredTestimonials.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </View>

        {/* CTA */}
        <View style={[styles.ctaCard, { backgroundColor: "#1A3A5C" }]}>
          <MaterialIcons name="star" size={28} color="#F5A623" />
          <Text style={styles.ctaTitle}>Sua experiência importa!</Text>
          <Text style={styles.ctaDesc}>
            Após finalizar um serviço, você pode avaliar o técnico e compartilhar sua experiência com outros clientes.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/requests" as any)}
            style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.ctaButtonText}>Ver Meus Pedidos</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  statItem: {
    width: "47%",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 4,
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center" },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 13, fontWeight: "600" },
  highlightCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  highlightStars: { flexDirection: "row", gap: 4 },
  testimonialsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  testimonialCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  testimonialHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A3A5C",
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  clientName: { fontSize: 14, fontWeight: "700" },
  testimonialDate: { fontSize: 11, marginTop: 1 },
  testimonialComment: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: "italic",
  },
  technicianTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  technicianTagText: { fontSize: 12, fontWeight: "600" },
  ctaCard: {
    margin: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  ctaTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  ctaDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  ctaButton: {
    backgroundColor: "#F5A623",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 4,
  },
  ctaButtonText: { color: "#1A3A5C", fontSize: 14, fontWeight: "700" },
});
