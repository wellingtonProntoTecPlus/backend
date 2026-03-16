import React, { useState } from "react";
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
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import * as Auth from "@/lib/_core/auth";
import { getApiBaseUrl } from "@/constants/oauth";
import { formatPhone } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const IMAGE_AUTH_VERSION = "1.0";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID;

type Step = "form" | "code";

export default function RegisterClientScreen() {
  const colors = useColors();
  const { setAuthUser } = useAppContext();
  const API = getApiBaseUrl();

  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);

  // Campos do formulário
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Modal de Autorização de Imagem
  const [showImageAuthModal, setShowImageAuthModal] = useState(false);
  const saveImageAuth = trpc.user.saveImageAuthorization.useMutation();

  // Navegar para o app após decisão do modal
  async function handleImageAuthDecision(decision: "accepted" | "refused") {
    try {
      await saveImageAuth.mutateAsync({ decision, documentVersion: IMAGE_AUTH_VERSION });
    } catch {
      // Falha silenciosa — não bloquear o usuário por erro de rede
    }
    setShowImageAuthModal(false);
    router.replace("/(tabs)");
  }

  // Verificação de código
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // Google OAuth
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Reagir ao retorno do Google
  React.useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) handleGoogleLogin(idToken);
    }
  }, [googleResponse]);

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Erro", data.error || "Falha ao entrar com Google");
        return;
      }
      // Salvar token de sessão para autenticar chamadas tRPC
      if (data.app_session_id) {
        await AsyncStorage.setItem("@prontotec:session_token", data.app_session_id);
        await Auth.setSessionToken(data.app_session_id);
      }
      setAuthUser({
        email: data.user?.email || "",
        name: data.user?.name || "",
        mode: "cliente",
        avatarUrl: data.user?.avatarUrl || null,
        // ID numérico do servidor — essencial para comparar senderId no chat
        serverId: data.user?.id ?? undefined,
      });
      setShowImageAuthModal(true);
    } catch {
      Alert.alert("Erro", "Falha ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    if (!name.trim()) { Alert.alert("Atenção", "Informe seu nome completo"); return; }
    if (!email.trim() || !email.includes("@")) { Alert.alert("Atenção", "Informe um e-mail válido"); return; }
    if (!termsAccepted) { Alert.alert("Atenção", "Você precisa aceitar os Termos de Uso para continuar"); return; }

    setLoading(true);
    try {
      // Verificar duplicata de e-mail
      const dupRes = await fetch(`${API}/api/auth/check-duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const dupData = await dupRes.json();
      if (dupData.duplicate) {
        Alert.alert("E-mail já cadastrado", "Este e-mail já possui uma conta. Faça login.");
        return;
      }

      // Enviar código de verificação
      const res = await fetch(`${API}/api/auth/email/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "RESEND_TEST_MODE") {
          Alert.alert(
            "Serviço de e-mail em teste",
            "Use o login com Google para criar sua conta agora.",
          );
        } else {
          Alert.alert("Erro", data.error || "Falha ao enviar código");
        }
        return;
      }

      setStep("code");
    } catch {
      Alert.alert("Erro", "Falha ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.trim().length !== 6) {
      setCodeError("O código deve ter 6 dígitos");
      return;
    }
    setCodeError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/email/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCodeError(data.error || "Código inválido");
        return;
      }

      // Salvar token de sessão para autenticar chamadas tRPC (solicitações, chat, etc.)
      if (data.app_session_id) {
        await AsyncStorage.setItem("@prontotec:session_token", data.app_session_id);
        await Auth.setSessionToken(data.app_session_id);
      }

      // Cadastro concluído — salvar dados e navegar
      setAuthUser({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        mode: "cliente",
        avatarUrl: null,
        // ID numérico do servidor — essencial para comparar senderId no chat
        serverId: data.user?.id ?? undefined,
      });

      setShowImageAuthModal(true);
    } catch {
      Alert.alert("Erro", "Falha ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      {/* Modal de Autorização de Imagem e Depoimento */}
      <Modal
        visible={showImageAuthModal}
        transparent
        animationType="slide"
        onRequestClose={() => handleImageAuthDecision("refused")}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="photo-camera" size={40} color="#1A3A5C" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Autorização de Imagem e Depoimento
            </Text>
            <Text style={[styles.modalBody, { color: colors.muted }]}>
              O ProntoTEC+ poderá utilizar sua imagem, nome e depoimentos fornecidos voluntariamente para fins de divulgação da plataforma, incluindo materiais de marketing, redes sociais e publicidade.
            </Text>
            <Text style={[styles.modalBody, { color: colors.muted, marginTop: 8 }]}>
              Sua participação é voluntária. Você pode revogar esta autorização a qualquer momento pelo seu perfil.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                onPress={() => handleImageAuthDecision("refused")}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.muted }]}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => handleImageAuthDecision("accepted")}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check" size={16} color="#fff" />
                <Text style={styles.modalBtnPrimaryText}>Li e Autorizo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.logoWrap}>
              <View style={[styles.logoBadge, { backgroundColor: "#1A3A5C" }]}>
                <Text style={styles.logoText}>ProntoTEC+</Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Criar conta de cliente</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Encontre técnicos de segurança eletrônica perto de você
            </Text>
          </View>

          {/* ── ETAPA: FORMULÁRIO ── */}
          {step === "form" && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

              {/* Nome */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>Nome completo *</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="person" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Seu nome completo"
                    placeholderTextColor={colors.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* E-mail */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>E-mail *</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="email" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Telefone */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>Telefone / WhatsApp</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="phone" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="(XX) XXXXX-XXXX"
                    placeholderTextColor={colors.muted}
                    value={phone}
                    onChangeText={(t) => setPhone(formatPhone(t))}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    maxLength={15}
                  />
                </View>
              </View>

              {/* Cidade */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>Cidade</Text>
                <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <MaterialIcons name="location-city" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Sua cidade"
                    placeholderTextColor={colors.muted}
                    value={city}
                    onChangeText={setCity}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Termos */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: termsAccepted ? "#1A3A5C" : colors.border },
                  termsAccepted && { backgroundColor: "#1A3A5C" },
                ]}>
                  {termsAccepted && <MaterialIcons name="check" size={14} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.muted }]}>
                  Li e concordo com os{" "}
                  <Text
                    style={{ color: "#1A3A5C", textDecorationLine: "underline" }}
                    onPress={() => router.push("/legal/terms" as any)}
                  >
                    Termos de Uso
                  </Text>
                  {" "}e{" "}
                  <Text
                    style={{ color: "#1A3A5C", textDecorationLine: "underline" }}
                    onPress={() => router.push("/legal/privacy" as any)}
                  >
                    Política de Privacidade
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* Botão criar conta */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#1A3A5C", opacity: loading ? 0.7 : 1 }]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="email" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Criar conta com e-mail</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={[styles.dividerRow, { marginVertical: 16 }]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.muted }]}>ou</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => googlePromptAsync()}
                disabled={!googleRequest || loading}
                activeOpacity={0.85}
              >
                <MaterialIcons name="g-translate" size={20} color="#4285F4" />
                <Text style={[styles.googleBtnText, { color: colors.foreground }]}>Continuar com Google</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── ETAPA: CÓDIGO ── */}
          {step === "code" && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.codeHeader}>
                <MaterialIcons name="mark-email-read" size={48} color="#1A3A5C" />
                <Text style={[styles.codeTitle, { color: colors.foreground }]}>Verifique seu e-mail</Text>
                <Text style={[styles.codeSub, { color: colors.muted }]}>
                  Enviamos um código de 6 dígitos para{"\n"}
                  <Text style={{ color: "#1A3A5C", fontWeight: "700" }}>{email}</Text>
                </Text>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.muted }]}>Código de verificação</Text>
                <View style={[
                  styles.inputWrap,
                  { borderColor: codeError ? "#EF4444" : colors.border, backgroundColor: colors.background },
                ]}>
                  <MaterialIcons name="lock" size={18} color={colors.muted} />
                  <TextInput
                    style={[styles.input, styles.codeInput, { color: colors.foreground }]}
                    placeholder="000000"
                    placeholderTextColor={colors.muted}
                    value={code}
                    onChangeText={(t) => { setCode(t.replace(/\D/g, "").slice(0, 6)); setCodeError(""); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                  />
                </View>
                {!!codeError && (
                  <Text style={styles.errorText}>{codeError}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#1A3A5C", opacity: loading ? 0.7 : 1 }]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Confirmar e criar conta</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => { setStep("form"); setCode(""); setCodeError(""); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendText, { color: colors.muted }]}>
                  Não recebeu?{" "}
                  <Text style={{ color: "#1A3A5C", fontWeight: "600" }}>Voltar e reenviar</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Link para login */}
          <View style={styles.loginWrap}>
            <Text style={[styles.loginText, { color: colors.muted }]}>Já tem uma conta?</Text>
            <TouchableOpacity onPress={() => router.push("/auth/login" as any)} activeOpacity={0.7}>
              <Text style={[styles.loginLink, { color: "#1A3A5C" }]}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 24, gap: 8 },
  backBtn: { alignSelf: "flex-start", padding: 4, marginBottom: 8 },
  logoWrap: { marginBottom: 4 },
  logoBadge: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  logoText: { color: "#F5A623", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 4,
    marginBottom: 16,
  },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 48,
  },
  input: { flex: 1, fontSize: 15 },
  codeInput: { fontSize: 22, letterSpacing: 8, fontWeight: "700", textAlign: "center" },
  errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    gap: 10,
  },
  googleBtnText: { fontSize: 15, fontWeight: "600" },
  codeHeader: { alignItems: "center", gap: 8, marginBottom: 20 },
  codeTitle: { fontSize: 20, fontWeight: "800" },
  codeSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  resendBtn: { alignItems: "center", paddingVertical: 12 },
  resendText: { fontSize: 14 },
  loginWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 8 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: "700" },
  // Modal de Autorização de Imagem
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: 16,
    paddingBottom: 32,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 4,
  },
  modalIconWrap: {
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#1A3A5C15",
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalBtnPrimary: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1A3A5C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalBtnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
