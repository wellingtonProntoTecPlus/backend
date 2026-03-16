import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  FlatList,
  Image,
  ViewToken,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";

const SLIDES = [
  {
    icon: "search" as const,
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
    title: "Encontre Técnicos Perto de Você",
    description:
      "Acesse uma rede de profissionais especializados em segurança eletrônica na sua cidade. Alarmes, câmeras, portões e muito mais.",
  },
  {
    icon: "flash-on" as const,
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    title: "Solicite em Minutos",
    description:
      "Descreva o problema, escolha o técnico e solicite o atendimento. Em emergências, acione o modo urgente e receba resposta imediata.",
  },
  {
    icon: "verified" as const,
    iconBg: "#DCFCE7",
    iconColor: "#16A34A",
    title: "Profissionais Verificados",
    description:
      "Todos os técnicos passam por verificação. Avalie após o serviço e ajude a manter o padrão de qualidade da plataforma.",
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem("@prontotec:onboarding_done", "true");
    router.replace("/auth/login" as any);
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={[styles.slide, { width }]}>
      {/* Ilustração */}
      <View style={styles.illustrationWrap}>
        <View style={[styles.outerCircle, { backgroundColor: item.iconBg + "60" }]}>
          <View style={[styles.innerCircle, { backgroundColor: item.iconBg }]}>
            <MaterialIcons name={item.icon} size={72} color={item.iconColor} />
          </View>
        </View>
        {/* Badge com logo oficial */}
        <View style={styles.decoBadge}>
          <Image
            source={require("@/assets/images/logo-prontotec.png")}
            style={{ width: 110, height: 44 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Texto */}
      <View style={styles.textWrap}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDesc}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      {/* Skip */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        {currentIndex < SLIDES.length - 1 && (
          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        )}
      </View>

      {/* Slides com FlatList */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={{ flex: 1 }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        scrollEventThrottle={16}
      />

      {/* Dots + Botão */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex
                  ? { backgroundColor: "#1A3A5C", width: 24 }
                  : { backgroundColor: "#CBD5E1", width: 8 },
              ]}
            />
          ))}
        </View>

        {/* Botão */}
        <Pressable
          onPress={goToNext}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: "#1A3A5C", opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex < SLIDES.length - 1 ? "Próximo" : "Começar"}
          </Text>
          <MaterialIcons
            name={currentIndex < SLIDES.length - 1 ? "arrow-forward" : "check"}
            size={20}
            color="#fff"
          />
        </Pressable>

        {/* Login link */}
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={styles.loginLink}>
            Já tenho conta —{" "}
            <Text style={{ color: "#1A3A5C", fontWeight: "700" }}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  outerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  decoBadge: {
    position: "absolute",
    bottom: 10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  textWrap: {
    alignItems: "center",
    gap: 12,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 32,
    color: "#1A3A5C",
  },
  slideDesc: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loginLink: {
    fontSize: 14,
    color: "#64748B",
  },
});
