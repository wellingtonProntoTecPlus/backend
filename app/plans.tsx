import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  level: number;
  name: string;
  subtitle: string;
  price: string;
  priceNote: string;
  color: string;
  icon: string;
  badge: string;
  features: PlanFeature[];
  current?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "autonomo",
    level: 1,
    name: "Autônomo",
    subtitle: "Para profissionais independentes",
    price: "Grátis",
    priceNote: "Sem mensalidade",
    color: "#6B7280",
    icon: "person",
    badge: "NÍVEL 1",
    current: true,
    features: [
      { text: "Perfil básico no app", included: true },
      { text: "Receber solicitações de clientes", included: true },
      { text: "Chat com clientes", included: true },
      { text: "Enviar orçamentos", included: true },
      { text: "Aparecer nas buscas", included: true },
      { text: "Selo de Empresa Verificada", included: false },
      { text: "Destaque nas buscas", included: false },
      { text: "Painel de estatísticas avançado", included: false },
      { text: "Suporte prioritário", included: false },
      { text: "Badge Parceiro ProntoTEC+", included: false },
    ],
  },
  {
    id: "empresa_verificada",
    level: 2,
    name: "Empresa Verificada",
    subtitle: "Para empresas e equipes",
    price: "R$ 89",
    priceNote: "por mês",
    color: "#2563EB",
    icon: "business",
    badge: "NÍVEL 2",
    features: [
      { text: "Perfil básico no app", included: true },
      { text: "Receber solicitações de clientes", included: true },
      { text: "Chat com clientes", included: true },
      { text: "Enviar orçamentos", included: true },
      { text: "Aparecer nas buscas", included: true },
      { text: "Selo de Empresa Verificada", included: true },
      { text: "Destaque nas buscas", included: true },
      { text: "Painel de estatísticas avançado", included: true },
      { text: "Suporte prioritário", included: false },
      { text: "Badge Parceiro ProntoTEC+", included: false },
    ],
  },
  {
    id: "parceiro",
    level: 3,
    name: "Parceiro ProntoTEC+",
    subtitle: "Para grandes operações",
    price: "R$ 199",
    priceNote: "por mês",
    color: "#F5A623",
    icon: "workspace-premium",
    badge: "NÍVEL 3",
    features: [
      { text: "Perfil básico no app", included: true },
      { text: "Receber solicitações de clientes", included: true },
      { text: "Chat com clientes", included: true },
      { text: "Enviar orçamentos", included: true },
      { text: "Aparecer nas buscas", included: true },
      { text: "Selo de Empresa Verificada", included: true },
      { text: "Destaque nas buscas", included: true },
      { text: "Painel de estatísticas avançado", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Badge Parceiro ProntoTEC+", included: true },
    ],
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  const colors = useColors();
  const isPopular = plan.level === 2;

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.surface,
        borderColor: plan.current ? plan.color : colors.border,
        borderWidth: plan.current ? 2 : 1,
      }
    ]}>
      {isPopular && (
        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
          <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
        </View>
      )}

      {/* Header do plano */}
      <View style={styles.cardHeader}>
        <View style={[styles.planIcon, { backgroundColor: plan.color + "20" }]}>
          <MaterialIcons name={plan.icon as any} size={28} color={plan.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.planTitleRow}>
            <View style={[styles.levelBadge, { backgroundColor: plan.color }]}>
              <Text style={styles.levelBadgeText}>{plan.badge}</Text>
            </View>
            {plan.current && (
              <View style={[styles.currentBadge, { borderColor: plan.color }]}>
                <Text style={[styles.currentBadgeText, { color: plan.color }]}>ATUAL</Text>
              </View>
            )}
          </View>
          <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
          <Text style={[styles.planSubtitle, { color: colors.muted }]}>{plan.subtitle}</Text>
        </View>
      </View>

      {/* Preço */}
      <View style={[styles.priceRow, { borderColor: colors.border }]}>
        <Text style={[styles.price, { color: plan.color }]}>{plan.price}</Text>
        <Text style={[styles.priceNote, { color: colors.muted }]}>{plan.priceNote}</Text>
      </View>

      {/* Features */}
      <View style={styles.featureList}>
        {plan.features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <MaterialIcons
              name={feature.included ? "check-circle" : "cancel"}
              size={18}
              color={feature.included ? "#22C55E" : "#D1D5DB"}
            />
            <Text style={[
              styles.featureText,
              { color: feature.included ? colors.foreground : colors.muted }
            ]}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Botão */}
      {!plan.current ? (
        <Pressable
          style={[styles.planButton, { backgroundColor: plan.color }]}
          onPress={() => Alert.alert(
            `Assinar ${plan.name}`,
            `Para assinar o plano ${plan.name} por ${plan.price}/mês, entre em contato:\n\ncontato@prontotecplus.app`,
            [{ text: "OK" }]
          )}
        >
          <Text style={styles.planButtonText}>Assinar {plan.name}</Text>
        </Pressable>
      ) : (
        <View style={[styles.planButtonOutline, { borderColor: plan.color }]}>
          <Text style={[styles.planButtonOutlineText, { color: plan.color }]}>Plano Atual</Text>
        </View>
      )}
    </View>
  );
}

export default function PlansScreen() {
  const colors = useColors();

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C", borderBottomColor: "#1A3A5C" }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Planos e Visibilidade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>
            Escolha seu nível de visibilidade
          </Text>
          <Text style={[styles.introDesc, { color: colors.muted }]}>
            Quanto maior o nível, mais destaque seu perfil tem nas buscas e mais clientes você alcança.
          </Text>
        </View>

        {/* Cards dos planos */}
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}

        {/* Nota de rodapé */}
        <View style={[styles.footerNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="info" size={18} color={colors.muted} />
          <Text style={[styles.footerNoteText, { color: colors.muted }]}>
            Para fazer upgrade ou tirar dúvidas sobre os planos, entre em contato pelo e-mail{" "}
            <Text style={{ color: "#1A3A5C", fontWeight: "600" }}>contato@prontotecplus.app</Text>
          </Text>
        </View>
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
  },
  backButton: {
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
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  intro: {
    gap: 6,
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  introDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 14,
    overflow: "hidden",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 17,
    fontWeight: "700",
  },
  planSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
  },
  priceNote: {
    fontSize: 13,
  },
  featureList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  planButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  planButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  planButtonOutline: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    marginTop: 4,
  },
  planButtonOutlineText: {
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  footerNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
