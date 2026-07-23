import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { spacing, fontSize } from "@/design-system";
import { Icon } from "@/icons";

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Bulle de message vocal : bouton lecture/pause + barre de progression + durée.
 * `light` = sur fond primaire (mes messages) → éléments blancs.
 */
export function AudioBubble({ url, light }: { url: string; light?: boolean }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  // Revenir au début une fois la lecture terminée
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const playing = status.playing;
  const duration = status.duration || 0;
  const position = status.currentTime || 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  const fg = light ? "#fff" : "#333";
  const track = light ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.15)";

  return (
    <View style={styles.row}>
      <Pressable
        hitSlop={8}
        onPress={() => (playing ? player.pause() : player.play())}
        style={[styles.playBtn, { backgroundColor: light ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)" }]}
      >
        <Icon name={playing ? "minus" : "play"} size={18} color={fg} />
      </Pressable>
      <View style={styles.trackWrap}>
        <View style={[styles.track, { backgroundColor: track }]}>
          <View style={[styles.fill, { backgroundColor: fg, width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.time, { color: fg }]}>
          {fmt(playing || position > 0 ? position : duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 180,
    paddingVertical: 2,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  trackWrap: { flex: 1, gap: 3 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  time: { fontSize: fontSize.xs, fontWeight: "600" },
});
