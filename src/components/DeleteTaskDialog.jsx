import { Trash2 } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function DeleteTaskDialog({ card, onCancel, onConfirm }) {
  const { t } = useTranslation()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
              {t('deleteDialog.title')}
            </h3>
            <p className="text-xs text-slate-500">{t('deleteDialog.warning')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {t('deleteDialog.confirmQuestion', { title: card.title })}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(card)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            {t('deleteTask')}
          </button>
        </div>
      </div>
    </div>
  )
}
