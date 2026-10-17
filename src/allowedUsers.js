import usersData from '../users.json'

export const allowedUsers = Array.isArray(usersData) ? usersData : []

/**
 * Check if the given email is in the allowed users list (case-insensitive)
 */
export function isUserAllowed(email) {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return allowedUsers.some(
    (u) => u.email && u.email.trim().toLowerCase() === normalized
  )
}

/**
 * Get allowed user profile by email
 */
export function getAllowedUser(email) {
  if (!email || typeof email !== 'string') return null
  const normalized = email.trim().toLowerCase()
  return (
    allowedUsers.find(
      (u) => u.email && u.email.trim().toLowerCase() === normalized
    ) || null
  )
}

/**
 * Get the list of all allowed user names for task assignment
 */
export function getAllowedUserNames() {
  return allowedUsers.map((u) => u.name).filter(Boolean)
}

export default allowedUsers
