import React, { useState } from "react";
import * as Auth from "@/lib/_core/auth";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { getApiBaseUrl } from "@/constants/oauth";
import { SERVICE_CATEGORIES } from "@/lib/mock-data";
import { ServiceCategory } from "@/lib/types";
import { trpc } from "@/lib/trpc";
import { formatPhone, formatDocument, formatCEP } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/upload-image";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function saveImagePermanently(tempUri: string): Promise<string> {
  if (Platform.OS === "web") return tempUri;
  try {
    const filename = `profile_${Date.now()}.jpg`;
    const destUri = (FileSystem.documentDirectory ?? "") + filename;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch {
    return tempUri;
  }
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (s: string, w: number[]) => w.reduce((acc, v, i) => acc + parseInt(s[i]) * v, 0);
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r; };
  return mod(calc(d, [5,4,3,2,9,8,7,6,5,4,3,2])) === parseInt(d[12]) &&
         mod(calc(d, [6,5,4,3,2,9,8,7,6,5,4,3,2])) === parseInt(d[13]);
}

// ─── Step types ───────────────────────────────────────────────────────────────
// "choose"   → escolha entre Empresa ou Autônomo (primeira tela)
// "form"     → dados da conta (campos variam por tipo)
// "code"     → verificação de e-mail
// "photo"    → upload de foto/logo
// "services" → especialidades
// "contact"  → contato
// "review"   → revisão final
type Step = "choose" | "form" | "code" | "photo" | "services" | "contact" | "review";
type AccountType = "empresa" | "autonomo" | null;

