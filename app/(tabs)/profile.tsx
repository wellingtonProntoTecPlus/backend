import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  Modal,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "@/constants/oauth";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { formatPhone, formatCEP } from "@/lib/utils";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import { Address } from "@/lib/types";
import { Toast } from "@/components/segtec/Toast";
import { useToast } from "@/hooks/use-toast";

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

function MenuItem({ icon, label, onPress, rightElement, color, subtitle }: MenuItemProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: (color || "#1A3A5C") + "15" }]}>
        <MaterialIcons name={icon as any} size={20} color={color || "#1A3A5C"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      {rightElement || <MaterialIcons name="chevron-right" size={20} color={colors.muted} />}
    </Pressable>
  );
}

// Modal genérico de edição de campo
function EditModal({
  visible,
  title,
  value,
  placeholder,
  keyboardType,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  onSave: (val: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [text, setText] = useState(value);

  React.useEffect(() => {
    if (visible) setText(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            value={text}
            onChangeText={(v) => setText(keyboardType === "phone-pad" ? formatPhone(v) : v)}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            keyboardType={keyboardType || "default"}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => { onSave(text); onClose(); }}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalBtnText, { color: colors.muted }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={() => { onSave(text); onClose(); }}
              activeOpacity={0.85}
            >
              <Text style={[styles.modalBtnText, { color: "#fff" }]}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const { user, profilePhoto, logout, deleteAccount, setProfilePhoto, setAuthUser, setAddress, updateTechnicianProfile, technicianProfile } = useAppContext();
  const isTecnico = user.mode === "tecnico";

  // Mutation para atualizar perfil no servidor
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onError: (err) => {
      console.error("[Profile] Falha ao salvar no servidor:", err.message);
    },
  });

  // Sincronizar perfil do técnico com o servidor ao abrir a tela
  const { data: serverTechProfile } = trpc.technicians.getMyProfile.useQuery(undefined, {
    enabled: isTecnico,
    staleTime: 30000, // não refetch se dados têm menos de 30s
  });

  useEffect(() => {
    if (serverTechProfile) {
      // Sincronizar dados do servidor para o contexto local
      const syncedProfile = {
        id: `server_${serverTechProfile.id}`,
        name: serverTechProfile.name,
        companyName: serverTechProfile.companyName || serverTechProfile.name,
        document: serverTechProfile.document || "",
        city: serverTechProfile.city,
        state: serverTechProfile.state,
        type: (serverTechProfile.type as any) || "autonomo",
        badge: (serverTechProfile.badge as any) || "autonomo",
        level: (serverTechProfile.level as any) || "autonomo",
        avatar: serverTechProfile.avatarUrl || serverTechProfile.photoUri || "",
        companyLogoUrl: serverTechProfile.companyLogoUrl || undefined,
        phone: serverTechProfile.phone,
        whatsapp: serverTechProfile.whatsapp || serverTechProfile.phone,
        description: serverTechProfile.description || "",
        specialties: (serverTechProfile.specialties as any) || [],
        rating: serverTechProfile.rating || 5.0,
        totalReviews: serverTechProfile.totalReviews || 0,
        reviews: [],
        totalServices: serverTechProfile.totalServices || 0,
        yearsExperience: serverTechProfile.yearsExperience || 0,
        workPhotos: [],
        planType: (serverTechProfile.planType as any) || "gratuito",
        availability: (serverTechProfile.availability as any) || "disponivel",
        address: {
          street: serverTechProfile.addressStreet || "",
          number: serverTechProfile.addressNumber || "",
          complement: serverTechProfile.addressComplement || "",
          neighborhood: serverTechProfile.addressNeighborhood || "",
          city: serverTechProfile.city,
          state: serverTechProfile.state,
          zipCode: serverTechProfile.addressZipCode || "",
        },
      };
      updateTechnicianProfile(syncedProfile as any);
    }
  }, [serverTechProfile]);

  const [editingField, setEditingField] = useState<null | "name" | "phone" | "address">(null);
  const [cepLoading, setCepLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const fetchAddressByCEP = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressForm((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false);
    }
  };

  const openAddressModal = () => {
    setAddressForm({
      street: user.address?.street || "",
      number: user.address?.number || "",
      complement: user.address?.complement || "",
      neighborhood: user.address?.neighborhood || "",
      city: user.address?.city || user.city || "",
      state: user.address?.state || "",
      zipCode: user.address?.zipCode || "",
    });
    setEditingField("address");
  };

  const [addressForm, setAddressForm] = useState<Address>({
    street: user.address?.street || "",
    number: user.address?.number || "",
    complement: user.address?.complement || "",
    neighborhood: user.address?.neighborhood || "",
    city: user.address?.city || user.city || "",
    state: user.address?.state || "",
    zipCode: user.address?.zipCode || "",
  });

  const [photoUploading, setPhotoUploading] = useState(false);

  /**
   * Faz upload da foto para o servidor S3.
   * Converte a imagem para base64 e envia via POST /api/user/avatar.
   * Retorna a URL pública do S3 ou null em caso de erro.
   */
  const uploadPhotoToServer = async (localUri: string): Promise<string | null> => {
    try {
      setPhotoUploading(true);
      // Converter imagem para base64
      let base64: string;
      if (Platform.OS === "web") {
        // Na web, buscar como blob e converter
        const response = await fetch(localUri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove o prefixo "data:image/...;base64,"
            resolve(result.split(",")[1] || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // No nativo, usar fetch para ler o arquivo como blob
        const response = await fetch(localUri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1] || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (!base64) {
        throw new Error("Falha ao converter imagem para base64");
      }

      // Buscar token de sessão
      const sessionToken = await AsyncStorage.getItem("@prontotec:session_token");
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";

      const uploadRes = await fetch(`${apiBase}/api/user/avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ base64, mimeType: "image/jpeg" }),
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        console.warn("[ProfilePhoto] Upload falhou:", errData);
        return null;
      }

      const { url } = await uploadRes.json();
      return url as string;
    } catch (err) {
      console.error("[ProfilePhoto] Erro no upload:", err);
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      "Foto de Perfil",
      "Escolha uma opção",
      [
        {
          text: "Câmera",
          onPress: async () => {
            if (Platform.OS !== "web") {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permissão negada", "Permita o acesso à câmera nas configurações do dispositivo.");
                return;
              }
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const localUri = result.assets[0].uri;
              // Mostrar foto imediatamente (UX responsiva)
              setProfilePhoto(localUri);
              // Fazer upload em background
              const s3Url = await uploadPhotoToServer(localUri);
              if (s3Url) {
                // Atualizar com URL permanente do S3
                setProfilePhoto(s3Url);
              } else {
                Alert.alert("Aviso", "Foto salva localmente. Será sincronizada quando houver conexão.");
              }
            }
          },
        },
        {
          text: "Galeria",
          onPress: async () => {
            if (Platform.OS !== "web") {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permissão negada", "Permita o acesso à galeria nas configurações do dispositivo.");
                return;
              }
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: "images",
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const localUri = result.assets[0].uri;
              // Mostrar foto imediatamente (UX responsiva)
              setProfilePhoto(localUri);
              // Fazer upload em background
              const s3Url = await uploadPhotoToServer(localUri);
              if (s3Url) {
                // Atualizar com URL permanente do S3
                setProfilePhoto(s3Url);
              } else {
                Alert.alert("Aviso", "Foto salva localmente. Será sincronizada quando houver conexão.");
              }
            }
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleSaveField = (field: "name" | "phone" | "address", value: string) => {
    if (!value.trim()) return;
    if (field === "name") {
      setAuthUser({ email: user.email, name: value.trim() });
      updateProfileMutation.mutate({ name: value.trim() });
      showToast("Nome atualizado com sucesso");
    } else if (field === "phone") {
      setAuthUser({ email: user.email, phone: value.trim() });
      updateProfileMutation.mutate({ phone: value.trim() });
      showToast("Telefone atualizado com sucesso");
    }
  };

  const handleSaveAddress = () => {
    if (!addressForm.city.trim()) {
      Alert.alert("Campo obrigatório", "Informe pelo menos a cidade.");
      return;
    }
    setAddress(addressForm);
    updateProfileMutation.mutate({
      city: addressForm.city.trim(),
      state: addressForm.state?.trim(),
      addressStreet: addressForm.street?.trim(),
      addressNumber: addressForm.number?.trim(),
      addressComplement: addressForm.complement?.trim(),
      addressNeighborhood: addressForm.neighborhood?.trim(),
      addressZipCode: addressForm.zipCode?.trim(),
    });
    setEditingField(null);
    showToast("Endereço atualizado com sucesso");
  };

  const handleAuthorizationTerm = () => {
    Alert.alert(
      "Autorização de Uso de Imagem",
      "Ao autorizar, você permite que o técnico registre fotos, vídeos ou depoimentos do serviço executado para divulgação profissional dentro do ProntoTEC+.\n\nVocê pode revogar esta autorização a qualquer momento.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Gerenciar Autorizações",
          onPress: () => Alert.alert(
            "Autorizações de Registro",
            "Suas autorizações são gerenciadas individualmente por serviço. Ao finalizar um serviço, você será perguntado se autoriza o registro de:\n\n📷 Fotos do serviço (antes/depois, equipamentos)\n🎥 Depoimento (vídeo curto ou recomendação)\n\nVocê pode responder SIM ou NÃO para cada um separadamente.",
            [{ text: "Entendi", style: "default" }]
          ),
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      {/* Toast de confirmação */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleChangePhoto} activeOpacity={0.8} disabled={photoUploading}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={40} color="#fff" />
            </View>
          )}
          {photoUploading ? (
            <View style={[styles.editAvatarButton, { backgroundColor: "rgba(0,0,0,0.5)", width: 80, height: 80, borderRadius: 40, bottom: 0, right: 0, alignItems: "center", justifyContent: "center" }]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : (
            <View style={styles.editAvatarButton}>
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.clientBadge}>
          <MaterialIcons name={isTecnico ? "build" : "person"} size={14} color="#F5A623" />
          <Text style={styles.clientBadgeText}>{isTecnico ? "Técnico" : "Cliente"}</Text>
        </View>
      </View>

      <ScrollView style={{ backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>



        {/* Minha Conta */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>MINHA CONTA</Text>
          <MenuItem
            icon="person"
            label="Nome"
            subtitle={user.name || "Não informado"}
            onPress={() => setEditingField("name")}
          />
          <MenuItem
            icon="phone"
            label="Telefone / WhatsApp"
            subtitle={user.phone || "Não informado"}
            onPress={() => setEditingField("phone")}
          />
          <MenuItem
            icon="location-on"
            label="Endereço"
            subtitle={
              (() => {
                const city = user.address?.city || user.city;
                const state = user.address?.state || user.state;
                const neighborhood = user.address?.neighborhood;
                if (!city) return "Não informado";
                const parts = [neighborhood, city].filter(Boolean).join(", ");
                return state ? `${parts} - ${state}` : parts;
              })()
            }
            onPress={openAddressModal}
          />
        </View>

        {/* ÁREA DO TÉCNICO - apenas para técnicos */}
        {isTecnico && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>AREA DO TÉCNICO</Text>
            <MenuItem
              icon="assignment"
              label="Editar Cadastro Técnico"
              subtitle="Atualizar dados, foto, especialidades e contato"
              onPress={() => router.push("/register-technician" as any)}
              color="#1A3A5C"
            />
            {technicianProfile?.type === "empresa" && (
              <MenuItem
                icon="group"
                label="Meus Técnicos"
                subtitle="Gerenciar equipe de técnicos da empresa"
                onPress={() => router.push("/company-technicians" as any)}
                color="#1A3A5C"
              />
            )}
            <MenuItem
              icon="build"
              label="Painel de Chamados"
              subtitle="Gerenciar pedidos pendentes e aceitos"
              onPress={() => router.push("/technician-panel" as any)}
              color="#1A3A5C"
            />
            <MenuItem
              icon="rate-review"
              label="Revisão do Cadastro"
              subtitle="Visualizar e corrigir seu perfil técnico"
              onPress={() => router.push("/technician-review" as any)}
              color="#1A3A5C"
            />
          </View>
        )}

        {/* Configurações */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>CONFIGURAÇÕES</Text>
          <MenuItem
            icon="photo-camera"
            label="Autorização de Imagem e Depoimento"
            subtitle="Gerencie permissões de registro de serviço"
            onPress={handleAuthorizationTerm}
            color="#7C3AED"
          />
          <MenuItem
            icon="notifications"
            label="Notificações"
            onPress={() => Alert.alert("Notificações", "Gerencie as permissões de notificação nas configurações do seu dispositivo.")}
          />
          <MenuItem
            icon="security"
            label="Privacidade e Segurança"
            onPress={() => router.push("/legal/privacy" as any)}
          />
          <MenuItem
            icon="help"
            label="Ajuda e Suporte"
            subtitle="contato@prontotecplus.app"
            onPress={() => Linking.openURL("mailto:contato@prontotecplus.app")}
          />
          <MenuItem
            icon="info"
            label="Sobre o ProntoTEC+"
            onPress={() => router.push("/about" as any)}
          />
        </View>

        {/* Legal */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>LEGAL</Text>
          <MenuItem
            icon="gavel"
            label="Termos de Uso"
            onPress={() => router.push("/legal/terms" as any)}
          />
          <MenuItem
            icon="cancel"
            label="Política de Cancelamento"
            onPress={() => router.push("/legal/cancellation" as any)}
          />
          {/* Termos legais específicos do técnico */}
          {isTecnico && (
            <>
              <MenuItem
                icon="photo-camera"
                label="Autorização de Uso de Imagem"
                subtitle="Uso de imagem do técnico pelo ProntoTEC+"
                onPress={() => Alert.alert(
                  "Autorização de Uso de Imagem",
                  "Ao se cadastrar como técnico no ProntoTEC+, você autoriza o uso da sua imagem (foto de perfil e fotos de serviços) para fins de divulgação profissional dentro da plataforma.\n\nEsta autorização é válida enquanto sua conta estiver ativa e pode ser revogada a qualquer momento mediante solicitação pelo e-mail contato@prontotecplus.app.",
                  [{ text: "Entendi", style: "default" }]
                )}
                color="#7C3AED"
              />
              <MenuItem
                icon="campaign"
                label="Autorização para Divulgação"
                subtitle="Divulgação de imagens e informações"
                onPress={() => Alert.alert(
                  "Autorização para Divulgação de Imagens e Informações",
                  "Ao utilizar o ProntoTEC+, você autoriza a divulgação das seguintes informações:\n\n• Nome e foto de perfil\n• Especialidades e serviços oferecidos\n• Avaliações e depoimentos de clientes\n• Fotos de serviços realizados (com autorização do cliente)\n\nEsta autorização tem como objetivo promover seu trabalho e conectar você a novos clientes dentro da plataforma.",
                  [{ text: "Entendi", style: "default" }]
                )}
                color="#0891B2"
              />
              <MenuItem
                icon="image"
                label="Cessão de Uso de Imagem"
                subtitle="Cessão de direitos de imagem ao ProntoTEC+"
                onPress={() => Alert.alert(
                  "Termo de Cessão de Uso de Imagem",
                  "Ao aceitar este termo, você cede ao ProntoTEC+ o direito de utilizar sua imagem e as imagens dos serviços realizados para:\n\n• Divulgação na plataforma\n• Materiais de marketing (com identificação do profissional)\n• Portfólio digital do técnico\n\nA cessão é gratuita, não exclusiva e pode ser revogada mediante solicitação formal.",
                  [{ text: "Entendi", style: "default" }]
                )}
                color="#059669"
              />
            </>
          )}
        </View>

        {/* Sair */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MenuItem icon="logout" label="Sair" onPress={() => {
            Alert.alert(
              "Sair da conta",
              "Tem certeza que deseja sair do ProntoTEC+?",
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/login" as any); } },
              ]
            );
          }} color="#EF4444" />
          <MenuItem icon="delete-forever" label="Excluir Minha Conta" onPress={() => {
            Alert.alert(
              "Excluir conta permanentemente",
              "Esta ação é irreversível. Todos os seus dados serão apagados definitivamente. Deseja continuar?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Excluir permanentemente",
                  style: "destructive",
                  onPress: async () => {
                    await deleteAccount();
                    router.replace("/auth/login" as any);
                  },
                },
              ]
            );
          }} color="#EF4444" />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>ProntoTEC+ v1.5.3</Text>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Conectando você ao técnico certo, na hora certa
          </Text>
          <Pressable onPress={() => Linking.openURL("mailto:contato@prontotecplus.app")}>
            <Text style={[styles.footerEmail, { color: "#1A3A5C" }]}>contato@prontotecplus.app</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal: Nome */}
      <EditModal
        visible={editingField === "name"}
        title="Editar Nome"
        value={user.name}
        placeholder="Seu nome completo"
        onSave={(val) => handleSaveField("name", val)}
        onClose={() => setEditingField(null)}
      />

      {/* Modal: Telefone */}
      <EditModal
        visible={editingField === "phone"}
        title="Editar Telefone / WhatsApp"
        value={user.phone || ""}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        onSave={(val) => handleSaveField("phone", val)}
        onClose={() => setEditingField(null)}
      />

      {/* Modal: Endereço */}
      <Modal
        visible={editingField === "address"}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, maxHeight: "90%" }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Endereço</Text>
            <Text style={[styles.addressPrivacyNote, { color: colors.muted, backgroundColor: colors.background }]}>
              🔒 Seu endereço completo só será compartilhado com o técnico após você aceitar um orçamento.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* CEP com busca automática */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>CEP</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0, flex: 1 }]}
                    value={addressForm.zipCode || ""}
                    onChangeText={(val) => {
                      const formatted = formatCEP(val);
                      setAddressForm((prev) => ({ ...prev, zipCode: formatted }));
                      fetchAddressByCEP(formatted);
                    }}
                    placeholder="00000-000"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    returnKeyType="next"
                    maxLength={9}
                  />
                  {cepLoading && (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Buscando...</Text>
                  )}
                </View>
              </View>
              {([
                { key: "street", label: "Rua / Avenida", placeholder: "Ex: Av. Rondon Pacheco", keyboard: "default" },
                { key: "number", label: "Número", placeholder: "Ex: 1234", keyboard: "numeric" },
                { key: "complement", label: "Complemento", placeholder: "Apto, sala, bloco (opcional)", keyboard: "default" },
                { key: "neighborhood", label: "Bairro *", placeholder: "Ex: Tibery", keyboard: "default" },
                { key: "city", label: "Cidade *", placeholder: "Ex: Uberlândia", keyboard: "default" },
                { key: "state", label: "Estado", placeholder: "Ex: MG", keyboard: "default" },
              ] as { key: keyof Address; label: string; placeholder: string; keyboard: string }[]).map(({ key, label, placeholder, keyboard }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginBottom: 0 }]}
                    value={(addressForm[key] as string) || ""}
                    onChangeText={(val) => setAddressForm((prev) => ({ ...prev, [key]: val }))}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    keyboardType={keyboard as any}
                    returnKeyType="next"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={[styles.modalButtons, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setEditingField(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: colors.muted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleSaveAddress}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 6,
  },
  avatarContainer: { position: "relative", marginBottom: 4 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#F5A623",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#F5A623",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F5A623",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: { color: "#fff", fontSize: 20, fontWeight: "700" },
  userEmail: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  clientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,166,35,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  clientBadgeText: { color: "#F5A623", fontSize: 12, fontWeight: "600" },
  section: {
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 15, fontWeight: "500" },
  menuSubtitle: { fontSize: 11, marginTop: 1 },
  footer: { alignItems: "center", paddingVertical: 24, gap: 4 },
  footerText: { fontSize: 12 },
  footerEmail: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  addressPrivacyNote: {
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  modalBtnPrimary: { backgroundColor: "#1A3A5C", borderColor: "#1A3A5C" },
  modalBtnText: { fontSize: 15, fontWeight: "600" },
});
