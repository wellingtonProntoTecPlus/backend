import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useColors } from "@/hooks/useColors";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { ServiceCategory } from "@/lib/types";
import { useAppContext } from "@/lib/app-context";
import { trpc } from "@/lib/trpc";
import { formatPhone, formatDocument, formatCEP } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/upload-image";

type Step = 1 | 2 | 3 | 4;

/**
 * Copia a imagem do cache temporário para o diretório permanente do app.
 * URIs do ImagePicker são temporárias e podem ser invalidadas ao reiniciar o app.
 */
async function saveImagePermanently(tempUri: string): Promise<string> {
  if (Platform.OS === "web") return tempUri;
  try {
    const filename = `profile_${Date.now()}.jpg`;
    const destUri = (FileSystem.documentDirectory ?? "") + filename;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch {
    // Fallback: retorna a URI original se a cópia falhar
    return tempUri;
  }
}

// Valida CPF (11 dígitos)
function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

// Valida CNPJ (14 dígitos)
function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calc = (d: string, weights: number[]) =>
    weights.reduce((s, w, i) => s + parseInt(d[i]) * w, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  return mod(calc(digits, w1)) === parseInt(digits[12]) &&
         mod(calc(digits, w2)) === parseInt(digits[13]);
}

export default function RegisterTechnicianScreen() {
  const colors = useColors();
  const { user, updateTechnicianProfile, setMode, setAuthUser, setAddress } = useAppContext();
  const registerMutation = trpc.technicians.register.useMutation();
  const updateProfileMutation = trpc.user.updateProfile.useMutation();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Dados pessoais — pré-preenchidos com dados do usuário logado
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [companyName, setCompanyName] = useState("");
  const [document, setDocument] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [city, setCity] = useState(user.address?.city || user.city || "");
  const [stateUF, setStateUF] = useState(user.address?.state || user.state || "MG");
  const [cep, setCep] = useState(user.address?.zipCode || "");
  const [street, setStreet] = useState(user.address?.street || "");
  const [addressNumber, setAddressNumber] = useState(user.address?.number || "");
  const [neighborhood, setNeighborhood] = useState(user.address?.neighborhood || "");
  const [cepLoading, setCepLoading] = useState(false);
  const [type, setType] = useState<"empresa" | "autonomo">("autonomo");

  // Logo da empresa
  const [logoUri, setLogoUri] = useState<string | null>(null);

  // Foto de perfil
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const fetchAddressByCEP = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setStateUF(data.uf || "");
        }
      } catch {}
      finally { setCepLoading(false); }
    }
  };

  // Step 2: Especialidades
  const [specialties, setSpecialties] = useState<ServiceCategory[]>([]);

  // Step 3: Contato
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  const toggleSpecialty = (id: ServiceCategory) => {
    setSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handlePickPhoto = () => {
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
              const persistedUri = await saveImagePermanently(result.assets[0].uri);
              setPhotoUri(persistedUri);
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
              const persistedUri = await saveImagePermanently(result.assets[0].uri);
              setPhotoUri(persistedUri);
            }
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handlePickLogo = async () => {
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
      const persistedUri = await saveImagePermanently(result.assets[0].uri);
      setLogoUri(persistedUri);
    }
  };

  const validateDocument = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) { setDocumentError(""); return true; }
    // Detectar automaticamente o tipo pelo número de dígitos
    if (digits.length > 11) {
      // CNPJ — mudar tipo para empresa automaticamente
      if (type !== "empresa") setType("empresa");
      if (digits.length === 14) {
        const valid = validateCNPJ(value);
        setDocumentError(valid ? "" : "CNPJ inválido");
        return valid;
      }
      return true; // ainda digitando
    } else {
      // CPF — manter como autônomo
      if (digits.length === 11) {
        const valid = validateCPF(value);
        setDocumentError(valid ? "" : "CPF inválido");
        return valid;
      }
      return true; // ainda digitando
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !city.trim()) {
        Alert.alert("Atenção", "Preencha os campos obrigatórios: Nome e Cidade.");
        return;
      }
      if (type === "empresa") {
        if (!companyName.trim()) {
          Alert.alert("Atenção", "Informe o nome da empresa.");
          return;
        }
        if (!logoUri) {
          Alert.alert("Atenção", "Adicione o logo da empresa.");
          return;
        }
        const docDigits = document.replace(/\D/g, "");
        if (docDigits.length !== 14) {
          Alert.alert("CNPJ obrigatório", "Informe o CNPJ completo da empresa (14 dígitos).");
          return;
        }
        if (!validateCNPJ(document)) {
          Alert.alert("CNPJ inválido", "O CNPJ informado não é válido. Verifique os dígitos e tente novamente.");
          return;
        }
      } else {
        const docDigits = document.replace(/\D/g, "");
        if (docDigits.length > 0 && docDigits.length === 11 && !validateCPF(document)) {
          Alert.alert("CPF inválido", "O CPF informado não é válido. Verifique e tente novamente.");
          return;
        }
      }
    }
    if (step === 2) {
      if (specialties.length === 0) {
        Alert.alert("Atenção", "Selecione ao menos uma especialidade.");
        return;
      }
    }
    if (step === 3) {
      if (!phone.trim()) {
        Alert.alert("Atenção", "Informe seu telefone de contato.");
        return;
      }
      if (type === "empresa" && !whatsapp.trim()) {
        Alert.alert("Atenção", "Informe o WhatsApp da empresa.");
        return;
      }
    }
    if (step < 4) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // ─── UPLOAD DE IMAGENS PARA S3 ────────────────────────────────────────
      let photoS3Url: string | null = null;
      let logoS3Url: string | null = null;

      if (photoUri) {
        console.log("[RegisterTechnician] Fazendo upload da foto...");
        photoS3Url = await uploadImageToS3(photoUri, "/api/technician/photo");
        if (photoS3Url) {
          console.log("[RegisterTechnician] Foto enviada para S3:", photoS3Url);
        } else {
          console.warn("[RegisterTechnician] Falha no upload da foto, usando URI local");
          photoS3Url = photoUri; // fallback para URI local
        }
      }

      if (logoUri) {
        console.log("[RegisterTechnician] Fazendo upload da logo...");
        logoS3Url = await uploadImageToS3(logoUri, "/api/technician/logo");
        if (logoS3Url) {
          console.log("[RegisterTechnician] Logo enviada para S3:", logoS3Url);
        } else {
          console.warn("[RegisterTechnician] Falha no upload da logo, usando URI local");
          logoS3Url = logoUri; // fallback para URI local
        }
      }

      // Tentar salvar no servidor primeiro
      let serverId: number | null = null;
      try {
        const result = await registerMutation.mutateAsync({
          name: name.trim(),
          companyName: companyName.trim() || undefined,
          document: document.trim() || undefined,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          description: description.trim(),
          city: city.trim(),
          state: stateUF.trim(),
          addressStreet: street.trim() || undefined,
          addressNumber: addressNumber.trim() || undefined,
          addressNeighborhood: neighborhood.trim() || undefined,
          addressZipCode: cep.trim() || undefined,
          type,
          specialties,
          photoUri: photoS3Url || undefined,
          avatarUrl: photoS3Url || undefined,
          companyLogoUrl: logoS3Url || undefined,
        });
        serverId = result.id;
      } catch (serverErr) {
        console.warn("[RegisterTechnician] Servidor indisponível, salvando localmente:", serverErr);
      }

      // Sempre salvar localmente como fallback
      const profile = {
        id: serverId ? `server_${serverId}` : `tech_${Date.now()}`,
        name: name.trim(),
        companyName: companyName.trim() || name.trim(),
        document: document.trim(),
        city: city.trim(),
        state: stateUF.trim(),
        address: {
          street: street.trim(),
          number: addressNumber.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: stateUF.trim(),
          zipCode: cep.trim(),
        },
        type,
        badge: "autonomo" as const,
        level: "autonomo" as const,
        avatar: photoS3Url || photoUri || "",
        companyLogoUrl: logoS3Url || logoUri || undefined,
        totalServices: 0,
        yearsExperience: 0,
        workPhotos: [],
        specialties,
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        description: description.trim(),
        photoUri: photoS3Url || photoUri || undefined,
        rating: 5.0,
        totalReviews: 0,
        reviews: [],
        planType: "gratuito" as const,
        availability: "disponivel" as const,
      };

      updateTechnicianProfile(profile as any);
      setMode("tecnico");

      // ─── REPLICAR DADOS DO TÉCNICO PARA O PERFIL DO USUÁRIO ───────────────
      // Garante que telefone, endereço e cidade apareçam em "Minha Conta"
      const addressData = {
        street: street.trim(),
        number: addressNumber.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: stateUF.trim(),
        zipCode: cep.trim(),
      };

      // 1. Atualiza o contexto local imediatamente (aparece na tela sem recarregar)
      setAuthUser({
        email: "", // não altera o email
        phone: phone.trim(),
        city: city.trim(),
        state: stateUF.trim(),
        addressStreet: street.trim(),
        addressNumber: addressNumber.trim(),
        addressNeighborhood: neighborhood.trim(),
        addressZipCode: cep.trim(),
      });
      setAddress(addressData);

      // 2. Persiste no servidor (salva no banco para restaurar após logout)
      try {
        await updateProfileMutation.mutateAsync({
          phone: phone.trim(),
          city: city.trim(),
          state: stateUF.trim(),
          addressStreet: street.trim() || undefined,
          addressNumber: addressNumber.trim() || undefined,
          addressNeighborhood: neighborhood.trim() || undefined,
          addressZipCode: cep.trim() || undefined,
        });
        console.log("[RegisterTechnician] Dados replicados ao perfil do usuário com sucesso");
      } catch (syncErr) {
        console.warn("[RegisterTechnician] Falha ao replicar dados ao servidor:", syncErr);
        // Não bloqueia o fluxo — dados já estão salvos localmente
      }

      Alert.alert(
        "Cadastro Salvo!",
        serverId
          ? "Seu perfil foi cadastrado no servidor. Clientes já podem encontrar você!"
          : "Seu perfil foi salvo localmente. Conecte-se à internet para sincronizar.",
        [{ text: "Ir para o Início", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o cadastro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Dados" },
    { id: 2, label: "Serviços" },
    { id: 3, label: "Contato" },
    { id: 4, label: "Revisão" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A6B" }]}>
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep((prev) => (prev - 1) as Step) : router.back())}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar como Técnico</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Steps */}
      <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {steps.map((s, index) => (
          <React.Fragment key={s.id}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor: step >= s.id ? "#1A3A6B" : colors.border,
                    borderColor: step >= s.id ? "#1A3A6B" : colors.border,
                  },
                ]}
              >
                {step > s.id ? (
                  <MaterialIcons name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumber, { color: step >= s.id ? "#fff" : colors.muted }]}>
                    {s.id}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: step >= s.id ? "#1A3A6B" : colors.muted }]}>
                {s.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: step > s.id ? "#1A3A6B" : colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step 1: Dados Pessoais */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Dados Pessoais</Text>

            {/* Tipo de Cadastro — primeiro campo */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Tipo de Cadastro <Text style={{ color: "#EF4444" }}>*</Text></Text>
              <View style={styles.typeRow}>
                {(["autonomo", "empresa"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    activeOpacity={0.8}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: type === t ? "#1A3A6B" : colors.surface,
                        borderColor: type === t ? "#1A3A6B" : colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={t === "empresa" ? "business" : "person"}
                      size={20}
                      color={type === t ? "#fff" : colors.muted}
                    />
                    <Text style={[styles.typeOptionText, { color: type === t ? "#fff" : colors.foreground }]}>
                      {t === "empresa" ? "Empresa" : "Autônomo"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Foto de Perfil */}
            <View style={[styles.field, { alignItems: "center" }]}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                style={[styles.photoButton, { borderColor: photoUri ? "#1A3A6B" : colors.border, backgroundColor: colors.surface }]}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color={colors.muted} />
                    <Text style={[styles.photoPlaceholderText, { color: colors.muted }]}>Adicionar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {photoUri && (
                <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginTop: 6 }}>
                  <Text style={{ color: "#EF4444", fontSize: 12 }}>Remover foto</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* E-mail */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>E-mail</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="seu@email.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>



            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Nome Completo <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Seu nome completo"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {type === "empresa" && (
              <>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome da Empresa <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Razão social ou nome fantasia"
                  placeholderTextColor={colors.muted}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
              {/* Logo da Empresa */}
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Logo da Empresa <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <TouchableOpacity
                  onPress={handlePickLogo}
                  activeOpacity={0.8}
                  style={[styles.photoButton, { borderColor: logoUri ? "#1A3A6B" : colors.border, backgroundColor: colors.surface, width: 100, height: 100 }]}
                >
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={{ width: 96, height: 96, borderRadius: 12 }} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <MaterialIcons name="add-photo-alternate" size={28} color={colors.muted} />
                      <Text style={[styles.photoPlaceholderText, { color: colors.muted, fontSize: 11 }]}>Logo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {logoUri && (
                  <TouchableOpacity onPress={() => setLogoUri(null)} style={{ marginTop: 4 }}>
                    <Text style={{ color: "#EF4444", fontSize: 12 }}>Remover logo</Text>
                  </TouchableOpacity>
                )}
              </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                {type === "empresa" ? "CNPJ" : "CPF"} {type === "empresa" && <Text style={{ color: "#EF4444" }}>*</Text>}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: documentError ? "#EF4444" : colors.border, color: colors.foreground }]}
                placeholder={type === "empresa" ? "00.000.000/0001-00" : "000.000.000-00"}
                placeholderTextColor={colors.muted}
                value={document}
                onChangeText={(v) => { const f = formatDocument(v); setDocument(f); validateDocument(f); }}
                keyboardType="numeric"
                maxLength={18}
              />
              {documentError ? (
                <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{documentError}</Text>
              ) : document.replace(/\D/g, "").length >= (type === "empresa" ? 14 : 11) ? (
                <Text style={{ color: "#22C55E", fontSize: 12, marginTop: 4 }}>\u2713 {type === "empresa" ? "CNPJ" : "CPF"} válido</Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>CEP</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="00000-000"
                  placeholderTextColor={colors.muted}
                  value={cep}
                  onChangeText={(v) => { const f = formatCEP(v); setCep(f); fetchAddressByCEP(f); }}
                  keyboardType="numeric"
                  maxLength={9}
                />
                {cepLoading && <ActivityIndicator size="small" color="#1A3A6B" style={{ marginLeft: 8 }} />}
              </View>
            </View>

             <View style={styles.row}>
              <View style={[styles.field, { flex: 3 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Rua / Logradouro</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Nome da rua"
                  placeholderTextColor={colors.muted}
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Número</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Nº"
                  placeholderTextColor={colors.muted}
                  value={addressNumber}
                  onChangeText={setAddressNumber}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Bairro</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Seu bairro"
                placeholderTextColor={colors.muted}
                value={neighborhood}
                onChangeText={setNeighborhood}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 2 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  Cidade <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Sua cidade"
                  placeholderTextColor={colors.muted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Estado</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="UF"
                  placeholderTextColor={colors.muted}
                  value={stateUF}
                  onChangeText={setStateUF}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Especialidades */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Especialidades</Text>
            <Text style={[styles.stepSubtitle, { color: colors.muted }]}>
              Selecione os serviços que você oferece
            </Text>
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
                    <MaterialIcons name={cat.icon as any} size={28} color={cat.color} />
                    <Text style={[styles.specialtyLabel, { color: isSelected ? cat.color : colors.foreground }]}>
                      {cat.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkMark, { backgroundColor: cat.color }]}>
                        <MaterialIcons name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.selectedCount, { color: colors.muted }]}>
              {specialties.length} especialidade{specialties.length !== 1 ? "s" : ""} selecionada{specialties.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* Step 3: Contato */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Informações de Contato</Text>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Telefone <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={(v) => setPhone(formatPhone(v))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                WhatsApp{type === "empresa" && <Text style={{ color: "#EF4444" }}> *</Text>}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.muted}
                value={whatsapp}
                onChangeText={(v) => setWhatsapp(formatPhone(v))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Descrição do Serviço</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Descreva sua empresa e os serviços que oferece..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                maxLength={300}
              />
            </View>
          </View>
        )}

        {/* Step 4: Revisão */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Revisão do Cadastro</Text>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {photoUri && (
                <View style={[styles.reviewRow, { justifyContent: "center", paddingVertical: 16 }]}>
                  <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                </View>
              )}
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.muted }]}>Nome</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{name}</Text>
              </View>
              {companyName ? (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Empresa</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{companyName}</Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.muted }]}>Tipo</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>
                  {type === "empresa" ? "Empresa" : "Autônomo"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.muted }]}>Cidade</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{city}{stateUF ? `, ${stateUF}` : ""}</Text>
              </View>
              {street ? (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Endereço</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>
                    {street}{addressNumber ? `, ${addressNumber}` : ""}{neighborhood ? ` - ${neighborhood}` : ""}
                  </Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.muted }]}>Telefone</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{phone}</Text>
              </View>
              <View style={[styles.reviewRow, { alignItems: "flex-start" }]}>
                <Text style={[styles.reviewLabel, { color: colors.muted }]}>Especialidades</Text>
                <View style={styles.reviewSpecialties}>
                  {specialties.map((s) => {
                    const cat = SERVICE_CATEGORIES.find((c) => c.id === s);
                    return (
                      <View key={s} style={[styles.reviewChip, { backgroundColor: (cat?.color || "#6B7280") + "20" }]}>
                        <Text style={[styles.reviewChipText, { color: cat?.color || "#6B7280" }]}>
                          {cat?.label || s}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={[styles.infoBox, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
              <MaterialIcons name="verified" size={18} color="#10B981" />
              <Text style={[styles.infoText, { color: "#10B981" }]}>
                Após o cadastro, você receberá o selo "Profissional Autônomo" e poderá receber solicitações de clientes.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Botão de Ação */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {step === 4 && (
          <TouchableOpacity
            onPress={() => setStep(1)}
            activeOpacity={0.85}
            style={[styles.actionButton, { backgroundColor: "#6B7280", flex: 0, paddingHorizontal: 20, marginRight: 8 }]}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Corrigir</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={step < 4 ? handleNext : handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
          style={[styles.actionButton, { backgroundColor: "#1A3A6B", opacity: submitting ? 0.7 : 1 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.actionButtonText}>
                {step < 4 ? "Próximo" : "Finalizar Cadastro"}
              </Text>
              <MaterialIcons name={step < 4 ? "arrow-forward" : "check"} size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
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
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    marginBottom: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  stepSubtitle: {
    fontSize: 14,
    marginTop: -8,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  typeOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  specialtiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specialtyOption: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    position: "relative",
  },
  specialtyLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  checkMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCount: {
    fontSize: 13,
    textAlign: "center",
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 10,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 90,
  },
  reviewValue: {
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },
  reviewSpecialties: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  reviewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reviewChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  photoButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
