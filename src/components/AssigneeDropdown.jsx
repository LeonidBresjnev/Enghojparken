import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Users } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function AssigneeDropdown({ boardMembers, selectedAssignees, onChange }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMember = (member) => {
    if (selectedAssignees.includes(member)) {
      onChange(selectedAssignees.filter((assignee) => assignee !== member))
    } else {
      onChange([...selectedAssignees, member])
    }
  }

  const selectedCount = selectedAssignees.length

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-left transition-colors cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <Users className="w-4 h-4 text-slate-400 shrink-0" />
          {selectedCount === 0 ? (
            <span className="text-slate-400 italic">{t('assignee.selectPlaceholder')}</span>
          ) : (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedAssignees.slice(0, 2).map((member, idx) => (
                <span
                  key={idx}
                  className="bg-sky-100 text-sky-800 text-xs px-2 py-0.5 rounded-md font-medium truncate max-w-[150px]"
                >
                  {member}
                </span>
              ))}
              {selectedCount > 2 && (
                <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-md font-medium">
                  {t('assignee.moreCount', { count: selectedCount - 2 })}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-sky-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[60] left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1.5 animate-dropdown-in motion-reduce:animate-none">
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>{t('assignee.boardMembersTitle')}</span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-sky-600 hover:text-sky-800 font-normal normal-case cursor-pointer"
              >
                {t('assignee.deselectAll')}
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1 flex flex-col gap-0.5">
            {boardMembers.map((member, idx) => {
              const isSelected = selectedAssignees.includes(member)
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => toggleMember(member)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-950 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{member}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-sky-600 font-semibold bg-sky-100/80 px-1.5 py-0.5 rounded shrink-0">
                      {t('assignee.selectedBadge')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
