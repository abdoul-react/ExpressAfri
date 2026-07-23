import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  /** Mode statique (bouton qui ouvre l'écran recherche) ou champ actif. */
  editable?: boolean;
  value?: string;
  placeholder?: string;
  onChangeText?: (t: string) => void;
  onPress?: () => void;
  onSubmit?: () => void;
  onCameraPress?: () => void;
  showCamera?: boolean;
};

export function SearchBar({
  editable = false,
  value,
  placeholder,
  onChangeText,
  onPress,
  onSubmit,
  onCameraPress,
  showCamera = true,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t } = useTranslation();
  const ph = placeholder ?? t("common.searchPlaceholder");

  const Inner = (
    <View style={[styles.bar, editable && styles.barFill]}>
      {showCamera && (
        <Pressable hitSlop={6} onPress={onCameraPress}>
          <Icon name="camera" size={22} color={colors.primary} />
        </Pressable>
      )}
      {showCamera && <View style={styles.divider} />}
      {editable ? (
        <TextInput
          style={styles.input}
          value={value}
          placeholder={ph}
          placeholderTextColor={colors.textMuted}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoFocus
        />
      ) : (
        <Text style={styles.placeholder} numberOfLines={1}>
          {ph}
        </Text>
      )}
      <Pressable
        style={styles.searchBtn}
        hitSlop={6}
        onPress={onSubmit ?? onPress}
      >
        <Icon name="search" size={18} color={colors.white} />
      </Pressable>
    </View>
  );

  if (editable) return Inner;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {Inner}
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      paddingLeft: spacing.md,
      paddingRight: 4,
      height: 44,
      gap: spacing.sm,
    },
    barFill: { flex: 1 },
    divider: { width: 1, height: 20, backgroundColor: colors.primary },
    input: { flex: 1, fontSize: fontSize.md, color: colors.text, padding: 0 },
    placeholder: { flex: 1, fontSize: fontSize.md, color: colors.textMuted },
    searchBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
