import {
  spacing,
  typography,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon, type IconName } from "@/icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";

type Status = "loading" | "empty" | "error";

type Props = {
  status: Status;
  title: string;
  hint?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
};

const defaultIcon: Record<Exclude<Status, "loading">, IconName> = {
  empty: "box",
  error: "close",
};

export function StatusState({
  status,
  title,
  hint,
  icon,
  actionLabel,
  onAction,
  children,
}: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const iconName =
    icon ?? (status === "loading" ? undefined : defaultIcon[status]);

  return (
    <View style={styles.container}>
      {status === "loading" ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />
      ) : (
        <View style={[styles.circle, status === "error" && styles.circleError]}>
          <Icon
            name={iconName ?? "box"}
            size={32}
            color={status === "error" ? colors.sale : colors.textMuted}
          />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          fullWidth
          style={styles.actionButton}
        />
      ) : null}
      {children}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xxxl,
      gap: spacing.sm,
    },
    spinner: {
      marginBottom: spacing.md,
    },
    circle: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    circleError: {
      backgroundColor: colors.saleSoft,
    },
    title: {
      ...typography.title,
      color: colors.text,
      textAlign: "center",
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    actionButton: {
      marginTop: spacing.lg,
    },
  });
