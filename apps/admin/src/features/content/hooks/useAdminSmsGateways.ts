import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminSmsGatewayDataSource,
  type UpdateSmsGatewayPayload,
} from '@/infrastructure/data-source/api/ApiAdminSmsGatewayDataSource'

const KEY = ['admin', 'sms-gateways']

export function useAdminSmsGateways() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => adminSmsGatewayDataSource.list(),
  })
}

export function useUpdateSmsGateway() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: UpdateSmsGatewayPayload }) =>
      adminSmsGatewayDataSource.update(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useTestSmsGateway() {
  return useMutation({
    mutationFn: (code: string) => adminSmsGatewayDataSource.test(code),
  })
}
