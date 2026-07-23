import { ScreenHeader, StatusState } from "@/components";
import { useColors } from "@/design-system";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";

/**
 * Rend une page d'information gérée par l'admin (CMS → Pages) avec une mise
 * en page soignée : en-tête centré, typographie lisible, thème respecté.
 */
export default function StaticPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const colors = useColors();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ["static-page", slug],
    // Endpoint dédié mobile qui cherche par slug (pas par UUID)
    queryFn: () => apiAdapter.get(`/mobile/static-pages/${slug}`),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="..." centerTitle />
        <StatusState status="loading" title={t("common.loading", "Chargement…")} hint="" />
      </View>
    );
  }

  if (isError || !page) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t("common.error")} centerTitle />
        <StatusState status="error" title={t("settings.pageNotFound", "Page introuvable")} hint="" />
      </View>
    );
  }

  const updated = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  // Mise en page HTML aux couleurs du thème : titres hiérarchisés, listes
  // aérées, largeur de lecture confortable — à l'image des grandes apps.
  const html = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <style>
      body {
        font-family: -apple-system, Roboto, 'Segoe UI', sans-serif;
        margin: 0; padding: 20px 20px 48px;
        background: ${colors.background};
        color: ${colors.text};
        font-size: 16px; line-height: 1.7;
        max-width: 720px; margin-left: auto; margin-right: auto;
      }
      .doc-header { text-align: center; padding: 8px 0 20px; border-bottom: 1px solid ${colors.border}; margin-bottom: 24px; }
      .doc-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
      .doc-header .updated { font-size: 12px; color: ${colors.textMuted}; margin-top: 6px; }
      h2 { font-size: 18px; font-weight: 800; margin: 28px 0 10px; }
      h3 { font-size: 16px; font-weight: 700; margin: 20px 0 8px; }
      p { margin: 0 0 14px; color: ${colors.textSecondary}; }
      ul, ol { padding-left: 22px; margin: 0 0 14px; }
      li { margin-bottom: 8px; color: ${colors.textSecondary}; }
      a { color: ${colors.primary}; }
      strong { color: ${colors.text}; }
    </style>
  </head><body>
    <div class="doc-header">
      <h1>${page.title}</h1>
      ${updated ? `<div class="updated">${t("settings.updatedOn", "Mise à jour le")} ${updated}</div>` : ""}
    </div>
    ${page.content}
  </body></html>`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={page.title} centerTitle />
      <WebView source={{ html }} style={{ flex: 1, backgroundColor: colors.background }} />
    </View>
  );
}
