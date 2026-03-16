import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { Review } from "@/lib/types";
import { notifyServiceCompleted } from "@/lib/notifications";
import { Platform } from "react-native";

const REVIEW_TAGS = [
  "Pontual", "Profissional", "Ótimo serviço", "Preço justo",
  "Comunicativo", "Organizado", "Recomendo", "Rápido",
];

export default function ReviewScreen() {
  const colors = useColors();
  const { id: requestId } = useLocalSearchParams<{ id: string }>();
  const { requests, technicians, addReview, updateRequest, user } = useAppContext();

  const request = requests.find((r) => r.id === requestId);
  const technician = technicians.find((t) => t.id === request?.technicianId);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request || !technician) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted }}>Serviço não encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#1A3A5C" }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getRatingLabel = (r: number) => {
    const labels = ["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente!"];
    return labels[r] || "";
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Avaliação necessária", "Por favor, selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const review: Review = {
        id: `rev_${Date.now()}`,
        clientId: user.id,
        clientName: user.name,
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        createdAt: new Date().toISOString(),
      };
      addReview(technician.id, review);
      updateRequest(request.id, { status: "encerrado", review });
      setIsSubmitting(false);
      // Notificar o técnico sobre a avaliação recebida
      if (Platform.OS !== "web") {
        notifyServiceCompleted({
          technicianName: technician.name,
          serviceType: request.category || "Serviço",
          requestId: request.id,
        });
      }
      Alert.alert(
        "Avaliação enviada!",
        "Obrigado pelo seu feedback. Ele ajuda outros clientes a encontrar os melhores profissionais.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/requests" as any) }]
      );
    }, 1000);
  };

  const displayRating = hoveredRating || rating;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Avaliar Serviço</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info do Técnico */}
        <View style={[styles.techCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.techAvatar}>
            <Text style={styles.techAvatarText}>
              {technician.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.techName, { color: colors.foreground }]}>{technician.name}</Text>
            <Text style={[styles.techService, { color: colors.muted }]}>
              {request.category.charAt(0).toUpperCase() + request.category.slice(1).replace("_", " ")}
            </Text>
          </View>
          <View style={[styles.completedBadge, { backgroundColor: "#22C55E20" }]}>
            <MaterialIcons name="check-circle" size={16} color="#22C55E" />
            <Text style={[styles.completedText, { color: "#22C55E" }]}>Concluído</Text>
          </View>
        </View>

        {/* Estrelas */}
        <View style={styles.starsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Como foi o atendimento?
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
              >
                <MaterialIcons
                  name={star <= displayRating ? "star" : "star-border"}
                  size={44}
                  color={star <= displayRating ? "#F59E0B" : colors.border}
                />
              </Pressable>
            ))}
          </View>
          {displayRating > 0 && (
            <Text style={[styles.ratingLabel, { color: "#F59E0B" }]}>
              {getRatingLabel(displayRating)}
            </Text>
          )}
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            O que você destacaria? <Text style={[styles.optional, { color: colors.muted }]}>(opcional)</Text>
          </Text>
          <View style={styles.tagsContainer}>
            {REVIEW_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={({ pressed }) => [
                  styles.tag,
                  {
                    backgroundColor: selectedTags.includes(tag) ? "#1A3A5C" : colors.surface,
                    borderColor: selectedTags.includes(tag) ? "#1A3A5C" : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: selectedTags.includes(tag) ? "#fff" : colors.foreground },
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Comentário */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Deixe um comentário <Text style={[styles.optional, { color: colors.muted }]}>(opcional)</Text>
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Conte como foi sua experiência com este profissional..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
            maxLength={300}
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>{comment.length}/300</Text>
        </View>

        {/* Botão */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: rating > 0 ? "#1A3A5C" : colors.border,
              opacity: isSubmitting || pressed ? 0.8 : 1,
            },
          ]}
        >
          <MaterialIcons name="star" size={20} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Text>
        </Pressable>
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 40 },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  techAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1A3A5C",
    alignItems: "center",
    justifyContent: "center",
  },
  techAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  techName: { fontSize: 15, fontWeight: "700" },
  techService: { fontSize: 13, marginTop: 2 },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completedText: { fontSize: 12, fontWeight: "600" },
  starsSection: { alignItems: "center", marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  starsRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  ratingLabel: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  section: { marginBottom: 24 },
  optional: { fontSize: 13, fontWeight: "400" },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: { fontSize: 13, fontWeight: "500" },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 4 },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
