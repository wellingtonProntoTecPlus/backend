import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const COLORS: Record<ToastType, { bg: string; icon: string; iconName: string }> = {
  success: { bg: "#22C55E", icon: "#fff", iconName: "check-circle" },
  error: { bg: "#EF4444", icon: "#fff", iconName: "error" },
  info: { bg: "#1A3A5C", icon: "#fff", iconName: "info" },
};

export function Toast({ visible, message, type = "success", duration = 2500, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const config = COLORS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bg, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <MaterialIcons name={config.iconName as any} size={20} color={config.icon} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
