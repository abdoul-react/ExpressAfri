import { useQuery } from "@tanstack/react-query";
import { contentService } from "@/features/content/contentService";
import type { Shortcut } from "@/infrastructure/data-source";

export function useHomeShortcuts() {
  const { data = [] } = useQuery<Shortcut[]>({
    queryKey: ["home", "shortcuts"],
    queryFn: () => contentService.getHomeShortcuts(),
    // 0 = données re-chargées à chaque retour sur l'écran (changements CMS instantanés)
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  return data;
}
