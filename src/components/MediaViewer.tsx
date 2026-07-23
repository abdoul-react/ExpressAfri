import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { spacing, fontSize, useColors } from "@/design-system";
import { Icon } from "@/icons";

export type MediaViewerItem = {
  url: string;
  type: "image" | "video";
  caption?: string | null;
};

type Props = {
  item: MediaViewerItem | null;
  onClose: () => void;
};

/** Vidéo plein écran avec contrôles natifs. */
function FullscreenVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls
    />
  );
}

/**
 * Visionneuse média plein écran (photo zoomable par pincement/double-tap, vidéo avec lecteur).
 * Fermée par la croix ou un glissement vertical.
 */
export function MediaViewer({ item, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [loading, setLoading] = useState(true);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const reset = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
    setLoading(true);
  }, [scale, savedScale, tx, ty, savedTx, savedTy]);

  // Réinitialiser le zoom à chaque nouveau média
  const prevUrl = useRef<string | null>(null);
  useEffect(() => {
    if (item?.url !== prevUrl.current) {
      prevUrl.current = item?.url ?? null;
      reset();
    }
  }, [item?.url, reset]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(6, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      } else {
        // Non zoomé : glisser verticalement pour fermer
        ty.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      } else if (Math.abs(e.translationY) > 120) {
        runOnJS(onClose)();
      } else {
        ty.value = withTiming(0);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // runOnJS wrapper (worklet → JS)
  if (!item) return null;

  const { width } = Dimensions.get("window");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {item.type === "image" ? (
          <GestureDetector gesture={composed}>
            <Animated.View style={[styles.mediaWrap, animStyle]}>
              <Image
                source={{ uri: item.url }}
                style={{ width, height: "100%" }}
                contentFit="contain"
                onLoadEnd={() => setLoading(false)}
              />
            </Animated.View>
          </GestureDetector>
        ) : (
          <FullscreenVideo url={item.url} />
        )}

        {loading && item.type === "image" && (
          <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.white} size="large" />
        )}

        {/* Fermer */}
        <Pressable
          style={[styles.closeBtn, { top: insets.top + spacing.md }]}
          hitSlop={12}
          onPress={onClose}
        >
          <Icon name="close" size={26} color="#fff" />
        </Pressable>

        {/* Légende */}
        {item.caption ? (
          <View style={[styles.captionWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  mediaWrap: { flex: 1, justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  captionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  caption: { color: "#fff", fontSize: fontSize.md, lineHeight: 20 },
});
