import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/useColors";
import { trpc } from "@/lib/trpc";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const colors = useColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>
        {value || "—"}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function TechnicianReviewScreen() {
  const colors = useColors();
  const { data: profile, isLoading } = trpc.technicians.getMyProfile.useQuery();

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1A3A5C" />
          <Text style={{ color: colors.muted, marginTop: 12 }}>Carregando perfil...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <MaterialIcons name="assignment" size={64} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Cadastro não encontrado
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Você ainda não completou seu cadastro como técnico.
          </Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: "#1A3A5C" }]}
            onPress={() => router.push("/register-technician" as any)}
          >
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Completar Cadastro</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const typeLabel =
    profile.type === "empresa"
      ? "Empresa"
      : profile.type === "certificada"
      ? "Certificada"
      : "Autônomo";

  const levelLabel =
    profile.level === "parceiro_prontotec"
      ? "Parceiro ProntoTEC+"
      : profile.level === "empresa_verificada"
      ? "Empresa Verificada"
      : "Autônomo";

  const addressParts = [
    profile.addressStreet,
    profile.addressNumber,
    profile.addressComplement,
    profile.addressNeighborhood,
    profile.addressZipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revisão do Cadastro</Text>
        <TouchableOpacity
          style={styles.editIconButton}
          onPress={() => router.push("/register-technician" as any)}
        >
          <MaterialIcons name="edit" size={22} color="#F5A623" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Avatar + Nome */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: "#1A3A5C20" }]}>
                <MaterialIcons name="person" size={40} color="#1A3A5C" />
              </View>
            )}
            {profile.companyLogoUrl && (
              <View style={styles.companyLogoBadge}>
                <Image source={{ uri: profile.companyLogoUrl }} style={styles.companyLogo} />
              </View>
            )}
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
          {profile.companyName && (
            <Text style={[styles.profileCompany, { color: colors.muted }]}>{profile.companyName}</Text>
          )}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: "#1A3A5C15" }]}>
              <Text style={[styles.badgeText, { color: "#1A3A5C" }]}>{typeLabel}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#F5A62315" }]}>
              <Text style={[styles.badgeText, { color: "#B8760A" }]}>{levelLabel}</Text>
            </View>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    profile.availability === "disponivel" ? "#22C55E15" : "#EF444415",
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      profile.availability === "disponivel" ? "#16A34A" : "#DC2626",
                  },
                ]}
              >
                {profile.availability === "disponivel"
                  ? "Disponível"
                  : profile.availability === "agenda_cheia"
                  ? "Agenda Cheia"
                  : "Indisponível"}
              </Text>
            </View>
          </View>
        </View>

        {/* Dados Pessoais */}
        <Section title="DADOS PESSOAIS">
          <InfoRow label="Nome completo" value={profile.name} />
          <InfoRow label="Tipo" value={typeLabel} />
          {profile.document && (
            <InfoRow
              label={profile.type === "empresa" ? "CNPJ" : "CPF"}
              value={profile.document}
            />
          )}
          {profile.description && (
            <InfoRow label="Descrição" value={profile.description} />
          )}
          <InfoRow
            label="Experiência"
            value={
              profile.yearsExperience
                ? `${profile.yearsExperience} ${profile.yearsExperience === 1 ? "ano" : "anos"}`
                : undefined
            }
          />
        </Section>

        {/* Contato */}
        <Section title="CONTATO">
          <InfoRow label="Telefone" value={profile.phone} />
          <InfoRow label="WhatsApp" value={profile.whatsapp} />
        </Section>

        {/* Endereço */}
        <Section title="ENDEREÇO">
          <InfoRow label="CEP" value={profile.addressZipCode} />
          <InfoRow label="Logradouro" value={addressParts || undefined} />
          <InfoRow label="Cidade / Estado" value={`${profile.city} - ${profile.state}`} />
        </Section>

        {/* Serviços */}
        {profile.specialties && profile.specialties.length > 0 && (
          <Section title="ESPECIALIDADES">
            <View style={styles.specialtiesWrap}>
              {(profile.specialties as string[]).map((s, i) => (
                <View key={i} style={[styles.specialtyChip, { backgroundColor: "#1A3A5C15" }]}>
                  <Text style={[styles.specialtyText, { color: "#1A3A5C" }]}>{s}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Avaliação */}
        <Section title="AVALIAÇÃO">
          <InfoRow
            label="Nota média"
            value={`${Number(profile.rating || 0).toFixed(1)} ★`}
          />
          <InfoRow label="Total de avaliações" value={String(profile.totalReviews ?? 0)} />
          <InfoRow label="Serviços realizados" value={String(profile.totalServices ?? 0)} />
        </Section>

        {/* Plano */}
        <Section title="PLANO">
          <InfoRow
            label="Plano atual"
            value={
              profile.planType === "destaque"
                ? "Destaque"
                : profile.planType === "basico"
                ? "Básico"
                : "Gratuito"
            }
          />
        </Section>

        {/* Botão Editar */}
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: "#1A3A5C", marginTop: 8 }]}
          onPress={() => router.push("/register-technician" as any)}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Editar Cadastro</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  editIconButton: { padding: 4 },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarRow: { position: "relative", marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  companyLogoBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  companyLogo: { width: "100%", height: "100%" },
  profileName: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileCompany: { fontSize: 14, marginBottom: 10 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "500", flex: 2, textAlign: "right" },
  specialtiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  specialtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  specialtyText: { fontSize: 12, fontWeight: "500" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  editButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", marginBottom: 24 },
});
