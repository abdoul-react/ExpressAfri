import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";
import { useAuthStore, type User } from "@/store/authStore";
import { logger } from "@/infrastructure/logging";

type ServerProfile = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  gender?: string | null;
  birthYear?: number | null;
};

function toUser(p: ServerProfile): User {
  return {
    name: p.name,
    email: p.email,
    phone: p.phone,
    avatar: p.avatar ? (resolveMediaUrl(p.avatar) ?? p.avatar) : undefined,
    gender: p.gender ?? undefined,
    birthYear: p.birthYear != null ? String(p.birthYear) : undefined,
  };
}

/** Recharge le profil serveur dans le store local (appelé au démarrage/connexion). */
export async function refreshProfile(): Promise<void> {
  try {
    const p: ServerProfile = await apiAdapter.get("/mobile/profile");
    const fresh = toUser(p);
    // Ne jamais écraser une valeur locale par un champ serveur vide/undefined :
    // le serveur peut renvoyer avatar:'' → on garderait alors la photo locale.
    const clean = Object.fromEntries(
      Object.entries(fresh).filter(([, v]) => v != null && v !== ""),
    );
    useAuthStore.setState((s) => ({ user: { ...s.user, ...clean } as User }));
  } catch (error) {
    // Hors-ligne ou session absente : on garde le profil local persisté
    logger.warn("[profile] refresh failed", { error });
  }
}

/**
 * Met à jour le profil : optimiste en local, puis persiste côté serveur.
 * En cas d'échec réseau, le local reste (resynchronisé au prochain refresh).
 */
export async function saveProfile(patch: Partial<User>): Promise<void> {
  useAuthStore.getState().updateProfile(patch);
  try {
    await apiAdapter.put("/mobile/profile", {
      name: patch.name,
      phone: patch.phone,
      gender: patch.gender,
      birthYear: patch.birthYear ? Number(patch.birthYear) : undefined,
      avatar: patch.avatar,
      language: patch.language,
    });
  } catch (error) {
    logger.warn("[profile] save failed (kept locally)", { error });
    throw error;
  }
}

/** Upload la photo de profil ; le serveur l'enregistre et retourne son URL publique. */
export async function uploadAvatar(localUri: string): Promise<string> {
  const API_BASE =
    process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || "";
  const endpoint = `${API_BASE.replace(/\/$/, "")}/mobile/profile/avatar`;
  const token = apiAdapter.getAccessToken();
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const url = await (Platform.OS === "web"
    ? uploadViaFetch(endpoint, localUri, ext, mime, token)
    : uploadViaFileSystem(endpoint, localUri, mime, token));

  const resolved = resolveMediaUrl(url) ?? url;
  useAuthStore.getState().updateProfile({ avatar: resolved });
  return resolved;
}

/**
 * Natif : upload multipart via expo-file-system (fiable en SDK 57).
 * fetch + FormData de fichier est cassé sous la nouvelle architecture RN,
 * d'où l'échec "vérifiez votre connexion".
 */
async function uploadViaFileSystem(
  endpoint: string,
  localUri: string,
  mime: string,
  token: string | null,
): Promise<string> {
  const res = await FileSystem.uploadAsync(endpoint, localUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    mimeType: mime,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Upload avatar échoué (${res.status}): ${res.body}`);
  }
  return JSON.parse(res.body).url as string;
}

/** Web : FormData standard supporté par le navigateur. */
async function uploadViaFetch(
  endpoint: string,
  localUri: string,
  ext: string,
  mime: string,
  token: string | null,
): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  const formData = new FormData();
  formData.append("file", blob, `avatar.${ext}`);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload avatar échoué (${res.status})`);
  return ((await res.json()) as { url: string }).url;
}

export const profileService = { refreshProfile, saveProfile, uploadAvatar };
