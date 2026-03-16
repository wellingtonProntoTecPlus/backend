import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface ServiceAuthorizationResult {
  photoAuthorized: boolean;
  testimonialAuthorized: boolean;
  serviceId: string;
  technicianId: string;
  clientId: string;
  timestamp: string;
}

interface ServiceAuthorizationModalProps {
  visible: boolean;
  technicianName: string;
  serviceType: string;
  serviceId: string;
  technicianId: string;
  clientId: string;
  onComplete: (result: ServiceAuthorizationResult) => void;
  onDismiss: () => void;
}

export function ServiceAuthorizationModal({
  visible,
  technicianName,
  serviceType,
  serviceId,
  technicianId,
  clientId,
  onComplete,
  onDismiss,
}: ServiceAuthorizationModalProps) {
  const colors = useColors();
  const [photoAuth, setPhotoAuth] = useState<boolean | null>(null);
  const [testimonialAuth, setTestimonialAuth] = useState<boolean | null>(null);
  const [step, setStep] = useState<"photo" | "testimonial" | "done">("photo");

  const handlePhotoDecision = (authorized: boolean) => {
    setPhotoAuth(authorized);
    setStep("testimonial");
  };

  const handleTestimonialDecision = (authorized: boolean) => {
    setTestimonialAuth(authorized);
    setStep("done");

    const result: ServiceAuthorizationResult = {
      photoAuthorized: photoAuth ?? false,
      testimonialAuthorized: authorized,
      serviceId,
      technicianId,
      clientId,
      timestamp: new Date().toISOString(),
    };
    onComplete(result);
  };

  const handleClose = () => {
    setStep("photo");
    setPhotoAuth(null);
    setTestimonialAuth(null);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {step === "photo" && (
            <>
              <View style={styles.iconWrap}>
                <MaterialIcons name="photo-camera" size={36} color="#7C3AED" />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Autorização de Fotos
              </Text>
              <Text style={[styles.desc, { color: colors.muted }]}>
                O técnico <Text style={{ fontWeight: "700", color: colors.foreground }}>{technicianName}</Text> pode registrar fotos do serviço de <Text style={{ fontWeight: "700", color: colors.foreground }}>{serviceType}</Text> (antes/depois, equipamentos instalados) para divulgação profissional no ProntoTEC+?
              </Text>
              <View style={[styles.infoBox, { backgroundColor: "#7C3AED10", borderColor: "#7C3AED30" }]}>
                <MaterialIcons name="info" size={14} color="#7C3AED" />
                <Text style={[styles.infoText, { color: "#7C3AED" }]}>
                  As fotos não incluirão dados pessoais seus e serão usadas apenas para mostrar a qualidade do trabalho do técnico.
                </Text>
              </View>
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDeny, { borderColor: colors.border }]}
                  onPress={() => handlePhotoDecision(false)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={18} color="#EF4444" />
                  <Text style={[styles.btnText, { color: "#EF4444" }]}>NÃO AUTORIZO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAllow]}
                  onPress={() => handlePhotoDecision(true)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={[styles.btnText, { color: "#fff" }]}>AUTORIZO</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === "testimonial" && (
            <>
              <View style={styles.iconWrap}>
                <MaterialIcons name="record-voice-over" size={36} color="#059669" />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Autorização de Depoimento
              </Text>
              <Text style={[styles.desc, { color: colors.muted }]}>
                Você autoriza o técnico <Text style={{ fontWeight: "700", color: colors.foreground }}>{technicianName}</Text> a usar um depoimento seu (vídeo curto ou recomendação escrita) sobre o serviço para divulgação profissional no ProntoTEC+?
              </Text>
              <View style={[styles.infoBox, { backgroundColor: "#05966910", borderColor: "#05966930" }]}>
                <MaterialIcons name="info" size={14} color="#059669" />
                <Text style={[styles.infoText, { color: "#059669" }]}>
                  Seu depoimento ajuda outros clientes a escolherem bons profissionais e valoriza o trabalho do técnico.
                </Text>
              </View>
              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnDeny, { borderColor: colors.border }]}
                  onPress={() => handleTestimonialDecision(false)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="close" size={18} color="#EF4444" />
                  <Text style={[styles.btnText, { color: "#EF4444" }]}>NÃO AUTORIZO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAllowGreen]}
                  onPress={() => handleTestimonialDecision(true)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="check" size={18} color="#fff" />
                  <Text style={[styles.btnText, { color: "#fff" }]}>AUTORIZO</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === "done" && (
            <>
              <View style={styles.iconWrap}>
                <MaterialIcons name="check-circle" size={48} color="#22C55E" />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Respostas Registradas!
              </Text>
              <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <MaterialIcons
                    name={photoAuth ? "check-circle" : "cancel"}
                    size={18}
                    color={photoAuth ? "#22C55E" : "#EF4444"}
                  />
                  <Text style={[styles.summaryText, { color: colors.foreground }]}>
                    Fotos do serviço: <Text style={{ fontWeight: "700", color: photoAuth ? "#22C55E" : "#EF4444" }}>
                      {photoAuth ? "Autorizado" : "Não autorizado"}
                    </Text>
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <MaterialIcons
                    name={testimonialAuth ? "check-circle" : "cancel"}
                    size={18}
                    color={testimonialAuth ? "#22C55E" : "#EF4444"}
                  />
                  <Text style={[styles.summaryText, { color: colors.foreground }]}>
                    Depoimento: <Text style={{ fontWeight: "700", color: testimonialAuth ? "#22C55E" : "#EF4444" }}>
                      {testimonialAuth ? "Autorizado" : "Não autorizado"}
                    </Text>
                  </Text>
                </View>
              </View>
              <Text style={[styles.doneNote, { color: colors.muted }]}>
                Você pode alterar suas autorizações a qualquer momento em Perfil → Configurações → Autorização de Imagem.
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnAllow, { marginTop: 8 }]}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>Concluir</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  iconWrap: {
    alignSelf: "center",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  desc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnDeny: {
    borderWidth: 1.5,
  },
  btnAllow: {
    backgroundColor: "#1A3A5C",
  },
  btnAllowGreen: {
    backgroundColor: "#059669",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
  },
  doneNote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
