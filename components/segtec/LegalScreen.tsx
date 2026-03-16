import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";

export interface LegalSection {
  title: string;
  content: string;
  bullets?: string[];
}

interface LegalScreenProps {
  title: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  lastUpdated?: string;
  intro?: string;
  sections: LegalSection[];
  showAcceptButton?: boolean;
  onAccept?: () => void;
}

export function LegalScreen({
  title,
  subtitle,
  icon,
  iconColor = "#1A3A5C",
  lastUpdated,
  intro,
  sections,
  showAcceptButton,
  onAccept,
}: LegalScreenProps) {
  const colors = useColors();

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: "#1A3A5C" }]}>
          <View style={[styles.heroIcon, { backgroundColor: iconColor + "25" }]}>
            <MaterialIcons name={icon as any} size={36} color={iconColor === "#1A3A5C" ? "#F5A623" : iconColor} />
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle && <Text style={styles.heroSubtitle}>{subtitle}</Text>}
          {lastUpdated && (
            <View style={styles.dateBadge}>
              <MaterialIcons name="update" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.dateText}>Última atualização: {lastUpdated}</Text>
            </View>
          )}
        </View>

        {/* Intro */}
        {intro && (
          <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.introText, { color: colors.foreground }]}>{intro}</Text>
          </View>
        )}

        {/* Seções */}
        {sections.map((section, idx) => (
          <View key={idx} style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionNumber, { backgroundColor: "#1A3A5C" }]}>
                <Text style={styles.sectionNumberText}>{idx + 1}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.foreground }]}>{section.content}</Text>
            {section.bullets && section.bullets.length > 0 && (
              <View style={styles.bulletList}>
                {section.bullets.map((bullet, bIdx) => (
                  <View key={bIdx} style={styles.bulletItem}>
                    <View style={[styles.bulletDot, { backgroundColor: "#1A3A5C" }]} />
                    <Text style={[styles.bulletText, { color: colors.foreground }]}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Botão de aceite */}
        {showAcceptButton && onAccept && (
          <Pressable
            onPress={onAccept}
            style={({ pressed }) => [
              styles.acceptBtn,
              { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.acceptBtnText}>Li e concordo com estes termos</Text>
          </Pressable>
        )}

        <Text style={[styles.footer, { color: colors.muted }]}>
          ProntoTEC+ · Todos os direitos reservados
        </Text>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingBottom: 32,
    gap: 10,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    textAlign: "center",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
  },
  introCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  sectionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  bulletList: {
    gap: 6,
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  acceptBtn: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: "#1A3A5C",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
});
