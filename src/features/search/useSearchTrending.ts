import { useQuery } from '@tanstack/react-query'
import { apiAdapter } from '@/infrastructure/api/apiAdapter'

export function useSearchTrending() {
  return useQuery<string[]>({
    queryKey: ['search', 'trending'],
    queryFn: () => apiAdapter.get('/mobile/search/trending'),
    staleTime: 5 * 60 * 1000,
  })
}
