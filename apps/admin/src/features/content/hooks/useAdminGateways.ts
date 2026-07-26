import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGatewayDataSource,
  type UpdateGatewayPayload,
} from '@/infrastructure/data-source/api/ApiAdminGatewayDataSource'

const KEY = ['admin', 'payment-gateways']

export function useAdminGateways() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => adminGatewayDataSource.list(),
  })
}

export function useUpdateGateway() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: UpdateGatewayPayload }) =>
      adminGatewayDataSource.update(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useTestGateway() {
  return useMutation({
    mutationFn: (code: string) => adminGatewayDataSource.test(code),
  })
}

export function useRouteMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ methodCode, gatewayCode }: { methodCode: string; gatewayCode: string | null }) =>
      adminGatewayDataSource.routeMethod(methodCode, gatewayCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      queryClient.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })
    },
  })
}
