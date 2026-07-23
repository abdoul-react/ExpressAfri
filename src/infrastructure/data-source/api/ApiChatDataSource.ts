import type {
  ChatDataSource,
  SendMessagePayload,
  ChatAttachment,
  ConversationMedia,
} from "../ChatDataSource";
import type { Conversation, Message } from "@/types";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || "";

function mimeFor(uri: string): { mime: string; type: ChatAttachment["type"] } {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { mime: "application/pdf", type: "pdf" };
  if (["mp4", "mov", "webm", "3gp"].includes(ext)) {
    const mime = ext === "mov" ? "video/quicktime" : ext === "3gp" ? "video/3gpp" : `video/${ext}`;
    return { mime, type: "video" };
  }
  if (["m4a", "mp3", "aac", "wav", "3gpp"].includes(ext))
    return { mime: ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/m4a" : `audio/${ext}`, type: "audio" };
  if (ext === "png") return { mime: "image/png", type: "image" };
  if (ext === "webp") return { mime: "image/webp", type: "image" };
  if (ext === "gif") return { mime: "image/gif", type: "image" };
  return { mime: "image/jpeg", type: "image" };
}

export class ApiChatDataSource implements ChatDataSource {
  async listConversations(): Promise<Conversation[]> {
    return apiAdapter.get("/mobile/conversations");
  }

  async getConversation(id: string): Promise<Conversation> {
    return apiAdapter.get(`/chat/conversations/${id}`);
  }

  async createConversation(data: {
    storeId?: string;
    orderId?: string;
    subject?: string;
  }): Promise<Conversation> {
    return apiAdapter.post("/chat/conversations", data as any);
  }

  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload,
  ): Promise<Message> {
    return apiAdapter.post(
      `/chat/conversations/${conversationId}/messages`,
      payload as Record<string, unknown>,
    );
  }

  async uploadAttachment(
    _conversationId: string,
    localUri: string,
  ): Promise<ChatAttachment> {
    const endpoint = `${API_BASE.replace(/\/$/, "")}/chat/attachments`;
    const token = apiAdapter.getAccessToken();
    const { mime } = mimeFor(localUri);

    if (Platform.OS === "web") {
      const blob = await (await fetch(localUri)).blob();
      const name = localUri.split("/").pop() || `file.${mime.split("/")[1]}`;
      const form = new FormData();
      form.append("file", blob, name);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(`Upload échoué (${res.status})`);
      return (await res.json()) as ChatAttachment;
    }

    const res = await FileSystem.uploadAsync(endpoint, localUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: mime,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Upload échoué (${res.status}): ${res.body}`);
    }
    return JSON.parse(res.body) as ChatAttachment;
  }

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await apiAdapter.del(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
    );
  }

  async markAsRead(conversationId: string): Promise<void> {
    await apiAdapter.put(`/chat/conversations/${conversationId}/read`, {});
  }

  async closeConversation(id: string): Promise<void> {
    await apiAdapter.put(`/chat/conversations/${id}/close`, {});
  }

  async archiveConversation(id: string): Promise<void> {
    await apiAdapter.put(`/chat/conversations/${id}/archive`, {});
  }

  async getConversationMedia(id: string): Promise<ConversationMedia> {
    return apiAdapter.get(`/chat/conversations/${id}/media`);
  }
}
