import { useQuery } from "@tanstack/react-query";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

type AppLogo = { id: string; context: string; url: string; label: string };

export function useAppLogos() {
  const { data = [] } = useQuery<AppLogo[]>({
    queryKey: ["app-logos"],
    queryFn: () => apiAdapter.get("/mobile/logos"),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  function getLogo(context: string): string | null {
    const raw = data.find((l) => l.context === context)?.url ?? null;
    if (!raw) return null;
    return resolveMediaUrl(raw) ?? null;
  }

  return { logos: data, getLogo };
}
