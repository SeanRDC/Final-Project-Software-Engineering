// The password rules the API enforces (backend/app/schemas/user.py), checked before sending.

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72

/** Why a new password is not acceptable, or undefined when it is. */
export function passwordProblem(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Use ${MAX_PASSWORD_LENGTH} characters or fewer.`
  }
  return undefined
}
