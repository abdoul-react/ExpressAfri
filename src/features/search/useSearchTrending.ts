import { useQuery } from '@tanstack/react-query'
import { contentService } from '@/features/content'

export function useSearchTrending() {
  return useQuery<string[]>({
    queryKey: ['search', 'trending'],
    queryFn: () => contentService.getTrending(),
    staleTime: 5 * 60 * 1000,
  })
}
