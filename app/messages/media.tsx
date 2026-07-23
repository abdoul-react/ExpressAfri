import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Linking,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  spacing,
  radius,
  fontSize,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import { ScreenHeader, MediaViewer, type MediaViewerItem } from "@/components";
import { useConversationMedia } from "@/features/messages";

/** Résout l'URL d'une pièce jointe relative (/uploads/…) vers l'origine API. */
function resolveAttachment(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  const origin = base.replace(/\/api\/?$/, "");
  return origin ? `${origin}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

type Tab = "media" | "docs" | "links";

export default function ConversationMediaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("media");
  const [viewerItem, setViewerItem] = useState<MediaViewerItem | null>(null);
  const { media, isLoading } = useConversationMedia(id ?? "");

  const cell = (width - spacing.lg * 2 - spacing.xs * 2) / 3;

  const TABS: { key: Tab; label: string }[] = [
    { key: "media", label: t("messages.mediaTab") },
    { key: "docs", label: t("messages.docsTab") },
    { key: "links", label: t("messages.linksTab") },
  ];

  const empty = (label: string) => (
    <View style={styles.empty}>
      <Icon name="grid" size={40} color={colors.textMuted} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("messages.mediaAndLinks")} />

      {/* Onglets */}
      <View style={styles.tabs}>
        {TABS.map((tb) => (
          <Pressable
            key={tb.key}
            style={[styles.tab, tab === tb.key && styles.tabActive]}
            onPress={() => setTab(tb.key)}
          >
            <Text style={[styles.tabText, tab === tb.key && styles.tabTextActive]}>
              {tb.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "media" &&
        (media?.media?.length ? (
          <FlatList
            data={media.media}
            keyExtractor={(m) => m.id}
            numColumns={3}
            columnWrapperStyle={{ gap: spacing.xs }}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  setViewerItem({
                    url: resolveAttachment(item.url),
                    type: item.type === "video" ? "video" : "image",
                  })
                }
              >
                {item.type === "video" ? (
                  <View style={[styles.gridVideo, { width: cell, height: cell }]}>
                    <Icon name="play" size={26} color="#fff" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: resolveAttachment(item.url) }}
                    style={{ width: cell, height: cell, borderRadius: radius.sm, backgroundColor: colors.background }}
                    contentFit="cover"
                  />
                )}
              </Pressable>
            )}
          />
        ) : (
          !isLoading && empty(t("messages.noMedia"))
        ))}

      {tab === "docs" &&
        (media?.docs?.length ? (
          <FlatList
            data={media.docs}
            keyExtractor={(d) => d.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.docRow}
                onPress={() => Linking.openURL(resolveAttachment(item.url))}
              >
                <View style={styles.docIcon}>
                  <Icon name={item.type === "audio" ? "headset" : "feed"} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {item.name || (item.type === "audio" ? t("messages.attachAudio") : t("messages.attachment"))}
                  </Text>
                  <Text style={styles.docTime}>
                    {new Date(item.time).toLocaleDateString()}
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          />
        ) : (
          !isLoading && empty(t("messages.noDocs"))
        ))}

      {tab === "links" &&
        (media?.links?.length ? (
          <FlatList
            data={media.links}
            keyExtractor={(l) => l.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.docRow} onPress={() => Linking.openURL(item.url)}>
                <View style={styles.docIcon}>
                  <Icon name="globe" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkUrl} numberOfLines={1}>{item.url}</Text>
                  {item.text !== item.url ? (
                    <Text style={styles.docTime} numberOfLines={1}>{item.text}</Text>
                  ) : null}
                </View>
                <Icon name="chevronRight" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          />
        ) : (
          !isLoading && empty(t("messages.noLinks"))
        ))}

      <MediaViewer item={viewerItem} onClose={() => setViewerItem(null)} />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabs: {
      flexDirection: "row",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.pill,
      backgroundColor: colors.background,
    },
    tabActive: { backgroundColor: colors.inverse },
    tabText: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text },
    tabTextActive: { color: colors.textInverse },
    grid: { padding: spacing.lg, gap: spacing.xs },
    gridVideo: {
      borderRadius: radius.sm,
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
    },
    list: { padding: spacing.lg, gap: spacing.sm },
    docRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    docIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    docName: { fontSize: fontSize.md, fontWeight: "600", color: colors.text },
    docTime: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    linkUrl: { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    emptyText: { fontSize: fontSize.md, color: colors.textMuted },
  });
