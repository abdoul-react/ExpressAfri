import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

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
      const { data } = await api.get('/reviews', { params })
      if (Array.isArray(data)) return { data, total: data.length, page: 1 }
      return data
    },
  })
}

export function useModerateReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/reviews/${id}/moderate`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })
    },
  })
}
