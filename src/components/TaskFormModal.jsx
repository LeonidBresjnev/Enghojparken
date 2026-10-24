import { Check, Edit3, Trash2, X } from 'lucide-react'
import { useTranslation } from '../i18n'
import { getCardAssignees } from '../utils/cardUtils'
import AssigneeDropdown from './AssigneeDropdown'

export default function TaskFormModal({
  mode,
  task,
  boardMembers,
  onChange,
  onSubmit,
  onClose,
  onDelete,
}) {
  const { t } = useTranslation()
  const isEditing = mode === 'edit'
  const assignees = task.assignees || (isEditing ? getCardAssignees(task) : [])

  const updateField = (field, value) => {
    onChange({ ...task, [field]: value })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            {isEditing && <Edit3 className="w-5 h-5 text-sky-600" />}
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? t('editTask') : t('createTask')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-sm cursor-pointer"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.title')}</label>
            <input
              type="text"
              required
              placeholder={t('task.titlePlaceholder')}
              value={task.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.description')}</label>
            <textarea
              rows={isEditing ? 4 : 3}
              placeholder={t('task.descriptionPlaceholder')}
              value={task.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.status')}</label>
              <select
                value={task.columnId || 'todo'}
                onChange={(e) => updateField('columnId', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="todo">{t('columns.todo')}</option>
                <option value="in_progress">{t('columns.in_progress')}</option>
                <option value="done">{t('columns.done')}</option>
                <option value="archive">{t('columns.archive')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('priority.label')}</label>
              <select
                value={task.priority || 'Medium'}
                onChange={(e) => updateField('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Low">{t('priority.low')}</option>
                <option value="Medium">{t('priority.medium')}</option>
                <option value="High">{t('priority.high')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('assignee.formLabel')}
            </label>
            <AssigneeDropdown
              boardMembers={boardMembers}
              selectedAssignees={assignees}
              onChange={(updated) => updateField('assignees', updated)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('task.dueDate')}</label>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => updateField('dueDate', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className={`flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 ${isEditing ? 'justify-between' : 'justify-end'}`}>
            {isEditing && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('deleteTask')}
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm cursor-pointer"
              >
                {isEditing && <Check className="w-4 h-4" />}
                {isEditing ? t('saveChanges') : t('addTask')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
