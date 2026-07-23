import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

type FeatureFlag = { key: string; label: string; enabled: boolean; group: string };

export function useFeatureFlags() {
  const { data = [] } = useQuery<FeatureFlag[]>({
    queryKey: ["feature-flags"],
    queryFn: () => apiAdapter.get("/mobile/feature-flags"),
    staleTime: 10 * 60 * 1000,
  });

  function isEnabled(key: string, defaultValue = true): boolean {
    const flag = data.find((f) => f.key === key);
    if (!flag) return defaultValue;
    return flag.enabled;
  }

  return { flags: data, isEnabled };
}