export default function RegisterScreen() {
  const colors = useColors();
  const { setAuthUser, updateTechnicianProfile, setMode, setAddress } = useAppContext();
  const registerMutation = trpc.technicians.register.useMutation();
  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  // ─── Step e tipo ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("choose");
  const [accountType, setAccountType] = useState<AccountType>(null);

  // ─── Campos comuns ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");         // Nome do responsável (empresa) ou nome do técnico (autônomo)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");

  // ─── Campos de empresa ──────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");   // Razão social / nome fantasia
  const [cnpj, setCnpj] = useState("");

  // ─── Campos de autônomo ─────────────────────────────────────────────────────
  const [cpf, setCpf] = useState("");

  // ─── Endereço (compartilhado) ────────────────────────────────────────────────
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  // ─── Foto / Logo ─────────────────────────────────────────────────────────────
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // ─── Especialidades ──────────────────────────────────────────────────────────
  const [specialties, setSpecialties] = useState<ServiceCategory[]>([]);

  // ─── Contato técnico ─────────────────────────────────────────────────────────
  const [techPhone, setTechPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  // ─── Submissão ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ─── Google Auth ─────────────────────────────────────────────────────────────
  const [, , promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "email", "profile"],
  });

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type === "success" && result.authentication?.accessToken) {
        const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";
        const res = await fetch(`${apiBase}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: result.authentication.accessToken }),
        });
        const data = await res.json();
        if (!res.ok) { Alert.alert("Erro", data.error || "Não foi possível autenticar com Google."); return; }
        if (data.app_session_id) {
          await AsyncStorage.setItem("@prontotec:session_token", data.app_session_id);
          await Auth.setSessionToken(data.app_session_id);
        }
        await AsyncStorage.setItem("@prontotec:authenticated", "true");
        await AsyncStorage.setItem("@prontotec:user_email", data.email || "");
        await AsyncStorage.setItem("@prontotec:user_name", data.name || "");
        await AsyncStorage.setItem("@prontotec:user_profile", "client");
        setAuthUser({ email: data.email || "", name: data.name || "" });
        router.replace("/(tabs)" as any);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível autenticar com Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── CEP lookup ──────────────────────────────────────────────────────────────
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

  // ─── Validação do formulário de cadastro ─────────────────────────────────────
  const validateForm = (): boolean => {
    if (!name.trim()) { Alert.alert("Atenção", "Informe o nome do responsável."); return false; }
    if (!email.trim() || !email.includes("@")) { Alert.alert("Atenção", "Informe um e-mail válido."); return false; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { Alert.alert("Atenção", "Informe um telefone/WhatsApp válido."); return false; }

    if (accountType === "empresa") {
      if (!companyName.trim()) { Alert.alert("Atenção", "Informe a Razão Social ou Nome Fantasia da empresa."); return false; }
      const cnpjDigits = cnpj.replace(/\D/g, "");
      if (cnpjDigits.length !== 14) { Alert.alert("CNPJ obrigatório", "Informe o CNPJ completo (14 dígitos)."); return false; }
      if (!validateCNPJ(cnpj)) { Alert.alert("CNPJ inválido", "O CNPJ informado não é válido. Verifique os dígitos."); return false; }
    } else {
      const cpfDigits = cpf.replace(/\D/g, "");
      if (cpfDigits.length > 0 && cpfDigits.length === 11 && !validateCPF(cpf)) {
        Alert.alert("CPF inválido", "O CPF informado não é válido. Verifique e tente novamente."); return false;
      }
    }

    if (!acceptedTerms) { Alert.alert("Termos de Uso", "Você precisa aceitar os Termos de Uso para continuar."); return false; }
    return true;
  };

  // ─── Enviar código de verificação ────────────────────────────────────────────
  const handleSendCode = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";

      // Verificar duplicação antes de enviar código
      const checkRes = await fetch(`${apiBase}/api/auth/check-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.replace(/\D/g, ""),
          document: accountType === "empresa" ? cnpj.replace(/\D/g, "") : cpf.replace(/\D/g, ""),
        }),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.duplicate) {
          Alert.alert(
            "Cadastro já existente",
            checkData.message || "Já existe um cadastro com este e-mail, CPF/CNPJ ou telefone. Se esqueceu sua senha, use a opção 'Entrar'."
          );
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`${apiBase}/api/auth/email/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Erro", data.error || "Não foi possível enviar o código."); return; }
      setStep("code");
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Verificar código ─────────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) { Alert.alert("Código inválido", "O código deve ter 6 dígitos."); return; }
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";
      const res = await fetch(`${apiBase}/api/auth/email/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: trimmedCode }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Erro", data.error || "Código inválido. Tente novamente."); return; }

      // Salvar sessão
      if (data.app_session_id) {
        await AsyncStorage.setItem("@prontotec:session_token", data.app_session_id);
        await Auth.setSessionToken(data.app_session_id);
      }
      await AsyncStorage.setItem("@prontotec:authenticated", "true");
      await AsyncStorage.setItem("@prontotec:user_email", email.trim().toLowerCase());
      await AsyncStorage.setItem("@prontotec:user_name", name.trim());
      await AsyncStorage.setItem("@prontotec:user_city", city.trim());
      await AsyncStorage.setItem("@prontotec:user_phone", phone);
      await AsyncStorage.setItem("@prontotec:user_profile", "technician");

      setAuthUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        city: city.trim(),
        phone,
        // ID numérico do servidor — essencial para comparar senderId no chat
        serverId: data.user?.id ?? undefined,
      });

      // Pré-preencher contato com o telefone informado
      setTechPhone(phone);
      setWhatsapp(phone);

      // Avançar para upload de foto/logo
      setStep("photo");
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Pick photo / logo ────────────────────────────────────────────────────────
  const handlePickPhoto = () => {
    const isEmpresa = accountType === "empresa";
    Alert.alert(
      isEmpresa ? "Logo da Empresa" : "Foto de Perfil",
      "Escolha uma opção",
      [
        {
          text: "Câmera",
          onPress: async () => {
            if (Platform.OS !== "web") {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== "granted") { Alert.alert("Permissão negada", "Permita o acesso à câmera."); return; }
            }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1,1], quality: 0.8 });
            if (!result.canceled && result.assets[0]) setPhotoUri(await saveImagePermanently(result.assets[0].uri));
          },
        },
        {
          text: "Galeria",
          onPress: async () => {
            if (Platform.OS !== "web") {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") { Alert.alert("Permissão negada", "Permita o acesso à galeria."); return; }
            }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1,1], quality: 0.8 });
            if (!result.canceled && result.assets[0]) setPhotoUri(await saveImagePermanently(result.assets[0].uri));
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const toggleSpecialty = (id: ServiceCategory) => {
    setSpecialties((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  // ─── Navegação entre etapas ───────────────────────────────────────────────────
  const handleNext = () => {
    if (step === "photo") {
      if (accountType === "empresa" && !photoUri) {
        Alert.alert("Logo obrigatória", "Adicione a logo da empresa para continuar.");
        return;
      }
      setStep("services");
    } else if (step === "services") {
      if (specialties.length === 0) { Alert.alert("Atenção", "Selecione ao menos uma especialidade."); return; }
      setStep("contact");
    } else if (step === "contact") {
      if (!techPhone.trim()) { Alert.alert("Atenção", "Informe o telefone de contato."); return; }
      if (accountType === "empresa" && !whatsapp.trim()) { Alert.alert("Atenção", "Informe o WhatsApp da empresa."); return; }
      setStep("review");
    }
  };

  const handleBack = () => {
    if (step === "form") setStep("choose");
    else if (step === "code") setStep("form");
    else if (step === "photo") setStep("code");
    else if (step === "services") setStep("photo");
    else if (step === "contact") setStep("services");
    else if (step === "review") setStep("contact");
  };

  // ─── Submeter cadastro ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let photoS3Url: string | null = null;

      if (photoUri) {
        photoS3Url = await uploadImageToS3(photoUri, "/api/technician/photo");
        if (!photoS3Url) photoS3Url = photoUri;
      }

      const document = accountType === "empresa" ? cnpj.trim() : cpf.trim();

      let serverId: number | null = null;
      try {
        const result = await registerMutation.mutateAsync({
          name: name.trim(),
          companyName: accountType === "empresa" ? companyName.trim() : undefined,
          document: document || undefined,
          phone: techPhone.trim(),
          whatsapp: whatsapp.trim() || techPhone.trim(),
          description: description.trim(),
          city: city.trim(),
          state: stateUF.trim(),
          addressStreet: street.trim() || undefined,
          addressNumber: addressNumber.trim() || undefined,
          addressNeighborhood: neighborhood.trim() || undefined,
          addressZipCode: cep.trim() || undefined,
          type: accountType === "empresa" ? "empresa" : "autonomo",
          specialties,
          photoUri: photoS3Url || undefined,
          avatarUrl: photoS3Url || undefined,
          companyLogoUrl: accountType === "empresa" ? (photoS3Url || photoUri || undefined) : undefined,
        });
        serverId = result.id;
      } catch (serverErr) {
        console.warn("[Register] Servidor indisponível, salvando localmente:", serverErr);
      }

      const profile = {
        id: serverId ? `server_${serverId}` : `tech_${Date.now()}`,
        name: name.trim(),
        companyName: accountType === "empresa" ? companyName.trim() : name.trim(),
        document: document,
        city: city.trim(),
        state: stateUF.trim(),
        address: { street: street.trim(), number: addressNumber.trim(), neighborhood: neighborhood.trim(), city: city.trim(), state: stateUF.trim(), zipCode: cep.trim() },
        type: accountType === "empresa" ? "empresa" as const : "autonomo" as const,
        badge: accountType === "empresa" ? "verificado" as const : "autonomo" as const,
        level: accountType === "empresa" ? "empresa_verificada" as const : "autonomo" as const,
        avatar: photoS3Url || photoUri || "",
        companyLogoUrl: accountType === "empresa" ? (photoS3Url || photoUri || undefined) : undefined,
        totalServices: 0,
        yearsExperience: 0,
        workPhotos: [],
        specialties,
        phone: techPhone.trim(),
        whatsapp: whatsapp.trim() || techPhone.trim(),
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

      const addressData = { street: street.trim(), number: addressNumber.trim(), neighborhood: neighborhood.trim(), city: city.trim(), state: stateUF.trim(), zipCode: cep.trim() };
      setAuthUser({ email: email.trim().toLowerCase(), phone: techPhone.trim(), city: city.trim(), state: stateUF.trim(), addressStreet: street.trim(), addressNumber: addressNumber.trim(), addressNeighborhood: neighborhood.trim(), addressZipCode: cep.trim() });
      setAddress(addressData);

      try {
        await updateProfileMutation.mutateAsync({
          phone: techPhone.trim(), city: city.trim(), state: stateUF.trim(),
          addressStreet: street.trim() || undefined, addressNumber: addressNumber.trim() || undefined,
          addressNeighborhood: neighborhood.trim() || undefined, addressZipCode: cep.trim() || undefined,
        });
      } catch {}

      Alert.alert(
        "Cadastro Concluído!",
        serverId ? "Seu perfil foi cadastrado com sucesso! Clientes já podem encontrar você." : "Seu perfil foi salvo localmente. Conecte-se à internet para sincronizar.",
        [{ text: "Ir para o Início", onPress: () => router.replace("/(tabs)") }]
      );
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o cadastro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Progress steps ───────────────────────────────────────────────────────────
  const progressSteps = [
    { id: "photo", label: accountType === "empresa" ? "Logo" : "Foto" },
    { id: "services", label: "Serviços" },
    { id: "contact", label: "Contato" },
    { id: "review", label: "Revisão" },
  ];
  const progressStepIds = progressSteps.map((s) => s.id);
  const currentProgressIdx = progressStepIds.indexOf(step);
  const isProgressStep = currentProgressIdx >= 0;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* ── Header ── */}
        {isProgressStep ? (
          <>
            <View style={[styles.techHeader, { backgroundColor: "#1A3A6B" }]}>
              <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.techHeaderTitle}>
                {accountType === "empresa" ? "Cadastro da Empresa" : "Cadastro do Técnico"}
              </Text>
              <View style={{ width: 40 }} />
            </View>
            {/* Progress bar */}
            <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              {progressSteps.map((s, index) => {
                const idx = progressStepIds.indexOf(s.id);
                const done = currentProgressIdx > idx;
                const active = currentProgressIdx === idx;
                return (
                  <React.Fragment key={s.id}>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepCircle, { backgroundColor: active || done ? "#1A3A6B" : colors.border, borderColor: active || done ? "#1A3A6B" : colors.border }]}>
                        {done
                          ? <MaterialIcons name="check" size={14} color="#fff" />
                          : <Text style={[styles.stepNumber, { color: active || done ? "#fff" : colors.muted }]}>{index + 1}</Text>
                        }
                      </View>
                      <Text style={[styles.stepLabel, { color: active || done ? "#1A3A6B" : colors.muted }]}>{s.label}</Text>
                    </View>
                    {index < progressSteps.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: done ? "#1A3A6B" : colors.border }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </>
        ) : (
          <View style={[styles.header, { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }]}>
            <TouchableOpacity
              onPress={() => step === "code" ? setStep("form") : step === "form" ? setStep("choose") : router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#1A3A5C" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: "#1A3A5C" }]}>
                {step === "choose" ? "Primeiro Acesso" : step === "form" ? (accountType === "empresa" ? "Dados da Empresa" : "Dados do Técnico") : "Verificar E-mail"}
              </Text>
              <Text style={[styles.headerSub, { color: colors.muted }]}>
                {step === "choose" ? "Como deseja se cadastrar?" : step === "form" ? "Preencha seus dados" : "Confirme seu e-mail"}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={isProgressStep ? styles.techContent : styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: CHOOSE — escolha entre Empresa ou Autônomo
          ══════════════════════════════════════════════════════════════════ */}
          {step === "choose" && (
            <>
              {/* Google (apenas para clientes — técnicos precisam de CPF/CNPJ) */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: "center", marginBottom: 8 }]}>
                  Como você quer se cadastrar?
                </Text>
                <Text style={[styles.cardSub, { color: colors.muted, textAlign: "center", marginBottom: 20 }]}>
                  Escolha o tipo de cadastro para continuar
                </Text>

                {/* Empresa */}
                <TouchableOpacity
                  onPress={() => { setAccountType("empresa"); setStep("form"); }}
                  style={[styles.choiceCard, { backgroundColor: "#1A3A6B", borderColor: "#1A3A6B" }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.choiceIcon}>
                    <MaterialIcons name="business" size={32} color="#fff" />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={[styles.choiceTitle, { color: "#fff" }]}>Empresa</Text>
                    <Text style={[styles.choiceSub, { color: "rgba(255,255,255,0.8)" }]}>
                      Tenho uma empresa de segurança eletrônica
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <View style={{ height: 12 }} />

                {/* Autônomo */}
                <TouchableOpacity
                  onPress={() => { setAccountType("autonomo"); setStep("form"); }}
                  style={[styles.choiceCard, { backgroundColor: "#F5A623", borderColor: "#F5A623" }]}
                  activeOpacity={0.85}
                >
                  <View style={styles.choiceIcon}>
                    <MaterialIcons name="engineering" size={32} color="#fff" />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={[styles.choiceTitle, { color: "#fff" }]}>Autônomo</Text>
                    <Text style={[styles.choiceSub, { color: "rgba(255,255,255,0.9)" }]}>
                      Sou técnico independente / prestador de serviços
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <View style={[styles.dividerRow, { marginTop: 24, marginBottom: 8 }]}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.muted }]}>ou</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                {/* Sou cliente */}
                <TouchableOpacity
                  onPress={() => router.push("/auth/register-client" as any)}
                  style={[styles.clientCard]}
                  activeOpacity={0.85}
                >
                  <View style={styles.clientCardIcon}>
                    <MaterialIcons name="search" size={28} color="#1A3A5C" />
                  </View>
                  <View style={styles.clientCardText}>
                    <Text style={styles.clientCardTitle}>Sou cliente</Text>
                    <Text style={styles.clientCardSub}>Quero encontrar um técnico de segurança</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#1A3A5C" />
                </TouchableOpacity>
              </View>

              <View style={styles.loginWrap}>
                <Text style={[styles.loginText, { color: colors.muted }]}>Já tem uma conta?</Text>
                <TouchableOpacity onPress={() => router.push("/auth/login" as any)} activeOpacity={0.7}>
                  <Text style={[styles.loginLink, { color: "#1A3A5C" }]}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: FORM — dados da conta (empresa ou autônomo)
          ══════════════════════════════════════════════════════════════════ */}
          {step === "form" && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

              {/* Badge do tipo */}
              <View style={[styles.typeBadge, { backgroundColor: accountType === "empresa" ? "#1A3A6B" : "#F5A623" }]}>
                <MaterialIcons name={accountType === "empresa" ? "business" : "engineering"} size={16} color="#fff" />
                <Text style={styles.typeBadgeText}>{accountType === "empresa" ? "Empresa" : "Autônomo"}</Text>
              </View>

              {/* Nome do responsável */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  {accountType === "empresa" ? "Nome do Responsável *" : "Nome Completo *"}
                </Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="person" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={accountType === "empresa" ? "Nome do responsável pela empresa" : "Seu nome completo"}
                    placeholderTextColor={colors.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Campos exclusivos de Empresa */}
              {accountType === "empresa" && (
                <>
                  <View style={styles.fieldWrap}>
                    <Text style={[styles.label, { color: colors.muted }]}>Razão Social / Nome Fantasia *</Text>
                    <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <MaterialIcons name="business" size={18} color={colors.muted} />
                      <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        placeholder="Nome da empresa"
                        placeholderTextColor={colors.muted}
                        value={companyName}
                        onChangeText={setCompanyName}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={[styles.label, { color: colors.muted }]}>CNPJ *</Text>
                    <View style={[styles.inputWrap, { borderColor: documentError ? "#EF4444" : colors.border, backgroundColor: colors.background }]}>
                      <MaterialIcons name="badge" size={18} color={colors.muted} />
                      <TextInput
                        style={[styles.input, { color: colors.foreground }]}
                        placeholder="00.000.000/0001-00"
                        placeholderTextColor={colors.muted}
                        value={cnpj}
                        onChangeText={(v) => {
                          const f = formatDocument(v);
                          setCnpj(f);
                          const digits = f.replace(/\D/g, "");
                          if (digits.length === 14) {
                            setDocumentError(validateCNPJ(f) ? "" : "CNPJ inválido");
                          } else {
                            setDocumentError("");
                          }
                        }}
                        keyboardType="numeric"
                        maxLength={18}
                        returnKeyType="next"
                      />
                    </View>
                    {documentError ? (
                      <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{documentError}</Text>
                    ) : cnpj.replace(/\D/g, "").length === 14 ? (
                      <Text style={{ color: "#22C55E", fontSize: 12, marginTop: 4 }}>✓ CNPJ válido</Text>
                    ) : null}
                  </View>
                </>
              )}

              {/* CPF (apenas autônomo) */}
              {accountType === "autonomo" && (
                <View style={styles.fieldWrap}>
                  <Text style={[styles.label, { color: colors.muted }]}>CPF</Text>
                  <View style={[styles.inputWrap, { borderColor: documentError ? "#EF4444" : colors.border, backgroundColor: colors.background }]}>
                    <MaterialIcons name="badge" size={18} color={colors.muted} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="000.000.000-00"
                      placeholderTextColor={colors.muted}
                      value={cpf}
                      onChangeText={(v) => {
                        const f = formatDocument(v);
                        setCpf(f);
                        const digits = f.replace(/\D/g, "");
                        if (digits.length === 11) {
                          setDocumentError(validateCPF(f) ? "" : "CPF inválido");
                        } else {
                          setDocumentError("");
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={14}
                      returnKeyType="next"
                    />
                  </View>
                  {documentError ? (
                    <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{documentError}</Text>
                  ) : cpf.replace(/\D/g, "").length === 11 ? (
                    <Text style={{ color: "#22C55E", fontSize: 12, marginTop: 4 }}>✓ CPF válido</Text>
                  ) : null}
                </View>
              )}

              {/* E-mail */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>E-mail *</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="email" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder={accountType === "empresa" ? "email@empresa.com.br" : "seu@email.com"}
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* CEP */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>CEP *</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="location-on" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="00000-000"
                    placeholderTextColor={colors.muted}
                    value={cep}
                    onChangeText={(v) => { const f = formatCEP(v); setCep(f); fetchAddressByCEP(f); }}
                    keyboardType="numeric"
                    maxLength={9}
                    returnKeyType="next"
                  />
                  {cepLoading && <ActivityIndicator size="small" color="#1A3A6B" />}
                </View>
              </View>

              {/* Endereço preenchido automaticamente */}
              {(street || city) ? (
                <View style={[styles.addressPreview, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <MaterialIcons name="check-circle" size={16} color="#3B82F6" />
                  <Text style={{ color: "#1D4ED8", fontSize: 13, flex: 1, marginLeft: 6 }}>
                    {[street, addressNumber, neighborhood, city, stateUF].filter(Boolean).join(", ")}
                  </Text>
                </View>
              ) : null}

              {/* Contato */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>
                  {accountType === "empresa" ? "Contato da Empresa *" : "Telefone / WhatsApp *"}
                </Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="phone" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={colors.muted}
                    value={phone}
                    onChangeText={(t) => setPhone(formatPhone(t))}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Termos */}
              <TouchableOpacity onPress={() => setAcceptedTerms(!acceptedTerms)} style={styles.termsRow} activeOpacity={0.8}>
                <View style={[styles.checkbox, { backgroundColor: acceptedTerms ? "#1A3A5C" : colors.background, borderColor: acceptedTerms ? "#1A3A5C" : colors.border }]}>
                  {acceptedTerms && <MaterialIcons name="check" size={14} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.muted }]}>
                  Aceito os{" "}<Text style={{ color: "#1A3A5C", fontWeight: "700" }}>Termos de Uso</Text>{" "}e a{" "}<Text style={{ color: "#1A3A5C", fontWeight: "700" }}>Política de Privacidade</Text>
                </Text>
              </TouchableOpacity>

              {/* Botão */}
              <TouchableOpacity
                onPress={handleSendCode}
                disabled={loading || googleLoading}
                style={[styles.btn, { backgroundColor: accountType === "empresa" ? "#1A3A5C" : "#F5A623", opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.btnText}>Enviar código de verificação</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: CODE — verificação de e-mail
          ══════════════════════════════════════════════════════════════════ */}
          {step === "code" && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Código de verificação</Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                Enviamos um código de 6 dígitos para{"\n"}
                <Text style={{ fontWeight: "700", color: "#1A3A5C" }}>{email}</Text>
              </Text>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>Código</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="lock" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, letterSpacing: 8, fontSize: 22, fontWeight: "700" }]}
                    placeholder="000000"
                    placeholderTextColor={colors.muted}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                    maxLength={6}
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={handleVerifyCode}
                disabled={loading}
                style={[styles.btn, { backgroundColor: "#1A3A5C", opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>Verificar e continuar</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendCode} disabled={loading} style={{ alignSelf: "center" }} activeOpacity={0.7}>
                <Text style={[styles.resendText, { color: "#1A3A5C" }]}>Reenviar código</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: PHOTO — upload de foto/logo
          ══════════════════════════════════════════════════════════════════ */}
          {step === "photo" && (
            <View style={styles.techStepContent}>
              <Text style={[styles.techStepTitle, { color: colors.foreground }]}>
                {accountType === "empresa" ? "Logo da Empresa" : "Foto de Perfil"}
              </Text>
              <Text style={[styles.techStepSubtitle, { color: colors.muted }]}>
                {accountType === "empresa"
                  ? "Adicione a logo da sua empresa. Ela aparecerá nos resultados de busca dos clientes."
                  : "Adicione uma foto sua. Ela aparecerá no seu perfil e nos resultados de busca."}
              </Text>

              <View style={{ alignItems: "center", marginVertical: 24 }}>
                <TouchableOpacity
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                  style={[
                    accountType === "empresa" ? styles.logoButton : styles.photoButton,
                    { borderColor: photoUri ? "#1A3A6B" : colors.border, backgroundColor: colors.surface }
                  ]}
                >
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={accountType === "empresa" ? styles.logoImage : styles.photoImage}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <MaterialIcons
                        name={accountType === "empresa" ? "add-photo-alternate" : "add-a-photo"}
                        size={40}
                        color={colors.muted}
                      />
                      <Text style={[styles.photoPlaceholderText, { color: colors.muted, marginTop: 8 }]}>
                        {accountType === "empresa" ? "Toque para adicionar logo" : "Toque para adicionar foto"}
                      </Text>
                      {accountType === "empresa" && (
                        <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>Obrigatório *</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
                {photoUri && (
                  <TouchableOpacity onPress={() => setPhotoUri(null)} style={{ marginTop: 12 }}>
                    <Text style={{ color: "#EF4444", fontSize: 13 }}>
                      Remover {accountType === "empresa" ? "logo" : "foto"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {accountType === "autonomo" && (
                <View style={[styles.infoBox, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                  <MaterialIcons name="info" size={16} color="#16A34A" />
                  <Text style={[styles.infoText, { color: "#15803D" }]}>
                    A foto é opcional para autônomos, mas aumenta a confiança dos clientes.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: SERVICES — especialidades
          ══════════════════════════════════════════════════════════════════ */}
          {step === "services" && (
            <View style={styles.techStepContent}>
              <Text style={[styles.techStepTitle, { color: colors.foreground }]}>Especialidades</Text>
              <Text style={[styles.techStepSubtitle, { color: colors.muted }]}>Selecione os serviços que você oferece</Text>
              <View style={styles.specialtiesGrid}>
                {SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = specialties.includes(cat.id as ServiceCategory);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => toggleSpecialty(cat.id as ServiceCategory)}
                      activeOpacity={0.8}
                      style={[styles.specialtyOption, { backgroundColor: isSelected ? cat.color + "20" : colors.surface, borderColor: isSelected ? cat.color : colors.border }]}
                    >
                      <MaterialIcons name={cat.icon as any} size={28} color={cat.color} />
                      <Text style={[styles.specialtyLabel, { color: isSelected ? cat.color : colors.foreground }]}>{cat.label}</Text>
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

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: CONTACT — informações de contato
          ══════════════════════════════════════════════════════════════════ */}
          {step === "contact" && (
            <View style={styles.techStepContent}>
              <Text style={[styles.techStepTitle, { color: colors.foreground }]}>Informações de Contato</Text>
              <View style={styles.techField}>
                <Text style={[styles.techFieldLabel, { color: colors.foreground }]}>Telefone <Text style={{ color: "#EF4444" }}>*</Text></Text>
                <TextInput
                  style={[styles.techInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.muted}
                  value={techPhone}
                  onChangeText={(v) => setTechPhone(formatPhone(v))}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.techField}>
                <Text style={[styles.techFieldLabel, { color: colors.foreground }]}>
                  WhatsApp{accountType === "empresa" && <Text style={{ color: "#EF4444" }}> *</Text>}
                </Text>
                <TextInput
                  style={[styles.techInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={colors.muted}
                  value={whatsapp}
                  onChangeText={(v) => setWhatsapp(formatPhone(v))}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.techField}>
                <Text style={[styles.techFieldLabel, { color: colors.foreground }]}>Descrição do Serviço</Text>
                <TextInput
                  style={[styles.techTextarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                  placeholder={accountType === "empresa" ? "Descreva sua empresa e os serviços que oferece..." : "Descreva seus serviços e experiência..."}
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

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA: REVIEW — revisão final
          ══════════════════════════════════════════════════════════════════ */}
          {step === "review" && (
            <View style={styles.techStepContent}>
              <Text style={[styles.techStepTitle, { color: colors.foreground }]}>Revisão do Cadastro</Text>
              <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {photoUri && (
                  <View style={[styles.reviewRow, { justifyContent: "center", paddingVertical: 16 }]}>
                    <Image
                      source={{ uri: photoUri }}
                      style={accountType === "empresa"
                        ? { width: 80, height: 80, borderRadius: 8 }
                        : { width: 80, height: 80, borderRadius: 40 }
                      }
                    />
                  </View>
                )}
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Tipo</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{accountType === "empresa" ? "Empresa" : "Autônomo"}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Responsável</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{name}</Text>
                </View>
                {accountType === "empresa" && companyName ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>Empresa</Text>
                    <Text style={[styles.reviewValue, { color: colors.foreground }]}>{companyName}</Text>
                  </View>
                ) : null}
                {accountType === "empresa" && cnpj ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>CNPJ</Text>
                    <Text style={[styles.reviewValue, { color: colors.foreground }]}>{cnpj}</Text>
                  </View>
                ) : null}
                {accountType === "autonomo" && cpf ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>CPF</Text>
                    <Text style={[styles.reviewValue, { color: colors.foreground }]}>{cpf}</Text>
                  </View>
                ) : null}
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>E-mail</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{email}</Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Cidade</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{city}{stateUF ? `, ${stateUF}` : ""}</Text>
                </View>
                {street ? (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewLabel, { color: colors.muted }]}>Endereço</Text>
                    <Text style={[styles.reviewValue, { color: colors.foreground }]}>{street}{addressNumber ? `, ${addressNumber}` : ""}{neighborhood ? ` - ${neighborhood}` : ""}</Text>
                  </View>
                ) : null}
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Telefone</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{techPhone}</Text>
                </View>
                <View style={[styles.reviewRow, { alignItems: "flex-start" }]}>
                  <Text style={[styles.reviewLabel, { color: colors.muted }]}>Especialidades</Text>
                  <View style={styles.reviewSpecialties}>
                    {specialties.map((s) => {
                      const cat = SERVICE_CATEGORIES.find((c) => c.id === s);
                      return (
                        <View key={s} style={[styles.reviewChip, { backgroundColor: (cat?.color || "#6B7280") + "20" }]}>
                          <Text style={[styles.reviewChipText, { color: cat?.color || "#6B7280" }]}>{cat?.label || s}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              <View style={[styles.infoBox, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
                <MaterialIcons name="verified" size={18} color="#10B981" />
                <Text style={[styles.infoText, { color: "#10B981" }]}>
                  {accountType === "empresa"
                    ? "Após o cadastro, sua empresa receberá o selo \"Empresa Verificada\" e poderá receber solicitações de clientes."
                    : "Após o cadastro, você receberá o selo \"Profissional Autônomo\" e poderá receber solicitações de clientes."}
                </Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* ── Footer para etapas com progress bar ── */}
        {isProgressStep && (
          <View style={[styles.techFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {step === "review" && (
              <TouchableOpacity
                onPress={() => setStep("contact")}
                activeOpacity={0.85}
                style={[styles.actionButton, { backgroundColor: "#6B7280", flex: 0, paddingHorizontal: 20, marginRight: 8 }]}
              >
                <MaterialIcons name="edit" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Corrigir</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={step === "review" ? handleSubmit : handleNext}
              activeOpacity={0.85}
              disabled={submitting}
              style={[styles.actionButton, { backgroundColor: "#1A3A6B", opacity: submitting ? 0.7 : 1 }]}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Text style={styles.actionButtonText}>{step === "review" ? "Finalizar Cadastro" : "Próximo"}</Text>
                  <MaterialIcons name={step === "review" ? "check" : "arrow-forward"} size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerText: { gap: 2 },
  headerTitle: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  headerSub: { fontSize: 13, lineHeight: 18 },
  techHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  techHeaderTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  progressContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stepNumber: { fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 14 },
  techContent: { padding: 16, paddingBottom: 32 },
  techStepContent: { gap: 16 },
  techStepTitle: { fontSize: 20, fontWeight: "800" },
  techStepSubtitle: { fontSize: 14, marginTop: -8 },
  techField: { gap: 6 },
  techFieldLabel: { fontSize: 14, fontWeight: "600" },
  techInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  techTextarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100, lineHeight: 22 },
  techRow: { flexDirection: "row", gap: 10 },
  photoButton: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderStyle: "dashed", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photoImage: { width: 120, height: 120, borderRadius: 60 },
  logoButton: { width: 140, height: 140, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  logoImage: { width: 140, height: 140, borderRadius: 16 },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", gap: 4, padding: 16 },
  photoPlaceholderText: { fontSize: 12, fontWeight: "500", textAlign: "center" },
  specialtiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specialtyOption: { width: "47%", borderRadius: 12, borderWidth: 1.5, padding: 14, alignItems: "center", gap: 6, position: "relative" },
  specialtyLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  checkMark: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  selectedCount: { textAlign: "center", fontSize: 13, marginTop: 4 },
  reviewCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  reviewLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  reviewValue: { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },
  reviewSpecialties: { flex: 2, flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" },
  reviewChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reviewChipText: { fontSize: 11, fontWeight: "600" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 16 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardSub: { fontSize: 14, lineHeight: 20, marginTop: -8 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  input: { flex: 1, fontSize: 15 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resendText: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  loginWrap: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  techFooter: { flexDirection: "row", padding: 16, borderTopWidth: 1 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  choiceCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 2, gap: 12 },
  choiceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  choiceText: { flex: 1 },
  choiceTitle: { fontSize: 17, fontWeight: "800" },
  choiceSub: { fontSize: 13, marginTop: 2 },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  outlineBtnText: { fontSize: 15, fontWeight: "600" },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  typeBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  addressPreview: { flexDirection: "row", alignItems: "flex-start", padding: 10, borderRadius: 8, borderWidth: 1 },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1A3A5C",
    backgroundColor: "#EFF6FF",
  },
  clientCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  clientCardText: { flex: 1 },
  clientCardTitle: { fontSize: 16, fontWeight: "700", color: "#1A3A5C" },
  clientCardSub: { fontSize: 12, color: "#4B6A8A", marginTop: 2, lineHeight: 16 },
});
