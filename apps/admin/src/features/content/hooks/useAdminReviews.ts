import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminContentService } from '../services/adminContentService'

export interface Review {
  id: string
  productId: string
  customerId: string
  rating: number
  title?: string
  body?: string
  isActive: boolean
  createdAt: string
}

interface ReviewsResult {
  data: Review[]
  total: number
  page: number
}

export function useAdminReviews(page: number, limit: number, statusFilter: 'all' | 'active' | 'inactive') {
  return useQuery<ReviewsResult>({
    queryKey: ['admin', 'reviews', page, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) }
      if (statusFilter !== 'all') params.status = statusFilter
      return adminContentService.listReviews(params)
    },
  })
}

export function useModerateReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminContentService.moderateReview(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })
    },
  })
}
