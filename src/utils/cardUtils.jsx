// Helper to normalize assignees from card (handles string or array for backwards compatibility)
export function getCardAssignees(card) {
  if (!card) return []
  if (Array.isArray(card.assignees)) return card.assignees
  if (Array.isArray(card.assignee)) return card.assignee
  if (typeof card.assignee === 'string' && card.assignee.trim()) {
    if (card.assignee === 'Udefineret' || card.assignee === 'Unassigned') return []
    // Support comma-separated strings if any exist
    return card.assignee.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export const renderDescriptionWithLinks = (text) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/\S+|www\.\S+)/gi
  const parts = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    let url = match[0]
    let trailingPunctuation = ''

    const punctMatch = url.match(/[.,;:!?]+$/)
    if (punctMatch) {
      trailingPunctuation = punctMatch[0]
      url = url.slice(0, -trailingPunctuation.length)
    }

    const href = url.startsWith('www.') ? `https://${url}` : url
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-sky-600 hover:text-sky-800 underline break-all font-medium transition-colors"
      >
        {url}
      </a>
    )

    if (trailingPunctuation) {
      parts.push(trailingPunctuation)
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export const normalizePriority = (priority) => {
  if (!priority) return 'Medium'
  const p = priority.toLowerCase()
  if (p === 'høj' || p === 'high') return 'High'
  if (p === 'lav' || p === 'low') return 'Low'
  return 'Medium'
}

export const getPriorityBadge = (priority) => {
  const norm = normalizePriority(priority)
  switch (norm) {
    case 'High':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'Low':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
