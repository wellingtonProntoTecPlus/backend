import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { Quote } from "@/lib/types";
import { notifyClientNewQuote, notifyClientTechnicianAccepted } from "@/lib/notifications";
import { Platform } from "react-native";

const ESTIMATED_TIMES = ["1-2 horas", "Meio dia", "1 dia", "2-3 dias", "1 semana", "A combinar"];

export default function QuotesScreen() {
  const colors = useColors();
  const { id: requestId } = useLocalSearchParams<{ id: string }>();
  const { requests, technicians, user, addQuote, acceptQuote } = useAppContext();

  const request = requests.find((r) => r.id === requestId);
  const quotes = request?.quotes ?? [];

  const [showSendQuote, setShowSendQuote] = useState(false);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("A combinar");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.muted }}>Solicitação não encontrada</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#1A3A5C" }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const handleSendQuote = () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Valor inválido", "Por favor, informe um valor válido para o orçamento.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Descrição necessária", "Descreva o que está incluído no orçamento.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const quote: Quote = {
        id: `q_${Date.now()}`,
        requestId: request.id,
        technicianId: user.technicianProfile?.id ?? user.id,
        price: Number(price),
        description: description.trim(),
        estimatedTime,
        createdAt: new Date().toISOString(),
        status: "pendente",
      };
      addQuote(request.id, quote);
      setIsSubmitting(false);
      setShowSendQuote(false);
      setPrice("");
      setDescription("");
      // Notificar o cliente sobre o novo orçamento
      if (Platform.OS !== "web") {
        notifyClientNewQuote({
          technicianName: user.technicianProfile?.companyName || user.name || "Técnico",
          serviceType: request.category || "Serviço",
          price: Number(price),
        });
      }
      Alert.alert("Orçamento enviado!", "O cliente receberá seu orçamento e poderá aceitá-lo.");
    }, 800);
  };

  const handleAcceptQuote = (quoteId: string, technicianId: string) => {
    const tech = technicians.find((t) => t.id === technicianId);
    Alert.alert(
      "Aceitar orçamento?",
      `Confirma a contratação de ${tech?.name ?? "este profissional"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          onPress: async () => {
            acceptQuote(request.id, quoteId);
            // Notificar o técnico que o orçamento foi aceito
            if (Platform.OS !== "web" && tech) {
              await notifyClientTechnicianAccepted({
                technicianName: tech.name,
                serviceType: request.category || "Serviço",
              });
            }
            Alert.alert(
              "Orçamento aceito!",
              "O técnico foi notificado e entrará em contato em breve.",
              [{ text: "OK", onPress: () => router.replace("/(tabs)/requests" as any) }]
            );
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  const renderQuote = ({ item }: { item: Quote }) => {
    const tech = technicians.find((t) => t.id === item.technicianId);
    const isAccepted = item.status === "aceito";

    return (
      <View
        style={[
          styles.quoteCard,
          {
            backgroundColor: colors.surface,
            borderColor: isAccepted ? "#22C55E" : colors.border,
            borderWidth: isAccepted ? 2 : 1,
          },
        ]}
      >
        {isAccepted && (
          <View style={styles.acceptedBanner}>
            <MaterialIcons name="check-circle" size={14} color="#22C55E" />
            <Text style={[styles.acceptedBannerText, { color: "#22C55E" }]}>Orçamento aceito</Text>
          </View>
        )}

        {/* Técnico */}
        <View style={styles.techRow}>
          <View style={styles.techAvatar}>
            <Text style={styles.techAvatarText}>
              {(tech?.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.techName, { color: colors.foreground }]}>{tech?.name ?? "Técnico"}</Text>
            <View style={styles.techMeta}>
              <MaterialIcons name="star" size={13} color="#F59E0B" />
              <Text style={[styles.techRating, { color: colors.muted }]}>{tech?.rating ?? "—"}</Text>
              <Text style={[styles.techDot, { color: colors.muted }]}>•</Text>
              <Text style={[styles.techCity, { color: colors.muted }]}>{tech?.city ?? "—"}</Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, { color: colors.muted }]}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        {/* Preço */}
        <View style={[styles.priceRow, { backgroundColor: "#1A3A5C10", borderRadius: 10 }]}>
          <View>
            <Text style={[styles.priceLabel, { color: colors.muted }]}>Valor do orçamento</Text>
            <Text style={[styles.priceValue, { color: "#1A3A5C" }]}>{formatCurrency(item.price)}</Text>
          </View>
          <View style={styles.timeBox}>
            <MaterialIcons name="schedule" size={14} color={colors.muted} />
            <Text style={[styles.timeText, { color: colors.muted }]}>{item.estimatedTime}</Text>
          </View>
        </View>

        {/* Descrição */}
        <Text style={[styles.quoteDesc, { color: colors.foreground }]}>{item.description}</Text>

        {/* Ações (apenas para cliente, se não aceito ainda) */}
        {user.mode === "cliente" && item.status === "pendente" && (
          <View style={styles.quoteActions}>
            <Pressable
              onPress={() => router.push({ pathname: "/technician/[id]", params: { id: item.technicianId } } as any)}
              style={({ pressed }) => [
                styles.viewProfileBtn,
                { borderColor: "#1A3A5C", opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.viewProfileText, { color: "#1A3A5C" }]}>Ver perfil</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAcceptQuote(item.id, item.technicianId)}
              style={({ pressed }) => [
                styles.acceptBtn,
                { backgroundColor: "#1A3A5C", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <MaterialIcons name="check" size={16} color="#fff" />
              <Text style={styles.acceptBtnText}>Aceitar orçamento</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Orçamentos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info da solicitação */}
      <View style={[styles.requestInfo, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.requestCategory, { color: colors.foreground }]}>
          {request.category.charAt(0).toUpperCase() + request.category.slice(1).replace("_", " ")}
        </Text>
        <Text style={[styles.requestDesc, { color: colors.muted }]} numberOfLines={2}>
          {request.description}
        </Text>
        <View style={styles.requestMeta}>
          <MaterialIcons name="place" size={13} color={colors.muted} />
          <Text style={[styles.requestMetaText, { color: colors.muted }]}>{request.location}</Text>
          <Text style={[styles.requestMetaDot, { color: colors.muted }]}>•</Text>
          <Text style={[styles.requestMetaText, { color: colors.muted }]}>
            {quotes.length} orçamento{quotes.length !== 1 ? "s" : ""} recebido{quotes.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Lista de orçamentos */}
      <FlatList
        data={quotes}
        renderItem={renderQuote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="request-quote" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aguardando orçamentos</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Técnicos próximos estão analisando sua solicitação e enviarão propostas em breve.
            </Text>
          </View>
        }
      />

      {/* Botão enviar orçamento (modo técnico) */}
      {user.mode === "tecnico" && (request.status === "solicitado" || request.status === "em_analise") && (
        <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => setShowSendQuote(true)}
            style={({ pressed }) => [
              styles.sendQuoteBtn,
              { backgroundColor: "#1A3A5C", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialIcons name="request-quote" size={20} color="#fff" />
            <Text style={styles.sendQuoteBtnText}>Enviar Orçamento</Text>
          </Pressable>
        </View>
      )}

      {/* Modal de envio de orçamento */}
      <Modal visible={showSendQuote} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Enviar Orçamento</Text>
              <Pressable onPress={() => setShowSendQuote(false)}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Valor */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Valor (R$) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Ex: 250"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />

              {/* Prazo */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Prazo estimado *</Text>
              <View style={styles.timeOptions}>
                {ESTIMATED_TIMES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setEstimatedTime(t)}
                    style={[
                      styles.timeOption,
                      {
                        backgroundColor: estimatedTime === t ? "#1A3A5C" : colors.surface,
                        borderColor: estimatedTime === t ? "#1A3A5C" : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: estimatedTime === t ? "#fff" : colors.foreground, fontSize: 13 }}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Descrição */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>O que está incluído? *</Text>
              <TextInput
                style={[
                  styles.textarea,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
                ]}
                placeholder="Descreva o que está incluído no orçamento: mão de obra, materiais, deslocamento..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                maxLength={400}
              />

              <Pressable
                onPress={handleSendQuote}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  { backgroundColor: "#1A3A5C", opacity: isSubmitting || pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.modalSubmitText}>
                  {isSubmitting ? "Enviando..." : "Enviar Orçamento"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  requestInfo: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 4,
  },
  requestCategory: { fontSize: 16, fontWeight: "700" },
  requestDesc: { fontSize: 13, lineHeight: 18 },
  requestMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  requestMetaText: { fontSize: 12 },
  requestMetaDot: { fontSize: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  quoteCard: { borderRadius: 14, padding: 14, gap: 12 },
  acceptedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptedBannerText: { fontSize: 13, fontWeight: "600" },
  techRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  techAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A3A5C",
    alignItems: "center",
    justifyContent: "center",
  },
  techAvatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  techName: { fontSize: 15, fontWeight: "700" },
  techMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  techRating: { fontSize: 12 },
  techDot: { fontSize: 12 },
  techCity: { fontSize: 12 },
  timeAgo: { fontSize: 11 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  priceLabel: { fontSize: 11, marginBottom: 2 },
  priceValue: { fontSize: 22, fontWeight: "800" },
  timeBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 13 },
  quoteDesc: { fontSize: 13, lineHeight: 18 },
  quoteActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  viewProfileBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  viewProfileText: { fontSize: 13, fontWeight: "600" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  acceptBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  sendQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  sendQuoteBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  timeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
  modalSubmitBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  modalSubmitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
