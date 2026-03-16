import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface StarRatingProps {
  rating: number;
  totalReviews?: number;
  small?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({
  rating,
  totalReviews,
  small = false,
  interactive = false,
  onRate,
}: StarRatingProps) {
  const colors = useColors();
  const size = small ? 12 : 20;

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating;
    const iconName = filled ? "star" : halfFilled ? "star-half" : "star-border";

    if (interactive) {
      return (
        <Pressable key={index} onPress={() => onRate?.(index + 1)}>
          <MaterialIcons name={iconName} size={size} color="#F5A623" />
        </Pressable>
      );
    }

    return <MaterialIcons key={index} name={iconName} size={size} color="#F5A623" />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.stars}>{[0, 1, 2, 3, 4].map(renderStar)}</View>
      {!interactive && (
        <Text style={[styles.ratingText, { color: colors.muted, fontSize: small ? 11 : 14 }]}>
          {Number(rating || 0).toFixed(1)}
          {totalReviews !== undefined && ` (${totalReviews})`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontWeight: "600",
  },
});
