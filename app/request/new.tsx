import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import { ServiceCategory, ServiceRequest } from "@/lib/types";
// Notificações push remotas serão implementadas na fase 2

const SERVICE_CATEGORIES = [
  { id: "cftv", label: "Câmeras CFTV", icon: "videocam", color: "#3B82F6" },
  { id: "alarmes", label: "Alarmes", icon: "notifications-active", color: "#EF4444" },
  { id: "portao", label: "Portão Eletrônico", icon: "garage", color: "#8B5CF6" },
  { id: "interfone", label: "Interfone", icon: "phone-in-talk", color: "#F59E0B" },
  { id: "fechadura", label: "Fechadura Digital", icon: "lock", color: "#10B981" },
  { id: "cerca", label: "Cerca Elétrica", icon: "electric-bolt", color: "#F97316" },
  { id: "wifi", label: "Redes Wi-Fi", icon: "wifi", color: "#06B6D4" },
  { id: "acesso", label: "Controle de Acesso", icon: "badge", color: "#6366F1" },
  { id: "monitoramento", label: "Monitoramento", icon: "monitor", color: "#EC4899" },
  { id: "portaria_remota", label: "Portaria Remota", icon: "security", color: "#14B8A6" },
];

export default function NewRequestScreen() {
  const colors = useColors();
  const { addRequest, user } = useAppContext();
  const { technicianId } = useLocalSearchParams<{ technicianId?: string }>();

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(user.city || "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para adicionar fotos.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar fotos.");
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert("Adicionar foto", "Escolha uma opção", [
      { text: "Câmera", onPress: handleTakePhoto },
      { text: "Galeria", onPress: handlePickImage },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const createRequestMutation = trpc.requests.create.useMutation();

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert("Selecione o serviço", "Por favor, selecione o tipo de serviço necessário.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      Alert.alert("Descrição muito curta", "Por favor, descreva o problema com mais detalhes.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Tentar salvar no servidor
      let serverId: number | null = null;
      try {
        serverId = await createRequestMutation.mutateAsync({
          category: selectedCategory,
          description: description.trim(),
          location: location.trim() || user.city || "Localização não informada",
          photoUrl: photoUri || undefined,
          urgency: "normal",
          clientName: user.name || "Cliente",
          clientPhone: user.phone || undefined,
        });
      } catch (serverErr) {
        console.warn("[NewRequest] Servidor indisponível, salvando localmente:", serverErr);
      }

      // Sempre salvar localmente como fallback
      const newRequest: ServiceRequest = {
        id: serverId ? `server_${serverId}` : `req_${Date.now()}`,
        clientId: user.id,
        clientName: user.name || "Cliente",
        technicianId: technicianId,
        category: selectedCategory,
        description: description.trim(),
        photoUrl: photoUri || undefined,
        location: location.trim() || user.city || "Localização não informada",
        status: "solicitado",
        urgency: "normal",
        quotes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addRequest(newRequest);

      // Nota: notificações push remotas para técnicos serão implementadas via servidor na fase 2
      // Por ora, a notificação local no dispositivo do cliente foi removida para evitar confusão
      Alert.alert(
        "Solicitação enviada!",
        serverId
          ? "Sua solicitação foi registrada no servidor. Técnicos serão notificados!"
          : "Solicitação salva localmente. Conecte-se à internet para sincronizar.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/requests" as any) }]
      );
    } catch (e) {
      Alert.alert("Erro", "Não foi possível enviar a solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Nova Solicitação</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo de Serviço */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Tipo de Serviço <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>
          <View style={styles.categoriesGrid}>
            {SERVICE_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id as ServiceCategory)}
                style={({ pressed }) => [
                  styles.categoryOption,
                  {
                    backgroundColor: selectedCategory === cat.id ? cat.color + "20" : colors.surface,
                    borderColor: selectedCategory === cat.id ? cat.color : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <MaterialIcons name={cat.icon as any} size={22} color={cat.color} />
                <Text
                  style={[
                    styles.categoryOptionText,
                    { color: selectedCategory === cat.id ? cat.color : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Descrição */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Descreva o Problema <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.textarea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Ex: Preciso instalar 4 câmeras externas na minha residência..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>
            {description.length}/500 caracteres
          </Text>
        </View>

        {/* Foto do Problema */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Foto do Problema <Text style={[styles.optionalTag, { color: colors.muted }]}>(opcional)</Text>
          </Text>
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              <Pressable
                onPress={() => setPhotoUri(null)}
                style={({ pressed }) => [styles.removePhotoBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="close" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={handlePhotoPress}
                style={({ pressed }) => [styles.changePhotoBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="edit" size={16} color="#fff" />
                <Text style={styles.changePhotoBtnText}>Trocar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePhotoPress}
              style={({ pressed }) => [
                styles.photoPlaceholder,
                { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <MaterialIcons name="add-a-photo" size={36} color={colors.muted} />
              <Text style={[styles.photoPlaceholderText, { color: colors.muted }]}>
                Adicionar foto do problema
              </Text>
              <Text style={[styles.photoPlaceholderSub, { color: colors.muted }]}>
                Câmera ou galeria
              </Text>
            </Pressable>
          )}
        </View>

        {/* Localização */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Localização</Text>
          <View style={[styles.locationInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="place" size={20} color="#1A3A5C" />
            <TextInput
              style={[styles.locationText, { color: colors.foreground }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Informe sua localização"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: "#1A3A5C15", borderColor: "#1A3A5C30" }]}>
          <MaterialIcons name="info" size={18} color="#1A3A5C" />
          <Text style={[styles.infoText, { color: "#1A3A5C" }]}>
            Técnicos próximos da sua região serão notificados e poderão enviar orçamentos.
          </Text>
        </View>
      </ScrollView>

      {/* Botão de Envio */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: "#1A3A5C", opacity: isSubmitting || pressed ? 0.8 : 1 },
          ]}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Enviando...</Text>
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
            </>
          )}
        </Pressable>
      </View>
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
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  optionalTag: { fontSize: 13, fontWeight: "400" },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    width: "30%",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  categoryOptionText: { fontSize: 11, textAlign: "center", fontWeight: "500" },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 110,
    lineHeight: 20,
  },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 4 },
  photoPreviewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    height: 180,
  },
  photoPreview: { width: "100%", height: "100%" },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  changePhotoBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  photoPlaceholder: {
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoPlaceholderText: { fontSize: 14, fontWeight: "500" },
  photoPlaceholderSub: { fontSize: 12 },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  locationText: { flex: 1, fontSize: 14 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
