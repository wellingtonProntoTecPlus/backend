import React, { useState, useCallback } from "react";
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
import { makeRedirectUri } from "expo-auth-session";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { getApiBaseUrl } from "@/constants/oauth";

// Required for expo-auth-session to work on Android
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID;

type Step = "email" | "code";

export default function LoginScreen() {
  const colors = useColors();
  const { setAuthUser } = useAppContext();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ─── Google OAuth Setup ────────────────────────────────────────────────────
  const [, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  // Handle Google OAuth response
  React.useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleIdToken(authentication.idToken);
      } else if (authentication?.accessToken) {
        // Fallback: fetch user info with access token
        handleGoogleAccessToken(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      setGoogleLoading(false);
      Alert.alert("Erro no Google", "Não foi possível autenticar com o Google. Tente novamente.");
    } else if (response?.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleIdToken = useCallback(async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.error || "Falha na autenticação com Google.");
        return;
      }

      await saveSessionAndNavigate(data);
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setGoogleLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleAccessToken = useCallback(async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      // Get user info from Google using access token
      const userInfoRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();

      if (!userInfo.id || !userInfo.email) {
        Alert.alert("Erro", "Não foi possível obter informações do Google.");
        return;
      }

      // Use the sub/id as a fake idToken fallback — send to our server
      const apiBase = getApiBaseUrl() || "http://localhost:3000";
      const res = await fetch(`${apiBase}/api/auth/google/access-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sub: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          accessToken,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.error || "Falha na autenticação com Google.");
        return;
      }

      await saveSessionAndNavigate(data);
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setGoogleLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    const saveSessionAndNavigate = async (data: {
    app_session_id?: string;
    isNewUser?: boolean;
    user?: {
      id?: number | null;
      email?: string;
      name?: string;
      phone?: string | null;
      city?: string | null;
      state?: string | null;
      avatarUrl?: string | null;
      mode?: string | null;
      addressStreet?: string | null;
      addressNumber?: string | null;
      addressComplement?: string | null;
      addressNeighborhood?: string | null;
      addressZipCode?: string | null;
    };
  }) => {
    if (data.app_session_id) {
      // Salva no AsyncStorage (para o endpoint REST /api/user/avatar)
      await AsyncStorage.setItem("@prontotec:session_token", data.app_session_id);
      // Salva no SecureStore (para o tRPC via Auth.getSessionToken)
      await Auth.setSessionToken(data.app_session_id);
    }
    // Salva todos os campos do perfil no contexto e AsyncStorage
    setAuthUser({
      email: data.user?.email || "",
      name: data.user?.name || undefined,
      phone: data.user?.phone || undefined,
      city: data.user?.city || undefined,
      state: data.user?.state || undefined,
      avatarUrl: data.user?.avatarUrl || undefined,
      mode: (data.user?.mode === "tecnico" ? "tecnico" : "cliente") as "cliente" | "tecnico",
      addressStreet: data.user?.addressStreet || undefined,
      addressNumber: data.user?.addressNumber || undefined,
      addressComplement: data.user?.addressComplement || undefined,
      addressNeighborhood: data.user?.addressNeighborhood || undefined,
      addressZipCode: data.user?.addressZipCode || undefined,
      // ID numérico do servidor — essencial para comparar senderId no chat
      serverId: data.user?.id ?? undefined,
    });
    // Novo usuário Google: redirecionar para tela de boas-vindas para coletar dados adicionais
    if (data.isNewUser) {
      router.replace("/auth/welcome" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch {
      setGoogleLoading(false);
      Alert.alert("Erro", "Não foi possível abrir o login do Google.");
    }
  };

  // ─── Step 1: Enviar código ─────────────────────────────────────────────────
  const handleSendCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      Alert.alert("E-mail inválido", "Por favor, informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";
      const res = await fetch(`${apiBase}/api/auth/email/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.error || "Não foi possível enviar o código.");
        return;
      }

      setStep("code");
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Verificar código ──────────────────────────────────────────────
  const handleVerifyCode = async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      Alert.alert("Código inválido", "O código deve ter 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const apiBase = getApiBaseUrl() || "https://api.prontotecplus.app";
      const res = await fetch(`${apiBase}/api/auth/email/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: trimmedCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erro", data.error || "Código inválido. Tente novamente.");
        return;
      }

      await saveSessionAndNavigate(data);
    } catch {
      Alert.alert("Erro de conexão", "Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/logo-prontotec.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: colors.muted }]}>
              Técnicos em Segurança Eletrônica Sob Demanda
            </Text>
          </View>

          {/* Google Login Button */}
          {step === "email" && (
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <Image
                    source={{ uri: "https://www.google.com/favicon.ico" }}
                    style={styles.googleIcon}
                  />
                  <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                    Entrar com Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divisor */}
          {step === "email" && (
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.muted }]}>ou use seu e-mail</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
          )}

          {/* Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {step === "email" ? (
              <>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Entrar na sua conta</Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>
                  Enviaremos um código de verificação para o seu e-mail.
                </Text>

                {/* E-mail */}
                <View style={styles.fieldWrap}>
                  <Text style={[styles.label, { color: colors.muted }]}>E-mail</Text>
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
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSendCode}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={loading || googleLoading}
                  style={[styles.btn, { backgroundColor: "#1A3A5C", opacity: loading ? 0.7 : 1 }]}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="send" size={18} color="#fff" />
                      <Text style={styles.btnText}>Enviar código</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Voltar */}
                <TouchableOpacity
                  onPress={() => { setStep("email"); setCode(""); }}
                  style={styles.backRow}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={18} color="#1A3A5C" />
                  <Text style={[styles.backText, { color: "#1A3A5C" }]}>Voltar</Text>
                </TouchableOpacity>

                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Código de verificação</Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>
                  Enviamos um código de 6 dígitos para{"\n"}
                  <Text style={{ fontWeight: "700", color: "#1A3A5C" }}>{email}</Text>
                </Text>

                {/* Código */}
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
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={18} color="#fff" />
                      <Text style={styles.btnText}>Verificar e entrar</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Reenviar */}
                <TouchableOpacity
                  onPress={handleSendCode}
                  disabled={loading}
                  style={{ alignSelf: "center" }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resendText, { color: "#1A3A5C" }]}>Reenviar código</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Criar conta */}
          <View style={styles.registerWrap}>
            <Text style={[styles.registerText, { color: colors.muted }]}>Não tem conta ainda?</Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/register" as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.registerLink, { color: "#1A3A5C" }]}>Criar conta gratuita</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    gap: 8,
  },
  logoImage: {
    width: 220,
    height: 140,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -4,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: -4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  registerWrap: {
    alignItems: "center",
    gap: 4,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
