import { useState } from 'react'
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from './firebase'
import { isUserAllowed, getAllowedUser } from './allowedUsers'
import { LogIn, UserPlus, Mail, Lock, User, AlertCircle, Loader2, X, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useTranslation } from './i18n'

export default function AuthModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const isSignUp = authMode === 'signup'
  const isForgot = authMode === 'forgot'

  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return t('auth.invalidEmail')
      case 'auth/user-disabled':
        return t('auth.userDisabled')
      case 'auth/user-not-found':
        return t('auth.userNotFound')
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('auth.wrongPassword')
      case 'auth/email-already-in-use':
        return t('auth.emailAlreadyInUse')
      case 'auth/weak-password':
        return t('auth.weakPassword')
      case 'auth/popup-closed-by-user':
        return t('auth.popupClosed')
      case 'auth/operation-not-allowed':
        return t('auth.operationNotAllowed')
      case 'auth/too-many-requests':
        return t('auth.tooManyRequests')
      default:
        return t('auth.genericError')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError(t('auth.enterEmailPrompt'))
      setLoading(false)
      return
    }

    if (!isUserAllowed(normalizedEmail)) {
      setError(t('auth.notWhitelistedError'))
      setLoading(false)
      return
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail)
      setSuccessMessage(t('auth.resetPasswordSuccess', { email: normalizedEmail }))
    } catch (err) {
      console.error('Password reset error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    if (!isUserAllowed(normalizedEmail)) {
      setError(t('auth.notWhitelistedError'))
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        const allowed = getAllowedUser(normalizedEmail)
        const effectiveDisplayName = displayName.trim() || allowed?.name || ''
        if (effectiveDisplayName) {
          await updateProfile(userCredential.user, {
            displayName: effectiveDisplayName,
          })
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      onClose()
    } catch (err) {
      console.error('Auth error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      const userCredential = await signInWithPopup(auth, googleProvider)
      const userEmail = userCredential.user?.email
      if (!isUserAllowed(userEmail)) {
        await signOut(auth)
        setError(`Adgang nægtet. E-mailadressen (${userEmail || 'ukendt'}) har ikke tilladelse til at logge ind.`)
        return
      }
      onClose()
    } catch (err) {
      console.error('Google sign-in error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-8 border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label={t('cancel')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5 sm:mb-6 text-center">
          <div className="mx-auto w-11 h-11 sm:w-12 sm:h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-2.5 sm:mb-3 shadow-inner">
            {isForgot ? (
              <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : isSignUp ? (
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isForgot
              ? t('auth.modalForgotTitle')
              : isSignUp
              ? t('auth.modalSignupTitle')
              : t('auth.modalLoginTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isForgot
              ? t('auth.modalForgotSubtitle')
              : isSignUp
              ? t('auth.modalSignupSubtitle')
              : t('auth.modalLoginSubtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {isForgot ? (
          <div>
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.emailLabel')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    {t('auth.forgotSubmitButton')}
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setError('')
                  setSuccessMessage('')
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('auth.backToLogin')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {t('auth.googleSignIn')}
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">{t('auth.orWithEmail')}</span>
              <div className="border-t border-slate-200 w-full"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.fullNameLabel')}</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('auth.fullNamePlaceholder')}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('auth.emailLabel')}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">{t('auth.passwordLabel')}</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot')
                        setError('')
                        setSuccessMessage('')
                      }}
                      className="text-xs text-sky-600 hover:underline cursor-pointer"
                    >
                      {t('auth.forgotPasswordLink')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder={t('auth.passwordPlaceholder')}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    {t('auth.signupSubmitButton')}
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {t('auth.loginSubmitButton')}
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500">
              {isSignUp ? (
                <p>
                  {t('auth.haveAccountPrompt')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setError('')
                      setSuccessMessage('')
                    }}
                    className="text-sky-600 font-semibold hover:underline cursor-pointer"
                  >
                    {t('auth.loginLink')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('auth.noAccountPrompt')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup')
                      setError('')
                      setSuccessMessage('')
                    }}
                    className="text-sky-600 font-semibold hover:underline cursor-pointer"
                  >
                    {t('auth.createAccountLink')}
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
