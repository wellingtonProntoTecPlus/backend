import { Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform, View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAppContext } from "@/lib/app-context";
import { useProfileSync } from "@/hooks/use-profile-sync";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? "99+" : String(count)}</Text>
    </View>
  );
}

function RequestsTabIcon({ color }: { color: string }) {
  const { data: unreadCount } = trpc.chat.totalUnread.useQuery(undefined, {
    refetchInterval: 5000, // atualiza a cada 5s
    refetchIntervalInBackground: true, // continua em segundo plano
  });
  const count = unreadCount ?? 0;
  return (
    <View style={{ position: "relative" }}>
      <IconSymbol size={26} name="list.bullet" color={color} />
      <UnreadBadge count={count} />
    </View>
  );
}

export default function TabLayout() {
  // Todos os hooks ANTES de qualquer early return (regra dos hooks do React)
  const { isAuthenticated, authLoading } = useAppContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Sincroniza perfil completo do servidor ao iniciar (resolve persistência de dados)
  useProfileSync();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/onboarding" as any);
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1A3A5C" }}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  if (!isAuthenticated) return null;

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1A3A5C",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color }) => <RequestsTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
