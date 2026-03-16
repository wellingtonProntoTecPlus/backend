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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";

/**
 * Tela de boas-vindas exibida após o primeiro login com Google.
 * Coleta: tipo de perfil (Cliente/Técnico), telefone e cidade.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const { setAuthUser, user } = useAppContext();

  const [profileType, setProfileType] = useState<"client" | "technician" | null>(null);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const validate = () => {
    if (!profileType) {
      Alert.alert("Tipo de conta", "Por favor, selecione se você é Cliente ou Técnico.");
      return false;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      Alert.alert("Telefone inválido", "Informe um telefone com DDD válido.");
      return false;
    }
    if (!city.trim()) {
      Alert.alert("Cidade obrigatória", "Informe sua cidade para encontrar técnicos próximos.");
      return false;
    }
    if (!acceptedTerms) {
      Alert.alert("Termos de Uso", "Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Salvar dados adicionais no AsyncStorage
      const pairs: [string, string][] = [
        ["@prontotec:user_phone", phone],
        ["@prontotec:user_city", city.trim()],
        ["@prontotec:user_profile", profileType ?? "client"],
        ["@prontotec:user_mode", profileType === "technician" ? "tecnico" : "cliente"],
        ["@prontotec:welcome_completed", "true"],
      ];
      await AsyncStorage.multiSet(pairs);

      // Atualizar contexto
      setAuthUser({
        email: user.email,
        name: user.name,
        phone,
        city: city.trim(),
      });

      // Redirecionar para o fluxo correto
      if (profileType === "technician") {
        router.replace("/register-technician" as any);
      } else {
        router.replace("/(tabs)" as any);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível salvar seus dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: "#E8F0FE" }]}>
              <MaterialIcons name="waving-hand" size={36} color="#1A3A5C" />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Bem-vindo ao ProntoTEC+!
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Só mais algumas informações para personalizar sua experiência.
            </Text>
          </View>

          {/* Card principal */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* Tipo de perfil */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.muted }]}>Você é: *</Text>
              <View style={styles.profileRow}>
                <TouchableOpacity
                  style={[
                    styles.profileBtn,
                    {
                      backgroundColor: profileType === "client" ? "#1A3A5C" : colors.background,
                      borderColor: profileType === "client" ? "#1A3A5C" : colors.border,
                    },
                  ]}
                  onPress={() => setProfileType("client")}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="person"
                    size={24}
                    color={profileType === "client" ? "#fff" : colors.muted}
                  />
                  <Text style={[styles.profileBtnText, { color: profileType === "client" ? "#fff" : colors.foreground }]}>
                    Cliente
                  </Text>
                  <Text style={[styles.profileBtnSub, { color: profileType === "client" ? "rgba(255,255,255,0.75)" : colors.muted }]}>
                    Busco técnicos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.profileBtn,
                    {
                      backgroundColor: profileType === "technician" ? "#F5A623" : colors.background,
                      borderColor: profileType === "technician" ? "#F5A623" : colors.border,
                    },
                  ]}
                  onPress={() => setProfileType("technician")}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="build"
                    size={24}
                    color={profileType === "technician" ? "#fff" : colors.muted}
                  />
                  <Text style={[styles.profileBtnText, { color: profileType === "technician" ? "#fff" : colors.foreground }]}>
                    Técnico
                  </Text>
                  <Text style={[styles.profileBtnSub, { color: profileType === "technician" ? "rgba(255,255,255,0.85)" : colors.muted }]}>
                    Ofereço serviços
                  </Text>
                </TouchableOpacity>
              </View>

              {profileType === "technician" && (
                <View style={[styles.techNote, { backgroundColor: "#FFF8EC", borderColor: "#F5A623" }]}>
                  <MaterialIcons name="info-outline" size={16} color="#92400E" />
                  <Text style={[styles.techNoteText, { color: "#92400E" }]}>
                    Após concluir, você será direcionado para completar seu perfil profissional.
                  </Text>
                </View>
              )}
            </View>

            {/* Telefone */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.muted }]}>Telefone / WhatsApp *</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <MaterialIcons name="phone" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  maxLength={15}
                />
              </View>
            </View>

            {/* Cidade */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.muted }]}>Cidade *</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <MaterialIcons name="location-city" size={18} color={colors.muted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Ex: São Paulo"
                  placeholderTextColor={colors.muted}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Termos de Uso */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: acceptedTerms ? "#1A3A5C" : colors.background,
                  borderColor: acceptedTerms ? "#1A3A5C" : colors.border,
                },
              ]}>
                {acceptedTerms && <MaterialIcons name="check" size={14} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { color: colors.muted }]}>
                Li e aceito os{" "}
                <Text
                  style={[styles.termsLink, { color: "#1A3A5C" }]}
                  onPress={() => router.push("/legal/terms" as any)}
                >
                  Termos de Uso
                </Text>
                {" "}e a{" "}
                <Text
                  style={[styles.termsLink, { color: "#1A3A5C" }]}
                  onPress={() => router.push("/legal/privacy" as any)}
                >
                  Política de Privacidade
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão continuar */}
          <TouchableOpacity
            style={[
              styles.continueBtn,
              {
                backgroundColor: "#1A3A5C",
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continuar</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 20,
    marginBottom: 24,
  },
  fieldWrap: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileRow: {
    flexDirection: "row",
    gap: 12,
  },
  profileBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  profileBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  profileBtnSub: {
    fontSize: 12,
    textAlign: "center",
  },
  techNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  techNoteText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  termsLink: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
