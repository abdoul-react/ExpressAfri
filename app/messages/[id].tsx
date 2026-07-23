import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  spacing,
  radius,
  fontSize,
  shadows,
  useColors,
  useThemedStyles,
  type Colors,
} from "@/design-system";
import { Icon } from "@/icons";
import type { Message } from "@/types";
import { MediaViewer, type MediaViewerItem, AudioBubble } from "@/components";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useConversation,
  useSendMessage,
  useUploadAttachment,
  useDeleteMessage,
  useArchiveConversation,
  chatService,
} from "@/features/messages";

/** Date ISO → heure lisible (HH:MM aujourd'hui, sinon date courte). */
function formatMsgTime(time: string): string {
  if (!time || !time.includes("T")) return time; // déjà formatée ("À l'instant"…)
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

/** Aperçu lisible d'un message pour la citation (jamais l'URL/nom de fichier brut). */
function msgPreview(m: Message, t: (k: string) => string): string {
  if (m.type === "image") return m.text ? `📷 ${m.text}` : `📷 ${t("messages.photo")}`;
  if (m.type === "video") return m.text ? `🎥 ${m.text}` : "🎥 Vidéo";
  if (m.type === "audio") return `🎤 ${t("messages.attachAudio")}`;
  if (m.type === "pdf") return `📄 ${m.attachmentName || t("messages.attachment")}`;
  return m.text;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerItem, setViewerItem] = useState<MediaViewerItem | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);
  const { conversation, isLoading } = useConversation(id ?? "");
  const sendMessageMutation = useSendMessage(id ?? "");
  const uploadMutation = useUploadAttachment(id ?? "");
  const deleteMutation = useDeleteMessage(id ?? "");
  const archiveMutation = useArchiveConversation();
  // Messages en cours d'envoi (affichage optimiste avant confirmation serveur)
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Marquer les messages vendeur comme lus à l'ouverture
  useEffect(() => {
    if (id && conversation) {
      chatService.markAsRead(id).catch(() => {});
    }
  }, [id, conversation?.id]);

  useEffect(() => {
    const onShow = (e: { endCoordinates: { height: number } }) =>
      setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const show = Keyboard.addListener("keyboardDidShow", onShow);
    const hide = Keyboard.addListener("keyboardDidHide", onHide);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Fusion serveur + envois en attente (dédupliqués une fois confirmés par le refetch)
  const serverMessages = conversation?.messages ?? [];
  const allMessages = [
    ...serverMessages,
    ...pendingMessages.filter(
      (p) =>
        !serverMessages.some(
          (m) =>
            m.sentByMe &&
            ((p.attachmentUrl && m.attachmentUrl === p.attachmentUrl) ||
              (!p.attachmentUrl && m.text === p.text)),
        ),
    ),
  ];

  useEffect(() => {
    if (scrollRef.current && allMessages.length > 0) {
      scrollRef.current.scrollToEnd({ animated: false });
    }
  }, [conversation?.id, allMessages.length]);

  // Scroll to end when keyboard opens
  useEffect(() => {
    if (keyboardHeight > 0 && scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [keyboardHeight]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/messages");
    }
  }, [router]);

  const scrollSoon = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const replyId = replyTo?.id ?? null;
    const replyText = replyTo ? msgPreview(replyTo, t) : null;
    // Affichage optimiste immédiat, puis envoi réel au serveur
    const newMsg: Message = {
      id: `local-${text}-${allMessages.length}`,
      text,
      sentByMe: true,
      time: t("messages.justNow"),
      type: "text",
      replyToId: replyId,
      replyToText: replyText,
    };
    setPendingMessages((prev) => [...prev, newMsg]);
    setInput("");
    setReplyTo(null);
    sendMessageMutation.mutate(
      { content: text, type: "text", replyToId: replyId },
      {
        onError: (err) => {
          setPendingMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
          setInput(text);
          // 403 = client bloqué par l'administrateur
          if (String(err).includes("403")) {
            Alert.alert(
              t("common.error", "Erreur"),
              t("messages.blocked", "Vous ne pouvez plus envoyer de messages dans cette conversation."),
            );
          }
        },
      },
    );
    scrollSoon();
  }, [input, replyTo, allMessages.length, t, sendMessageMutation, scrollSoon]);

  // Envoie une pièce jointe : upload puis message. La légende vient de
  // l'écran d'aperçu (façon WhatsApp) — le vocal part sans légende.
  const sendAttachment = useCallback(
    async (localUri: string, captionText = "") => {
      const caption = captionText.trim();
      const replyId = replyTo?.id ?? null;
      setUploading(true);
      try {
        const uploaded = await uploadMutation.mutateAsync(localUri);
        const optimistic: Message = {
          id: `local-att-${uploaded.url}`,
          text: caption,
          sentByMe: true,
          time: t("messages.justNow"),
          type: uploaded.type,
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
          replyToId: replyId,
          replyToText: replyTo ? msgPreview(replyTo, t) : null,
        };
        setPendingMessages((prev) => [...prev, optimistic]);
        setReplyTo(null);
        await sendMessageMutation.mutateAsync({
          content: caption || undefined,
          type: uploaded.type,
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.name,
          replyToId: replyId,
        });
        scrollSoon();
      } catch {
        setPendingMessages((prev) => prev.filter((m) => m.attachmentUrl !== localUri));
        Alert.alert(t("common.error", "Erreur"), t("messages.uploadFailed"));
      } finally {
        setUploading(false);
      }
    },
    [replyTo, t, uploadMutation, sendMessageMutation, scrollSoon],
  );

  // ── Aperçu avant envoi (façon WhatsApp) : le média choisi s'affiche en
  // grand avec un champ légende — l'envoi ne part qu'à la confirmation. ──
  const [preview, setPreview] = useState<{ uri: string; kind: "image" | "video" | "pdf"; name?: string } | null>(null);
  const [previewCaption, setPreviewCaption] = useState("");

  const confirmPreviewSend = useCallback(() => {
    if (!preview) return;
    const { uri } = preview;
    const caption = previewCaption;
    setPreview(null);
    setPreviewCaption("");
    sendAttachment(uri, caption);
  }, [preview, previewCaption, sendAttachment]);

  const pickFromGallery = useCallback(async () => {
    setAttachOpen(false);
    const res = await ImagePicker.launchImageLibraryAsync({
      // Photos ET vidéos, comme WhatsApp
      mediaTypes: ["images", "videos"],
      quality: 0.7,
      videoMaxDuration: 120,
    });
    const asset = !res.canceled ? res.assets[0] : null;
    if (asset?.uri) {
      setPreviewCaption("");
      setPreview({ uri: asset.uri, kind: asset.type === "video" ? "video" : "image" });
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    setAttachOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) {
      setPreviewCaption("");
      setPreview({ uri: res.assets[0].uri, kind: "image" });
    }
  }, []);

  const pickDocument = useCallback(async () => {
    setAttachOpen(false);
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setPreviewCaption("");
      setPreview({ uri: res.assets[0].uri, kind: "pdf", name: res.assets[0].name });
    }
  }, []);

  // ── Message vocal : appui pour démarrer, appui pour arrêter et envoyer ──
  const startRecording = useCallback(async () => {
    setAttachOpen(false);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }, [audioRecorder]);

  const stopRecordingAndSend = useCallback(async () => {
    await audioRecorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (audioRecorder.uri) sendAttachment(audioRecorder.uri);
  }, [audioRecorder, sendAttachment]);

  const cancelRecording = useCallback(async () => {
    await audioRecorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  }, [audioRecorder]);

  const onLongPressMessage = useCallback(
    (msg: Message) => {
      if (msg.deleted) return;
      const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [
        { text: t("messages.reply"), onPress: () => setReplyTo(msg) },
      ];
      if (msg.sentByMe) {
        options.push({
          text: t("messages.delete"),
          style: "destructive",
          onPress: () =>
            Alert.alert(t("messages.deleteConfirmTitle"), t("messages.deleteConfirmBody"), [
              { text: t("messages.cancel"), style: "cancel" },
              {
                text: t("messages.delete"),
                style: "destructive",
                onPress: () => {
                  setPendingMessages((prev) => prev.filter((m) => m.id !== msg.id));
                  if (!msg.id.startsWith("local-")) deleteMutation.mutate(msg.id);
                },
              },
            ]),
        });
      }
      options.push({ text: t("messages.cancel"), style: "cancel" });
      Alert.alert(conversation?.name ?? "", undefined, options);
    },
    [t, conversation?.name, deleteMutation],
  );

  const onArchive = useCallback(() => {
    setMenuOpen(false);
    if (!id) return;
    archiveMutation.mutate(id, { onSuccess: goBack });
  }, [id, archiveMutation, goBack]);

  if (!id) return null;

  if (isLoading || !conversation) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={goBack}>
            <Icon name="chevronLeft" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("messages.title")}</Text>
          <View style={{ width: 28 }} />
        </View>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>
              {t("common.comingSoon")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: keyboardHeight }]}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={goBack}>
          <Icon name="chevronLeft" size={28} color={colors.text} />
        </Pressable>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, { alignItems: "center", justifyContent: "center" }]}>
            <Icon name="store" size={18} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{conversation.name}</Text>
          <Text style={styles.headerStatus}>
            {conversation.online ? t("messages.online") : (conversation.lastTime ? formatMsgTime(conversation.lastTime) : t("messages.title"))}
          </Text>
        </View>
        <Pressable hitSlop={8} style={styles.headerAction} onPress={() => setMenuOpen(true)}>
          <Icon name="more" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {conversation.orderRef && (
          <View style={styles.orderCard}>
            <Image source={{ uri: conversation.orderImage }} style={styles.orderImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.orderLabel}>{t("messages.aboutOrder")} #{conversation.orderRef}</Text>
              <Text style={styles.orderProduct} numberOfLines={1}>{conversation.orderProduct}</Text>
            </View>
          </View>
        )}

        {allMessages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.bubbleRow, msg.sentByMe && styles.bubbleRowMine]}
          >
            <Pressable
              onLongPress={() => onLongPressMessage(msg)}
              delayLongPress={300}
              style={[
                styles.bubble,
                msg.sentByMe ? styles.bubbleMine : styles.bubbleTheirs,
              ]}
            >
              {/* Message cité (réponse) */}
              {msg.replyToId != null && (
                <View style={[styles.replyQuote, msg.sentByMe ? styles.replyQuoteMine : styles.replyQuoteTheirs]}>
                  <Text
                    style={[styles.replyQuoteText, msg.sentByMe && styles.replyQuoteTextMine]}
                    numberOfLines={2}
                  >
                    {msg.replyToText || t("messages.deletedMessage")}
                  </Text>
                </View>
              )}

              {msg.deleted ? (
                <Text style={[styles.deletedText, msg.sentByMe && styles.bubbleTextMine]}>
                  {t("messages.deletedMessage")}
                </Text>
              ) : (
                <>
                  {/* Pièce jointe image → tap pour agrandir */}
                  {msg.type === "image" && msg.attachmentUrl ? (
                    <Pressable
                      onPress={() =>
                        setViewerItem({
                          url: resolveAttachment(msg.attachmentUrl!),
                          type: "image",
                          caption: msg.text || null,
                        })
                      }
                      onLongPress={() => onLongPressMessage(msg)}
                      delayLongPress={300}
                    >
                      <Image
                        source={{ uri: resolveAttachment(msg.attachmentUrl) }}
                        style={styles.bubbleImage}
                        contentFit="cover"
                      />
                    </Pressable>
                  ) : null}
                  {/* Pièce jointe vidéo → miniature + play, tap pour lire en plein écran */}
                  {msg.type === "video" && msg.attachmentUrl ? (
                    <Pressable
                      onPress={() =>
                        setViewerItem({
                          url: resolveAttachment(msg.attachmentUrl!),
                          type: "video",
                          caption: msg.text || null,
                        })
                      }
                      onLongPress={() => onLongPressMessage(msg)}
                      delayLongPress={300}
                      style={styles.videoThumb}
                    >
                      <View style={styles.videoPlayOverlay}>
                        <Icon name="play" size={34} color="#fff" />
                      </View>
                    </Pressable>
                  ) : null}
                  {/* Message vocal → lecteur intégré */}
                  {msg.type === "audio" && msg.attachmentUrl ? (
                    <AudioBubble
                      url={resolveAttachment(msg.attachmentUrl)}
                      light={msg.sentByMe}
                    />
                  ) : null}
                  {/* Pièce jointe document */}
                  {msg.type === "pdf" && msg.attachmentUrl ? (
                    <View style={styles.fileRow}>
                      <Icon name="feed" size={20} color={msg.sentByMe ? colors.white : colors.text} />
                      <Text
                        style={[styles.fileName, msg.sentByMe && styles.bubbleTextMine]}
                        numberOfLines={1}
                      >
                        {msg.attachmentName || t("messages.attachment")}
                      </Text>
                    </View>
                  ) : null}
                  {/* Légende sous le média (ou texte simple) */}
                  {msg.text ? (
                    <Text
                      style={[
                        styles.bubbleText,
                        msg.sentByMe && styles.bubbleTextMine,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  ) : null}
                </>
              )}
              <Text
                style={[
                  styles.bubbleTime,
                  msg.sentByMe && styles.bubbleTimeMine,
                ]}
              >
                {formatMsgTime(msg.time)}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* Bandeau "Réponse à…" au-dessus de la saisie */}
      {replyTo && (
        <View style={styles.replyBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyBarLabel}>{t("messages.replyingTo")}</Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {msgPreview(replyTo, t)}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={() => setReplyTo(null)}>
            <Icon name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Bandeau enregistrement vocal en cours */}
      {recorderState.isRecording ? (
        <View style={[styles.recordBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <Pressable hitSlop={8} onPress={cancelRecording} style={styles.recordCancel}>
            <Icon name="trash" size={22} color={colors.sale} />
          </Pressable>
          <View style={styles.recordInfo}>
            <View style={styles.recordDot} />
            <Text style={styles.recordText}>
              {t("messages.recording")} {Math.floor((recorderState.durationMillis ?? 0) / 1000)}s
            </Text>
          </View>
          <Pressable onPress={stopRecordingAndSend} style={styles.sendBtn}>
            <Icon name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom + spacing.xs, spacing.md) }]}>
          <Pressable style={styles.attachBtn} onPress={() => setAttachOpen(true)} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Icon name="plus" size={24} color={colors.textSecondary} />
            )}
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder={t("messages.typeHere")}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
            multiline
            maxLength={500}
          />
          {input.trim() ? (
            <Pressable onPress={sendMessage} style={styles.sendBtn}>
              <Icon name="send" size={20} color={colors.white} />
            </Pressable>
          ) : (
            // Champ vide → micro (appui pour enregistrer un vocal)
            <Pressable onPress={startRecording} style={styles.sendBtn} disabled={uploading}>
              <Icon name="headset" size={20} color={colors.white} />
            </Pressable>
          )}
        </View>
      )}

      {/* Feuille : choisir une pièce jointe */}
      <Modal visible={attachOpen} transparent animationType="fade" onRequestClose={() => setAttachOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAttachOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <SheetItem icon="grid" label={t("messages.attachImage")} onPress={pickFromGallery} />
          <SheetItem icon="camera" label={t("messages.attachCamera")} onPress={pickFromCamera} />
          <SheetItem icon="feed" label={t("messages.attachFile")} onPress={pickDocument} />
          <SheetItem icon="headset" label={t("messages.attachAudio")} onPress={startRecording} />
        </View>
      </Modal>

      {/* Menu 3-points */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={[styles.menu, { top: insets.top + 48 }]}>
          <SheetItem
            icon="grid"
            label={t("messages.mediaAndLinks")}
            onPress={() => {
              setMenuOpen(false);
              router.push(`/messages/media?id=${id}`);
            }}
          />
          <SheetItem icon="box" label={t("messages.archive")} onPress={onArchive} />
          <SheetItem
            icon="store"
            label={t("messages.viewStore")}
            onPress={() => {
              setMenuOpen(false);
              router.push("/stores");
            }}
          />
        </View>
      </Modal>

      {/* Aperçu avant envoi (façon WhatsApp) : média + légende + envoyer */}
      <Modal visible={!!preview} animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={[styles.previewWrap, { paddingTop: insets.top }]}>
          <Pressable
            style={styles.previewClose}
            hitSlop={8}
            onPress={() => { setPreview(null); setPreviewCaption(""); }}
          >
            <Icon name="close" size={26} color="#fff" />
          </Pressable>

          <View style={styles.previewBody}>
            {preview?.kind === "image" && (
              <Image source={{ uri: preview.uri }} style={styles.previewImage} contentFit="contain" />
            )}
            {preview?.kind === "video" && (
              <View style={styles.previewFileCard}>
                <Icon name="play" size={44} color="#fff" />
                <Text style={styles.previewFileName}>{t("messages.videoReady", "Vidéo prête à envoyer")}</Text>
              </View>
            )}
            {preview?.kind === "pdf" && (
              <View style={styles.previewFileCard}>
                <Icon name="fileText" size={44} color="#fff" />
                <Text style={styles.previewFileName} numberOfLines={2}>{preview.name ?? "Document PDF"}</Text>
              </View>
            )}
          </View>

          {/* Légende + envoi — la légende est OPTIONNELLE, comme WhatsApp */}
          <View style={[styles.previewInputBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <TextInput
              style={styles.previewInput}
              placeholder={t("messages.addCaption", "Ajouter une légende…")}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={previewCaption}
              onChangeText={setPreviewCaption}
              multiline
              maxLength={500}
            />
            <Pressable onPress={confirmPreviewSend} style={styles.sendBtn}>
              <Icon name="send" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Visionneuse média plein écran */}
      <MediaViewer item={viewerItem} onClose={() => setViewerItem(null)} />
    </View>
  );
}

/** Résout l'URL d'une pièce jointe relative (/uploads/…) vers l'origine API. */
function resolveAttachment(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  const origin = base.replace(/\/api\/?$/, "");
  return origin ? `${origin}${url.startsWith("/") ? "" : "/"}${url}` : url;
}

function SheetItem({
  icon,
  label,
  onPress,
  muted,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <Pressable style={styles.sheetItem} onPress={onPress}>
      <Icon name={icon} size={22} color={muted ? colors.textMuted : colors.text} />
      <Text style={[styles.sheetItemText, muted && { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
    },
    headerInfo: { flex: 1 },
    headerName: {
      fontSize: fontSize.lg,
      fontWeight: "800",
      color: colors.text,
    },
    headerStatus: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 1,
    },
    headerAction: { padding: 4 },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.xl,
      fontWeight: "700",
      color: colors.text,
    },
    orderCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderImg: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.background,
    },
    orderLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontWeight: "600",
    },
    orderProduct: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: "700",
      marginTop: 2,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    bubbleRow: {
      flexDirection: "row",
      marginBottom: spacing.sm,
    },
    bubbleRowMine: { justifyContent: "flex-end" },
    bubble: {
      maxWidth: "78%",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
    },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 4,
      ...shadows.sm,
    },
    bubbleMine: {
      backgroundColor: colors.primary,
      borderTopRightRadius: 4,
    },
    bubbleText: {
      fontSize: fontSize.md,
      color: colors.text,
      lineHeight: 20,
    },
    bubbleTextMine: { color: colors.white },
    bubbleTime: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      textAlign: "right",
    },
    bubbleTimeMine: { color: "rgba(255,255,255,0.7)" },
    bubbleImage: {
      width: 200,
      height: 200,
      borderRadius: radius.md,
      backgroundColor: colors.background,
      marginBottom: spacing.xs,
    },
    videoThumb: {
      width: 200,
      height: 140,
      borderRadius: radius.md,
      backgroundColor: "#000",
      marginBottom: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    videoPlayOverlay: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    recordBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    recordCancel: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    recordInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    recordDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.sale,
    },
    recordText: {
      fontSize: fontSize.md,
      color: colors.text,
      fontWeight: "600",
    },
    fileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    fileName: {
      fontSize: fontSize.sm,
      color: colors.text,
      fontWeight: "600",
      flexShrink: 1,
    },
    deletedText: {
      fontSize: fontSize.md,
      color: colors.textMuted,
      fontStyle: "italic",
      lineHeight: 20,
    },
    replyQuote: {
      borderLeftWidth: 3,
      paddingLeft: spacing.sm,
      paddingVertical: 2,
      marginBottom: spacing.xs,
      borderRadius: 2,
    },
    replyQuoteTheirs: { borderLeftColor: colors.primary },
    replyQuoteMine: { borderLeftColor: "rgba(255,255,255,0.6)" },
    replyQuoteText: { fontSize: fontSize.sm, color: colors.textMuted },
    replyQuoteTextMine: { color: "rgba(255,255,255,0.8)" },
    replyBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    replyBarLabel: {
      fontSize: fontSize.xs,
      color: colors.primary,
      fontWeight: "700",
    },
    replyBarText: { fontSize: fontSize.sm, color: colors.textSecondary },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    attachBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      // Aligné sur le centre du champ quand il fait une seule ligne (42px)
      marginBottom: 3,
    },
    // Champ façon WhatsApp : hauteur mini confortable, grandit avec le texte
    // jusqu'à ~5 lignes puis défile ; coins arrondis fixes (pas de « pilule »
    // déformée en multiligne).
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 122,
      backgroundColor: colors.background,
      borderRadius: 22,
      paddingHorizontal: spacing.md,
      paddingTop: 11,
      paddingBottom: 11,
      fontSize: fontSize.md,
      lineHeight: 20,
      color: colors.text,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 3,
    },
    // ── Aperçu média avant envoi (façon WhatsApp) ──
    previewWrap: {
      flex: 1,
      backgroundColor: "#000",
    },
    previewClose: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 2,
      margin: spacing.lg,
      marginTop: spacing.xxl + spacing.lg,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    previewBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    previewFileCard: {
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.xxl,
      borderRadius: radius.xl,
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    previewFileName: {
      color: "#fff",
      fontSize: fontSize.md,
      fontWeight: "600",
      textAlign: "center",
      maxWidth: 260,
    },
    previewInputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: "rgba(0,0,0,0.85)",
    },
    previewInput: {
      flex: 1,
      minHeight: 42,
      maxHeight: 100,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 22,
      paddingHorizontal: spacing.md,
      paddingTop: 11,
      paddingBottom: 11,
      fontSize: fontSize.md,
      lineHeight: 20,
      color: "#fff",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    sheetItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    sheetItemText: { fontSize: fontSize.md, color: colors.text, fontWeight: "600" },
    menu: {
      position: "absolute",
      right: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      minWidth: 220,
      ...shadows.md,
    },
  });

