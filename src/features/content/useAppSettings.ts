import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

type AppSetting = { key: string; value: string; type: string; label: string; group: string };

export function useAppSettings() {
  const { data = [] } = useQuery<AppSetting[]>({
    queryKey: ["app-settings"],
    queryFn: () => apiAdapter.get("/mobile/settings"),
    // staleTime court pour que les changements CMS se reflètent rapidement
    // (invalider via queryClient.invalidateQueries({ queryKey: ['app-settings'] }))
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  function get(key: string, fallback = ""): string {
    const setting = (data as AppSetting[]).find((s) => s.key === key);
    return setting?.value ?? fallback;
  }

  function getNumber(key: string, fallback = 0): number {
    const val = get(key, String(fallback));
    return parseFloat(val) || fallback;
  }

  function getBool(key: string, fallback = true): boolean {
    const val = get(key, String(fallback));
    return val === "true" || val === "1";
  }

  return { settings: data, get, getNumber, getBool };
}
