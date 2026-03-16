import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { formatPhone } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/upload-image";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { ServiceCategory } from "@/lib/types";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "company_technicians";

interface CompanyTechnician {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  photoUri?: string;
  specialties: ServiceCategory[];
  createdAt: string;
}

export default function CompanyTechniciansScreen() {
  const colors = useColors();
  const { technicianProfile } = useAppContext();
  const [technicians, setTechnicians] = useState<CompanyTechnician[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<ServiceCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const registerMutation = trpc.technicians.register.useMutation();

  // Load technicians from storage
  React.useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setTechnicians(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  };

  const saveTechnicians = async (list: CompanyTechnician[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permita o acesso à galeria para adicionar foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleSpecialty = (id: ServiceCategory) => {
    setSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setWhatsapp("");
    setPhotoUri(null);
    setSpecialties([]);
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (tech: CompanyTechnician) => {
    setEditingId(tech.id);
    setName(tech.name);
    setPhone(tech.phone);
    setWhatsapp(tech.whatsapp || "");
    setPhotoUri(tech.photoUri || null);
    setSpecialties(tech.specialties);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "Informe o nome do técnico.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Atenção", "Informe o telefone do técnico.");
      return;
    }
    if (specialties.length === 0) {
      Alert.alert("Atenção", "Selecione ao menos uma especialidade.");
      return;
    }

    setSaving(true);
    try {
      let photoS3Url: string | null = null;
      // Só faz upload se a foto mudou (não é uma URL do S3 já existente)
      if (photoUri && !photoUri.startsWith("http")) {
        photoS3Url = await uploadImageToS3(photoUri, "/api/technician/photo");
        if (!photoS3Url) photoS3Url = photoUri;
      } else if (photoUri) {
        photoS3Url = photoUri; // já é URL do S3
      }

      const companyName = technicianProfile?.companyName || technicianProfile?.name || "";
      const companyCity = technicianProfile?.city || "";
      const companyState = technicianProfile?.state || "";

      if (editingId) {
        // ─── Editar técnico existente ────────────────────────────────────────
        const updated = technicians.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: name.trim(),
                phone: phone.trim(),
                whatsapp: whatsapp.trim() || phone.trim(),
                photoUri: photoS3Url || photoUri || t.photoUri,
                specialties,
              }
            : t
        );
        setTechnicians(updated);
        await saveTechnicians(updated);
        Alert.alert("Técnico atualizado!", `${name.trim()} foi atualizado com sucesso.`);
      } else {
        // ─── Adicionar novo técnico ──────────────────────────────────────────
        try {
          await registerMutation.mutateAsync({
            name: name.trim(),
            companyName: companyName,
            phone: phone.trim(),
            whatsapp: whatsapp.trim() || phone.trim(),
            city: companyCity,
            state: companyState,
            type: "empresa",
            specialties,
            photoUri: photoS3Url || undefined,
            avatarUrl: photoS3Url || undefined,
            description: `Técnico da empresa ${companyName}`,
          });
        } catch (err) {
          console.warn("[CompanyTechnicians] Servidor indisponível, salvando localmente:", err);
        }

        const newTech: CompanyTechnician = {
          id: `tech_${Date.now()}`,
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          photoUri: photoS3Url || photoUri || undefined,
          specialties,
          createdAt: new Date().toISOString(),
        };

        const updated = [...technicians, newTech];
        setTechnicians(updated);
        await saveTechnicians(updated);
        Alert.alert("Técnico adicionado!", `${name.trim()} foi cadastrado com sucesso.`);
      }

      resetForm();
      setShowModal(false);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o técnico. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (id: string, techName: string) => {
    Alert.alert(
      "Remover Técnico",
      `Deseja remover ${techName} da equipe?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const updated = technicians.filter((t) => t.id !== id);
            setTechnicians(updated);
            await saveTechnicians(updated);
          },
        },
      ]
    );
  };

  const renderTechnician = ({ item }: { item: CompanyTechnician }) => (
    <View style={[styles.techCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.techCardLeft}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.techAvatar} />
        ) : (
          <View style={[styles.techAvatarPlaceholder, { backgroundColor: "#1A3A6B20" }]}>
            <MaterialIcons name="person" size={28} color="#1A3A6B" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.techName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.techPhone, { color: colors.muted }]}>{item.phone}</Text>
          <View style={styles.specialtiesRow}>
            {item.specialties.slice(0, 3).map((s) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.id === s);
              return cat ? (
                <View key={s} style={[styles.specialtyTag, { backgroundColor: cat.color + "20" }]}>
                  <Text style={[styles.specialtyTagText, { color: cat.color }]}>{cat.label}</Text>
                </View>
              ) : null;
            })}
            {item.specialties.length > 3 && (
              <Text style={[styles.specialtyTagText, { color: colors.muted }]}>+{item.specialties.length - 3}</Text>
            )}
          </View>
        </View>
      </View>
      {/* Botões de ação: editar + excluir */}
      <View style={styles.actionBtns}>
        <TouchableOpacity
          onPress={() => handleOpenEdit(item)}
          activeOpacity={0.7}
          style={[styles.actionBtn, { backgroundColor: "#1A3A6B15" }]}
        >
          <MaterialIcons name="edit" size={18} color="#1A3A6B" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemove(item.id, item.name)}
          activeOpacity={0.7}
          style={[styles.actionBtn, { backgroundColor: "#EF444415" }]}
        >
          <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A6B", borderBottomColor: "#1A3A6B" }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Técnicos</Text>
        <TouchableOpacity
          onPress={handleOpenAdd}
          activeOpacity={0.7}
          style={styles.addBtn}
        >
          <MaterialIcons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Company info */}
      {technicianProfile?.companyName && (
        <View style={[styles.companyBanner, { backgroundColor: "#1A3A6B10", borderBottomColor: colors.border }]}>
          <MaterialIcons name="business" size={16} color="#1A3A6B" />
          <Text style={[styles.companyBannerText, { color: "#1A3A6B" }]}>
            {technicianProfile.companyName}
          </Text>
        </View>
      )}

      {!loaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#1A3A6B" size="large" />
        </View>
      ) : technicians.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="group" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum técnico cadastrado</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Adicione os técnicos da sua equipe para que apareçam disponíveis para os clientes.
          </Text>
          <TouchableOpacity
            onPress={handleOpenAdd}
            activeOpacity={0.85}
            style={[styles.addFirstBtn, { backgroundColor: "#1A3A6B" }]}
          >
            <MaterialIcons name="person-add" size={18} color="#fff" />
            <Text style={styles.addFirstBtnText}>Adicionar Técnico</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={technicians}
          keyExtractor={(item) => item.id}
          renderItem={renderTechnician}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <TouchableOpacity
              onPress={handleOpenAdd}
              activeOpacity={0.85}
              style={[styles.addMoreBtn, { borderColor: "#1A3A6B" }]}
            >
              <MaterialIcons name="person-add" size={18} color="#1A3A6B" />
              <Text style={[styles.addMoreBtnText, { color: "#1A3A6B" }]}>Adicionar Técnico</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Modal de adicionar/editar técnico */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { resetForm(); setShowModal(false); }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: "#1A3A6B" }]}>
            <TouchableOpacity onPress={() => { resetForm(); setShowModal(false); }} activeOpacity={0.7}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId ? "Editar Técnico" : "Adicionar Técnico"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Foto */}
            <View style={styles.photoSection}>
              <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}
                style={[styles.photoBtn, { borderColor: photoUri ? "#1A3A6B" : colors.border, backgroundColor: colors.surface }]}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color={colors.muted} />
                    <Text style={[styles.photoPlaceholderText, { color: colors.muted }]}>Foto do Técnico</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photoUri && (
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginTop: 6 }}>
                  <Text style={{ color: "#EF4444", fontSize: 12 }}>Remover foto</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Nome */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome do Técnico <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialIcons name="person" size={18} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Nome completo"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Telefone */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Telefone <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialIcons name="phone" size={18} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={(t) => setPhone(formatPhone(t))}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* WhatsApp */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>WhatsApp</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialIcons name="chat" size={18} color={colors.muted} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="(00) 00000-0000 (opcional)"
                  placeholderTextColor={colors.muted}
                  value={whatsapp}
                  onChangeText={(t) => setWhatsapp(formatPhone(t))}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Especialidades */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Especialidades <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={styles.specialtiesGrid}>
                {SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = specialties.includes(cat.id as ServiceCategory);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleSpecialty(cat.id as ServiceCategory)}
                      activeOpacity={0.8}
                      style={[
                        styles.specialtyOption,
                        {
                          backgroundColor: isSelected ? cat.color + "20" : colors.surface,
                          borderColor: isSelected ? cat.color : colors.border,
                        },
                      ]}
                    >
                      <MaterialIcons name={cat.icon as any} size={22} color={cat.color} />
                      <Text style={[styles.specialtyLabel, { color: isSelected ? cat.color : colors.foreground }]}>
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkMark, { backgroundColor: cat.color }]}>
                          <MaterialIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={[styles.saveBtn, { backgroundColor: "#1A3A6B", opacity: saving ? 0.7 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name={editingId ? "save" : "check"} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {editingId ? "Salvar Alterações" : "Salvar Técnico"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },
  addBtn: { padding: 4 },
  companyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  companyBannerText: { fontSize: 14, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  addFirstBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
  addFirstBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, gap: 12 },
  techCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  techCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  techAvatar: { width: 52, height: 52, borderRadius: 26 },
  techAvatarPlaceholder: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  techName: { fontSize: 15, fontWeight: "700" },
  techPhone: { fontSize: 13, marginTop: 2 },
  specialtiesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  specialtyTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  specialtyTagText: { fontSize: 11, fontWeight: "600" },
  actionBtns: { flexDirection: "column", gap: 6 },
  actionBtn: { padding: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 4,
  },
  addMoreBtnText: { fontWeight: "700", fontSize: 15 },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  photoSection: { alignItems: "center", marginBottom: 8 },
  photoBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { alignItems: "center", gap: 4 },
  photoPlaceholderText: { fontSize: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  input: { flex: 1, fontSize: 15 },
  specialtiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specialtyOption: {
    width: "30%",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
    position: "relative",
  },
  specialtyLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  checkMark: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
