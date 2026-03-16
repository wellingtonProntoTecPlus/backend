import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ServiceCategoryButtonProps {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  selected?: boolean;
}

export function ServiceCategoryButton({
  label,
  icon,
  color,
  onPress,
  selected = false,
}: ServiceCategoryButtonProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: selected ? color + "20" : colors.surface,
          borderColor: selected ? color : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        <MaterialIcons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.label, { color: selected ? color : colors.foreground }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 80,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
});
