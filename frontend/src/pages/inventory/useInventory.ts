import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type {
  Medicine,
  MedicineCreate,
  MedicineUpdate,
  StockMovementPage,
  StockMovementType,
} from '@/api/types'
import { staleQueriesFor } from '@/live/liveQueries'

export const MOVEMENTS_PER_PAGE = 25

export type InventoryParams = {
  q: string
  lowStockOnly: boolean
  includeInactive: boolean
}

/** The medicine inventory, searched and filtered by the server. */
export function useInventory(params: InventoryParams) {
  return useQuery({
    queryKey: ['inventory', 'list', params],
    queryFn: ({ signal }) =>
      api<Medicine[]>('/inventory/medicines', {
        query: {
          q: params.q,
          low_stock_only: params.lowStockOnly || undefined,
          include_inactive: params.includeInactive || undefined,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export type MovementParams = {
  movementType: StockMovementType | ''
  start: string
  end: string
  page: number
}

/** Stock history, newest first. With the type "release" it is the medicine release log. */
export function useStockMovements(params: MovementParams) {
  return useQuery({
    queryKey: ['inventory', 'movements', params],
    queryFn: ({ signal }) =>
      api<StockMovementPage>('/inventory/movements', {
        query: {
          movement_type: params.movementType,
          start: params.start,
          end: params.end,
          page: params.page,
          page_size: MOVEMENTS_PER_PAGE,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/**
 * A change to the inventory. The server sends "inventory.updated" over the WebSocket as
 * well; refetching here covers a station whose connection has dropped.
 */
function useInventoryMutation<Input>(send: (input: Input) => Promise<Medicine>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      const stale = new Set([
        ...staleQueriesFor('inventory.updated'),
        ...staleQueriesFor('notifications.updated'),
      ])
      for (const key of stale) void queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}

export function useAddMedicine() {
  return useInventoryMutation((request: MedicineCreate) =>
    api<Medicine>('/inventory/medicines', { method: 'POST', json: request }),
  )
}

export function useUpdateMedicine(medicineId: number) {
  return useInventoryMutation((changes: MedicineUpdate) =>
    api<Medicine>(`/inventory/medicines/${medicineId}`, { method: 'PATCH', json: changes }),
  )
}

/** Adds delivered stock. The quantity is never edited directly; every change is a movement. */
export function useStockIn(medicineId: number) {
  return useInventoryMutation((input: { quantity: number; reason: string }) =>
    api<Medicine>(`/inventory/medicines/${medicineId}/stock-in`, {
      method: 'POST',
      json: { quantity: input.quantity, reason: input.reason.trim() || null },
    }),
  )
}

/** Sets the quantity to what was physically counted, with the reason for the difference. */
export function useAdjustStock(medicineId: number) {
  return useInventoryMutation((input: { newQuantity: number; reason: string }) =>
    api<Medicine>(`/inventory/medicines/${medicineId}/adjust`, {
      method: 'POST',
      json: { new_quantity: input.newQuantity, reason: input.reason.trim() },
    }),
  )
}
