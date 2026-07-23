import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { useColors, useThemedStyles, type Colors } from "@/design-system";

type Props = {
  uri?: string;
  name?: string;
  size?: number;
};

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ uri, name, size = 48 }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const hasImage = !!uri && uri.startsWith("http");

  return hasImage ? (
    <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} contentFit="cover" />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }]}>
      <Text style={[styles.initials, { fontSize: size * 0.33 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  avatar: { backgroundColor: colors.background },
  fallback: { alignItems: "center", justifyContent: "center" },
  initials: { color: colors.white, fontWeight: "800" },
});
