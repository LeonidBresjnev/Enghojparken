import { Trash2, Calendar, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '../i18n'
import {
  getCardAssignees,
  renderDescriptionWithLinks,
  normalizePriority,
  getPriorityBadge
} from '../utils/cardUtils'

export default function TaskCard({
  card,
  isCollapsed = false,
  zIndex,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
  onMove,
  canMoveLeft = false,
  canMoveRight = false,
}) {
  const { t } = useTranslation()

  const getPriorityDisplayLabel = (p) => {
    const norm = normalizePriority(p)
    if (norm === 'High') return t('priority.high')
    if (norm === 'Medium') return t('priority.medium')
    if (norm === 'Low') return t('priority.low')
    return p
  }

  const assignees = getCardAssignees(card)

  if (isCollapsed) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart?.(e, card.id)}
        onDragEnd={onDragEnd}
        onClick={onClick}
        style={zIndex !== undefined ? { zIndex } : undefined}
        className={`bg-white rounded-xl px-3.5 py-2.5 shadow-xs hover:shadow-md transition-all duration-200 border border-slate-200/90 hover:border-sky-400 cursor-pointer flex items-center justify-between group hover:z-30 hover:-translate-y-0.5 relative ${
          isDragging ? 'opacity-40 scale-[0.98] border-dashed border-sky-500' : ''
        }`}
        title={`${card.title} - ${t('editTask')}`}
      >
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-sky-700 transition-colors flex-1 min-w-0 truncate">
          {card.title}
        </h3>
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, card.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 flex flex-col gap-3 cursor-pointer group hover:border-sky-300 hover:-translate-y-0.5 ${
        isDragging ? 'opacity-40 scale-[0.98] border-dashed border-sky-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-sky-700 transition-colors flex-1 min-w-0">
          {card.title}
        </h3>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border shrink-0 ${getPriorityBadge(card.priority)}`}>
          {getPriorityDisplayLabel(card.priority)}
        </span>
      </div>

      {card.description && (
        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed break-words whitespace-pre-line">
          {renderDescriptionWithLinks(card.description)}
        </p>
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 flex-1 min-w-0" title={t('assignee.formLabel')}>
            <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {assignees.length > 0 ? (
                assignees.map((person, idx) => (
                  <span
                    key={idx}
                    className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] leading-tight"
                  >
                    {person}
                  </span>
                ))
              ) : (
                <span className="font-medium text-slate-400 italic text-[11px]">{t('assignee.unassigned')}</span>
              )}
            </div>
          </div>
          {card.dueDate ? (
            <div className="flex items-center gap-1 text-slate-400 shrink-0" title={t('task.dueDate')}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{card.dueDate}</span>
            </div>
          ) : null}
        </div>

        {/* Card Actions */}
        <div
          className="flex items-center justify-between pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(card)
                }}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                title={t('deleteTask')}
                aria-label={t('deleteTask')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            {canMoveLeft && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMove?.(card.id, 'prev')
                }}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                title="Flyt til forrige kolonne"
                aria-label="Flyt til forrige kolonne"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {canMoveRight && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMove?.(card.id, 'next')
                }}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                title="Flyt til næste kolonne"
                aria-label="Flyt til næste kolonne"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
