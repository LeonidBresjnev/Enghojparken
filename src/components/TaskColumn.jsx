import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from '../i18n'
import TaskCard from './TaskCard'

export default function TaskColumn({
  column,
  cards,
  isOver,
  isSelectedOnMobile,
  isCollapsed,
  draggedCardId,
  onToggleCollapse,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onCardClick,
  onDeleteCard,
  onMoveCard,
}) {
  const { t } = useTranslation()

  return (
    <div
      id={`panel-${column.id}`}
      role="tabpanel"
      aria-labelledby={`tab-${column.id}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-[84vw] max-w-[360px] sm:w-[380px] sm:max-w-none md:w-auto flex-shrink-0 snap-center md:flex-shrink md:snap-align-none rounded-2xl p-4 border transition-all duration-200 flex flex-col min-h-[550px] backdrop-blur-[1px] ${
        isOver
          ? 'bg-sky-50/95 border-sky-400 shadow-md ring-2 ring-sky-300 ring-offset-2'
          : isSelectedOnMobile
          ? 'bg-white border-slate-300/90 shadow-sm'
          : 'bg-white/80 border-slate-200/90 shadow-xs'
      }`}
    >
      <div className={`flex items-center justify-between pb-3 mb-3 border-b-2 ${column.color}`}>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-800 text-sm tracking-tight">{column.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${column.badgeBg}`}>
            {cards.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
          title={isCollapsed ? t('expandColumn', { name: column.title }) : t('collapseColumn', { name: column.title })}
          aria-label={isCollapsed ? t('expandColumn', { name: column.title }) : t('collapseColumn', { name: column.title })}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isCollapsed ? (
        <div className="flex-1 flex flex-col -space-y-1.5 py-1">
          {cards.length === 0 ? (
            <EmptyColumn isOver={isOver} />
          ) : (
            cards.map((card, idx) => (
              <TaskCard
                key={card.id}
                card={card}
                isCollapsed
                zIndex={cards.length - idx}
                isDragging={draggedCardId === card.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={() => onCardClick(card)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {cards.length === 0 ? (
            <EmptyColumn isOver={isOver} />
          ) : (
            cards.map((card) => {
              const columnOrder = ['todo', 'in_progress', 'done']
              const currentIndex = columnOrder.indexOf(card.columnId)

              return (
                <TaskCard
                  key={card.id}
                  card={card}
                  isDragging={draggedCardId === card.id}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={() => onCardClick(card)}
                  onDelete={onDeleteCard}
                  onMove={onMoveCard}
                  canMoveLeft={currentIndex > 0}
                  canMoveRight={currentIndex < columnOrder.length - 1}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function EmptyColumn({ isOver }) {
  const { t } = useTranslation()

  return (
    <div className={`flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-xl transition-colors ${
      isOver ? 'border-sky-400 bg-sky-100/40 text-sky-700' : 'border-slate-200 text-slate-400'
    }`}>
      <p className="text-xs">{t('task.emptyColumn')}</p>
    </div>
  )
}
