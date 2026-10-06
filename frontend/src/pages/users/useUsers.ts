import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { Role, User, UserCreate, UserUpdate } from '@/api/types'

export const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'clinic_staff',
    label: 'Clinic staff',
    description: 'Nurses and student assistants: front desk and clinical recording.',
  },
  { value: 'doctor', label: 'Doctor', description: 'Consultation notes; views everything else.' },
  {
    value: 'coordinator',
    label: 'Clinic Coordinator',
    description: 'Everything, including accounts, reports and the audit log.',
  },
]

export function roleLabel(role: string): string {
  return ROLES.find((option) => option.value === role)?.label ?? role
}

/** Every clinic account, active or not. */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => api<User[]>('/users', { signal }),
  })
}

function useUserMutation<Input>(send: (input: Input) => Promise<User>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: send,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useCreateUser() {
  return useUserMutation((request: UserCreate) =>
    api<User>('/users', { method: 'POST', json: request }),
  )
}

export function useUpdateUser(userId: number) {
  return useUserMutation((changes: UserUpdate) =>
    api<User>(`/users/${userId}`, { method: 'PATCH', json: changes }),
  )
}

/** Sets a new password for someone, who must then change it at their next sign-in. */
export function useResetPassword(userId: number) {
  return useUserMutation((newPassword: string) =>
    api<User>(`/users/${userId}/reset-password`, {
      method: 'POST',
      json: { new_password: newPassword },
    }),
  )
}
