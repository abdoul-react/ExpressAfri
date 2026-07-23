import React from "react";
import { KeyboardAvoidingView, StyleSheet, type ViewStyle } from "react-native";

/**
 * Conteneur d'écran qui décale le contenu quand le clavier s'ouvre.
 *
 * Avec l'edge-to-edge activé par défaut (Expo SDK 53+), le mode Android
 * « adjustResize » ne redimensionne plus la fenêtre : sans ce wrapper le
 * clavier recouvre les champs de saisie. `behavior="padding"` fonctionne
 * sur les deux plateformes dans ce contexte.
 *
 * Usage : remplacer la <View style={styles.container}> racine de l'écran.
 */
export function KeyboardScreen({
  children,
  style,
  offset = 0,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Hauteur d'un header fixe au-dessus de l'écran (rare avec expo-router). */
  offset?: number;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior="padding"
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
