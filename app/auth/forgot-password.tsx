import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";

type Step = "email" | "sent";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSend = async () => {
    setError("");
    if (!email.trim()) {
      setError("Informe seu e-mail cadastrado.");
      return;
    }
    if (!validateEmail(email)) {
      setError("E-mail inválido.");
      return;
    }
    setLoading(true);
    // Simula envio (em produção: chamada à API)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setStep("sent");
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Recuperar Senha</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.content}>
            {step === "email" ? (
              <>
                {/* Ícone */}
                <View style={[styles.iconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <MaterialIcons name="lock-reset" size={48} color="#1A3A5C" />
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>
                  Esqueceu sua senha?
                </Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  Informe o e-mail cadastrado na sua conta e enviaremos as instruções para redefinir sua senha.
                </Text>

                {/* Campo e-mail */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>E-mail</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      {
                        backgroundColor: colors.surface,
                        borderColor: error ? "#EF4444" : colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons name="email" size={20} color={colors.muted} />
                    <TextInput
                      style={[styles.input, { color: colors.foreground }]}
                      placeholder="seu@email.com"
                      placeholderTextColor={colors.muted}
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        setError("");
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                    />
                  </View>
                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}
                </View>

                {/* Botão enviar */}
                <Pressable
                  onPress={handleSend}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: "#1A3A5C", opacity: pressed || loading ? 0.8 : 1 },
                  ]}
                >
                  {loading ? (
                    <Text style={styles.sendBtnText}>Enviando...</Text>
                  ) : (
                    <>
                      <MaterialIcons name="send" size={18} color="#fff" />
                      <Text style={styles.sendBtnText}>Enviar Instruções</Text>
                    </>
                  )}
                </Pressable>

                {/* Voltar para login */}
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.backLink, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="arrow-back" size={16} color="#1A3A5C" />
                  <Text style={[styles.backLinkText, { color: "#1A3A5C" }]}>
                    Voltar para o Login
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* Confirmação de envio */}
                <View style={[styles.iconWrap, { backgroundColor: "#F0FDF4" }]}>
                  <MaterialIcons name="mark-email-read" size={48} color="#22C55E" />
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>
                  E-mail enviado!
                </Text>
                <Text style={[styles.subtitle, { color: colors.muted }]}>
                  Enviamos as instruções para redefinir sua senha para:
                </Text>
                <View style={[styles.emailBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <MaterialIcons name="email" size={18} color="#1A3A5C" />
                  <Text style={[styles.emailBoxText, { color: colors.foreground }]}>{email}</Text>
                </View>

                <Text style={[styles.hint, { color: colors.muted }]}>
                  Verifique também sua caixa de spam. O e-mail pode levar alguns minutos para chegar.
                </Text>

                {/* Reenviar */}
                <Pressable
                  onPress={() => setStep("email")}
                  style={({ pressed }) => [
                    styles.resendBtn,
                    { borderColor: "#1A3A5C", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <MaterialIcons name="refresh" size={18} color="#1A3A5C" />
                  <Text style={[styles.resendBtnText, { color: "#1A3A5C" }]}>
                    Reenviar e-mail
                  </Text>
                </Pressable>

                {/* Voltar para login */}
                <Pressable
                  onPress={() => router.replace("/auth/login" as any)}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: "#1A3A5C", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <MaterialIcons name="login" size={18} color="#fff" />
                  <Text style={styles.sendBtnText}>Voltar para o Login</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emailBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    width: "100%",
  },
  emailBoxText: {
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  resendBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
