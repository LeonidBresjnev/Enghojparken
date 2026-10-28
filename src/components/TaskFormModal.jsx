import { useState } from 'react'
import { Check, Edit3, Trash2, X, Plus } from 'lucide-react'
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
  const [newSubtaskInput, setNewSubtaskInput] = useState('')
  const isEditing = mode === 'edit'
  const assignees = task.assignees || (isEditing ? getCardAssignees(task) : [])
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []

  const updateField = (field, value) => {
    onChange({ ...task, [field]: value })
  }

  const totalSubtasks = subtasks.length
  const completedSubtasks = subtasks.filter((s) => s.completed).length

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault()
    const text = newSubtaskInput.trim()
    if (!text) return
    const newSubtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: text,
      completed: false,
    }
    updateField('subtasks', [...subtasks, newSubtask])
    setNewSubtaskInput('')
  }

  const handleToggleSubtaskInModal = (subtaskId) => {
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    updateField('subtasks', updated)
  }

  const handleUpdateSubtaskTitleInModal = (subtaskId, newTitle) => {
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, title: newTitle } : st
    )
    updateField('subtasks', updated)
  }

  const handleRemoveSubtaskInModal = (subtaskId) => {
    const updated = subtasks.filter((st) => st.id !== subtaskId)
    updateField('subtasks', updated)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-sans"
            />
          </div>

          {/* Sub-tasks section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t('task.subtasks')}
              </label>
              {totalSubtasks > 0 && (
                <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                  {t('task.subtasksCount', {
                    completed: completedSubtasks,
                    total: totalSubtasks,
                  })}
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2.5 max-h-48 overflow-y-auto overflow-x-hidden pr-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 p-1.5 sm:p-2 bg-slate-50 border border-slate-200 rounded-lg group hover:border-slate-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(st.completed)}
                      onChange={() => handleToggleSubtaskInModal(st.id)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer shrink-0"
                      aria-label={st.title || st.text || t('task.subtasks')}
                    />
                    <input
                      type="text"
                      value={st.title || st.text || ''}
                      onChange={(e) => handleUpdateSubtaskTitleInModal(st.id, e.target.value)}
                      placeholder={t('task.subtaskPlaceholder')}
                      className={`flex-1 text-xs sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 px-1 py-0.5 text-slate-800 ${
                        st.completed ? 'line-through text-slate-400' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtaskInModal(st.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer shrink-0"
                      title={t('task.deleteSubtask')}
                      aria-label={t('task.deleteSubtask')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('task.subtasksPlaceholder')}
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskInput.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('task.addSubtask')}
              </button>
            </div>
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
