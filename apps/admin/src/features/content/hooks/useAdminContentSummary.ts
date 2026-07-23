import { useQuery } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export function useAdminContentSummary() {
  return useQuery({
    queryKey: ['admin', 'content', 'summary'],
    queryFn: () => adminContentService.getSummary(),
  })
}
