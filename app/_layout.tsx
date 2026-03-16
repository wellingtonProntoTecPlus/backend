import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppProvider } from "@/lib/app-context";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { requestNotificationPermission, setupNotificationHandler, setupNotificationResponseListener, notifyNewMessage } from "@/lib/notifications";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAppContext } from "@/lib/app-context";
import { ActiveChatProvider, useActiveChatId } from "@/lib/active-chat-context";
import Constants from "expo-constants";

// Suprimir aviso de remote push no Expo Go (SDK 53+) — notificações locais continuam funcionando
if (Constants.executionEnvironment === "storeClient") {
  const _origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("expo-notifications") &&
      args[0].includes("remote notifications")
    ) {
      return; // silencia apenas este aviso específico
    }
    _origError(...args);
  };
}

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

// Componente interno para registrar push token após login
function PushRegistrar() {
  const { user } = useAppContext();
  usePushNotifications(!!user);
  return null;
}

/**
 * Monitor global de mensagens não lidas.
 * Faz polling a cada 5 segundos e dispara notificação local com som
 * quando o usuário recebe uma nova mensagem e não está na tela do chat.
 */
function GlobalChatMonitor() {
  const { user } = useAppContext();
  const { getActiveChatId } = useActiveChatId();
  const seenMessageIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const prevUserIdRef = useRef<string | null>(null);

  const { data: unreadMessages = [] } = trpc.chat.getUnreadSummary.useQuery(undefined, {
    enabled: !!user && Platform.OS !== "web",
    refetchInterval: 5000,
    // true = continua verificando mesmo quando o app está em segundo plano
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!user || Platform.OS === "web") return;

    // Resetar quando o usuário muda (logout/login)
    if (prevUserIdRef.current !== user.id) {
      seenMessageIdsRef.current = new Set();
      isFirstLoadRef.current = true;
      prevUserIdRef.current = user.id;
    }

    // Na primeira carga, apenas registrar os IDs existentes sem notificar
    if (isFirstLoadRef.current) {
      unreadMessages.forEach((m) => seenMessageIdsRef.current.add(m.id));
      isFirstLoadRef.current = false;
      return;
    }

    // Verificar se há mensagens novas (IDs que não vimos antes)
    const newMessages = unreadMessages.filter((m) => !seenMessageIdsRef.current.has(m.id));
    if (newMessages.length === 0) return;

    // Registrar os novos IDs
    newMessages.forEach((m) => seenMessageIdsRef.current.add(m.id));

    // Obter o ID do chat atualmente aberto
    const activeChatId = getActiveChatId();

    // Disparar notificação local apenas para mensagens de chats que não estão abertos
    newMessages.forEach((msg) => {
      // Se o usuário já está no chat desta mensagem, não notificar (o chat já toca o som)
      if (activeChatId !== null && activeChatId === msg.requestId) return;
      notifyNewMessage({
        senderName: msg.senderName,
        message: msg.content,
      }).catch(() => {});
    });
  }, [unreadMessages, user]);

  return null;
}

// Componente interno para sincronizar perfil do técnico com o servidor ao iniciar o app
function TechnicianProfileSync() {
  const { user, updateTechnicianProfile } = useAppContext();
  const isTecnico = user.mode === "tecnico";

  const { data: serverProfile } = trpc.technicians.getMyProfile.useQuery(undefined, {
    enabled: isTecnico,
    staleTime: 60000, // 1 minuto
  });

  useEffect(() => {
    if (!serverProfile) return;
    const synced = {
      id: `server_${serverProfile.id}`,
      name: serverProfile.name,
      companyName: serverProfile.companyName || serverProfile.name,
      document: serverProfile.document || "",
      city: serverProfile.city,
      state: serverProfile.state,
      type: (serverProfile.type as any) || "autonomo",
      badge: (serverProfile.badge as any) || "autonomo",
      level: (serverProfile.level as any) || "autonomo",
      avatar: serverProfile.avatarUrl || serverProfile.photoUri || "",
      companyLogoUrl: serverProfile.companyLogoUrl || undefined,
      phone: serverProfile.phone,
      whatsapp: serverProfile.whatsapp || serverProfile.phone,
      description: serverProfile.description || "",
      specialties: (serverProfile.specialties as any) || [],
      rating: serverProfile.rating || 5.0,
      totalReviews: serverProfile.totalReviews || 0,
      reviews: [],
      totalServices: serverProfile.totalServices || 0,
      yearsExperience: serverProfile.yearsExperience || 0,
      workPhotos: [],
      planType: (serverProfile.planType as any) || "gratuito",
      availability: (serverProfile.availability as any) || "disponivel",
      address: {
        street: serverProfile.addressStreet || "",
        number: serverProfile.addressNumber || "",
        complement: serverProfile.addressComplement || "",
        neighborhood: serverProfile.addressNeighborhood || "",
        city: serverProfile.city,
        state: serverProfile.state,
        zipCode: serverProfile.addressZipCode || "",
      },
    };
    updateTechnicianProfile(synced as any);
  }, [serverProfile]);

  return null;
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
    // Configurar handler global de notificações (deve ser chamado antes de qualquer uso)
    setupNotificationHandler();
    // Solicitar permissão de notificações e configurar canais Android
    if (Platform.OS !== "web") {
      requestNotificationPermission();
    }
    // Listener de toque em notificações — navega para a tela correta
    const cleanup = setupNotificationResponseListener();
    return cleanup;
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ActiveChatProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <PushRegistrar />
            <GlobalChatMonitor />
            <TechnicianProfileSync />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="oauth/callback" />
              <Stack.Screen name="technician/[id]" />
              <Stack.Screen name="request/new" />
              <Stack.Screen name="request/[id]" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="register-technician" />
              <Stack.Screen name="about" />
              <Stack.Screen name="legal/terms" />
              <Stack.Screen name="legal/privacy" />
              <Stack.Screen name="legal/technician-guidelines" />
              <Stack.Screen name="legal/cancellation" />
              <Stack.Screen name="legal/verification" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/register" />
              <Stack.Screen name="auth/register-client" />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="technician-panel" />
              <Stack.Screen name="review/[id]" />
              <Stack.Screen name="map" />
              <Stack.Screen name="quotes/[id]" />
              <Stack.Screen name="plans" />
              <Stack.Screen name="technician-review" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="satisfied-clients" />
            </Stack>
            <StatusBar style="auto" />
          </QueryClientProvider>
        </trpc.Provider>
        </ActiveChatProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
