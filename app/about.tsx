import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";

export default function AboutScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      {/* Header — mesmo padrão do CTA: fundo branco/claro com borda azul */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: "#1A3A6B" }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1A3A6B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={require("@/assets/images/logo_completa.png")}
            style={{ width: 32, height: 32, resizeMode: "contain" }}
          />
          <Text style={[styles.headerTitle, { color: "#1A3A6B" }]}>Sobre o ProntoTEC+</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Ícone */}
        <View style={[styles.logoSection, { backgroundColor: "#EEF4FF", borderColor: "#1A3A6B" }]}>
          <Image
            source={require("@/assets/images/logo_completa.png")}
            style={{ width: 110, height: 110, resizeMode: "contain" }}
          />
          <Text style={[styles.logoSlogan, { color: "#1A3A6B" }]}>Técnicos em Segurança Eletrônica Sob Demanda</Text>
        </View>

        {/* Texto Sobre */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: "#1A3A6B" }]}>Nossa Missão</Text>
          <Text style={[styles.paragraph, { color: colors.foreground }]}>
            O ProntoTEC+ é uma plataforma criada para conectar clientes a profissionais especializados em segurança eletrônica de forma rápida, simples e confiável.
          </Text>
          <Text style={[styles.paragraph, { color: colors.foreground }]}>
            Nossa missão é facilitar o acesso a técnicos qualificados para instalação, manutenção e suporte em sistemas de segurança, reunindo em um único aplicativo profissionais e empresas que atuam nas áreas de alarmes, câmeras de monitoramento, portões eletrônicos, interfones, fechaduras eletrônicas, redes Wi-Fi e outras soluções tecnológicas voltadas à proteção de residências e empresas.
          </Text>
        </View>

        {/* Como Funciona */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: "#1A3A6B" }]}>Como Funciona</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: "#EEF4FF" }]}>
                <MaterialIcons name="search" size={22} color="#1A3A6B" />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>Encontre Técnicos</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>
                  Clientes podem encontrar técnicos próximos, avaliar perfis profissionais e comparar serviços.
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: "#FFF8EC" }]}>
                <MaterialIcons name="flash-on" size={22} color="#F5A623" />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>Solicite com Agilidade</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>
                  Solicite atendimento com agilidade e receba propostas em minutos.
                </Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: "#FFF8EC" }]}>
                <MaterialIcons name="star" size={22} color="#F5A623" />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.foreground }]}>Avalie e Confie</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>
                  Avaliações reais de clientes garantem a qualidade dos profissionais cadastrados.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Para Profissionais */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: "#1A3A6B" }]}>Para Profissionais</Text>
          <Text style={[styles.paragraph, { color: colors.foreground }]}>
            A plataforma oferece aos profissionais e empresas do setor uma nova oportunidade de ampliar sua visibilidade, conquistar clientes e fortalecer sua presença no mercado.
          </Text>

          {/* Níveis de Profissional */}
          <Text style={[styles.subTitle, { color: colors.foreground }]}>Níveis de Cadastro</Text>
          <View style={styles.levelList}>
            <View style={[styles.levelItem, { borderColor: "#6B7280" + "40", backgroundColor: "#6B728010" }]}>
              <MaterialIcons name="person" size={20} color="#6B7280" />
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, { color: "#6B7280" }]}>Nível 1 — Autônomo</Text>
                <Text style={[styles.levelDesc, { color: colors.muted }]}>Cadastro básico. Profissional independente.</Text>
              </View>
            </View>
            <View style={[styles.levelItem, { borderColor: "#1A3A6B" + "40", backgroundColor: "#1A3A6B10" }]}>
              <MaterialIcons name="verified" size={20} color="#1A3A6B" />
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, { color: "#1A3A6B" }]}>Nível 2 — Empresa Verificada</Text>
                <Text style={[styles.levelDesc, { color: colors.muted }]}>Empresa com CNPJ e documentação confirmados.</Text>
              </View>
            </View>
            <View style={[styles.levelItem, { borderColor: "#F5A623" + "60", backgroundColor: "#F5A62315" }]}>
              <MaterialIcons name="workspace-premium" size={20} color="#F5A623" />
              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, { color: "#D97706" }]}>Nível 3 — Parceiro ProntoTEC+</Text>
                <Text style={[styles.levelDesc, { color: colors.muted }]}>Profissional certificado e auditado pela plataforma.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Propósito — mesmo padrão do CTA: fundo #EEF4FF, borda azul marinho */}
        <View style={styles.purposeCard}>
          <View style={styles.purposeLogoRow}>
            <Image
              source={require("@/assets/images/logo_completa.png")}
              style={{ width: 56, height: 56, resizeMode: "contain" }}
            />
          </View>
          <Text style={styles.purposeTitle}>Nosso Propósito</Text>
          <Text style={styles.purposeText}>
            O ProntoTEC+ nasce com o propósito de valorizar o trabalho técnico, promover conexões confiáveis e elevar o padrão de serviços na área de segurança eletrônica em todo o Brasil.
          </Text>
          <Text style={styles.purposeTagline}>
            "Mais do que um aplicativo, o ProntoTEC+ é uma rede de profissionais prontos para proteger o que realmente importa."
          </Text>
        </View>

        {/* Versão */}
        <Text style={[styles.version, { color: colors.muted }]}>ProntoTEC+ v1.5.3 · Todos os direitos reservados</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  content: {
    paddingBottom: 32,
    gap: 12,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
    borderBottomWidth: 1.5,
  },
  logoSlogan: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    opacity: 0.75,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
  featureList: {
    gap: 14,
  },
  featureItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  levelList: {
    gap: 8,
    marginTop: 4,
  },
  levelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  levelInfo: {
    flex: 1,
    gap: 2,
  },
  levelName: {
    fontSize: 13,
    fontWeight: "700",
  },
  levelDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  // Banner "Nosso Propósito" — mesmo padrão do CTA Solicitar Serviço
  purposeCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    borderWidth: 1.5,
    borderColor: "#1A3A6B",
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#1A3A6B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  purposeLogoRow: {
    marginBottom: 4,
  },
  purposeTitle: {
    color: "#1A3A6B",
    fontSize: 18,
    fontWeight: "800",
  },
  purposeText: {
    color: "#1A3A6B",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.85,
  },
  purposeTagline: {
    color: "#F5A623",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
});
