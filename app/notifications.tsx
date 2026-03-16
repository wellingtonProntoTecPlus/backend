import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: "pedido" | "aceito" | "mensagem" | "sistema";
  timestamp: string;
  read: boolean;
  requestId?: string;
}

const STORAGE_KEY = "@prontotec:notifications";

const TYPE_CONFIG: Record<NotificationItem["type"], { icon: string; color: string }> = {
  pedido: { icon: "assignment", color: "#F59E0B" },
  aceito: { icon: "check-circle", color: "#22C55E" },
  mensagem: { icon: "chat", color: "#3B82F6" },
  sistema: { icon: "notifications", color: "#1A3A5C" },
};

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ontem";
  return `${days} dias atrás`;
}

export async function addNotificationToHistory(item: Omit<NotificationItem, "id" | "read" | "timestamp">) {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: NotificationItem[] = stored ? JSON.parse(stored) : [];
    const newItem: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString(),
    };
    // Manter apenas os últimos 50
    const updated = [newItem, ...existing].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const items: NotificationItem[] = stored ? JSON.parse(stored) : [];
      setNotifications(items);
      // Marcar todas como lidas
      const marked = items.map((n) => ({ ...n, read: true }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(marked));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setNotifications([]);
  };

  const handlePress = (item: NotificationItem) => {
    if (item.requestId) {
      router.push({ pathname: "/request/[id]", params: { id: item.requestId } } as any);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const config = TYPE_CONFIG[item.type];
    return (
      <Pressable
        onPress={() => handlePress(item)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: item.read ? colors.surface : colors.surface + "ee", borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: config.color + "18" }]}>
          <MaterialIcons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[styles.time, { color: colors.muted }]}>
            {formatRelativeTime(item.timestamp)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#1A3A5C" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearText}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="notifications-none" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem notificações</Text>
            <Text style={[styles.emptySub, { color: colors.muted }]}>
              Suas notificações de pedidos, mensagens e atualizações aparecerão aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  backBtn: { padding: 4, width: 36 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  clearText: { color: "#F5A623", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: 14, fontWeight: "700", flex: 1 },
  body: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1A3A5C",
    marginLeft: 6,
    flexShrink: 0,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
