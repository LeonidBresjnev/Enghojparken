import { LogIn, LogOut, Plus } from 'lucide-react'
import headerBg from '../assets/cropped-gf-logo.jpg'
import { getAllowedUser } from '../allowedUsers'
import { useTranslation } from '../i18n'
import LanguageSelector from './LanguageSelector'

export default function Header({
  currentUser,
  onSignOut,
  onOpenAuthModal,
  onOpenCreateModal,
}) {
  const { t } = useTranslation()

  return (
    <header
      className="relative bg-slate-900 text-white shadow-lg bg-cover bg-center overflow-hidden min-h-[170px] flex items-center"
    >
      <img
        src={headerBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Lighter overlay to let the background image shine through clearly */}
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[0.5px]"></div>

      {/* Language selector in upper left corner */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
        <LanguageSelector />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left mt-6 sm:mt-0">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {t('appName')}
          </h1>
          <p className="text-sm md:text-base text-white/90 font-medium mt-1 max-w-xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {t('appDescription')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-lg">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || currentUser.email}
                  className="w-7 h-7 rounded-full border border-sky-400 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-semibold text-xs flex items-center justify-center border border-sky-400/50">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col text-left mr-1">
                <span className="text-xs font-semibold text-white leading-tight max-w-[130px] truncate">
                  {getAllowedUser(currentUser.email)?.name || currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-300 max-w-[130px] truncate leading-tight">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title={t('auth.logOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/85 hover:bg-slate-800 text-white font-medium text-sm rounded-lg backdrop-blur-md border border-white/25 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-sky-400" />
              {t('auth.logIn')}
            </button>
          )}

          {currentUser ? (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border border-sky-400/40"
            >
              <Plus className="w-4 h-4" />
              {t('createTask')}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
