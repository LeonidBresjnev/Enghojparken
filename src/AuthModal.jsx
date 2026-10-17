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

export default function AuthModal({ isOpen, onClose }) {
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
        return 'Ugyldig e-mailadresse.'
      case 'auth/user-disabled':
        return 'Denne brugerkonto er deaktiveret.'
      case 'auth/user-not-found':
        return 'Der findes ingen bruger med denne e-mailadresse.'
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Forkert e-mail eller adgangskode.'
      case 'auth/email-already-in-use':
        return 'Der findes allerede en bruger med denne e-mail.'
      case 'auth/weak-password':
        return 'Adgangskoden skal være på mindst 6 tegn.'
      case 'auth/popup-closed-by-user':
        return 'Login med Google blev afbrudt.'
      case 'auth/operation-not-allowed':
        return 'Denne login-metode er ikke aktiveret i Firebase konsollen.'
      case 'auth/too-many-requests':
        return 'For mange forsøg. Prøv igen senere.'
      default:
        return 'Der opstod en fejl under login. Prøv igen.'
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Indtast venligst din e-mailadresse.')
      setLoading(false)
      return
    }

    if (!isUserAllowed(normalizedEmail)) {
      setError('Adgang nægtet. Denne e-mailadresse er ikke godkendt til at logge ind.')
      setLoading(false)
      return
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail)
      setSuccessMessage(`Vi har sendt en e-mail til ${normalizedEmail} med instruktioner til nulstilling af adgangskode. Tjek din indbakke.`)
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
      setError('Adgang nægtet. Denne e-mailadresse er ikke godkendt til at logge ind.')
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Luk"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
            {isForgot ? (
              <KeyRound className="w-6 h-6" />
            ) : isSignUp ? (
              <UserPlus className="w-6 h-6" />
            ) : (
              <LogIn className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isForgot
              ? 'Glemt email eller adgangskode'
              : isSignUp
              ? 'Opret Bestyrelseskonto'
              : 'Log ind på Scrumboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isForgot
              ? 'Indtast din e-mail for at modtage et link til at nulstille din adgangskode via Firebase'
              : isSignUp
              ? 'Opret en bruger med din e-mail eller Google for at deltage'
              : 'Få adgang til bestyrelsens opgaver og opdateringer'}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mailadresse</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="din@email.dk"
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
                    Send nulstillingsmail
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
                Tilbage til login
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
              Fortsæt med Google
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">eller e-mail</span>
              <div className="border-t border-slate-200 w-full"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fulde navn</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="f.eks. Jacob Hansen"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mailadresse</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="din@email.dk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Adgangskode</label>
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
                      Glemt email?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
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
                    Opret konto
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Log ind
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center text-xs text-slate-500">
              {isSignUp ? (
                <p>
                  Har du allerede en konto?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setError('')
                      setSuccessMessage('')
                    }}
                    className="text-sky-600 font-semibold hover:underline cursor-pointer"
                  >
                    Log ind her
                  </button>
                </p>
              ) : (
                <p>
                  Har du ikke en konto endnu?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup')
                      setError('')
                      setSuccessMessage('')
                    }}
                    className="text-sky-600 font-semibold hover:underline cursor-pointer"
                  >
                    Opret konto
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
