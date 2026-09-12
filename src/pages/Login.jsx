// ===========================================================================
// Page de connexion (/login)
// ---------------------------------------------------------------------------
// Deux modes :
//   - "login" : formulaire email + mot de passe.
//   - "reset" : envoi d'un email de réinitialisation de mot de passe.
// Cette page est accessible uniquement aux visiteurs non connectés
// (enveloppée par PublicRoute).
// ===========================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { errAuthMsg, resetPassword } from '../services/authService'
import { SpinnerInButton } from '../components/ui/spinner'
import logo from '../assets/logo.png'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // "login" | "reset"
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Connexion.
  // -------------------------------------------------------------------------
  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await login(email, password)
      // AuthContext met à jour "user" ; on rejoint le tableau de bord.
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(errAuthMsg(err.code))
    } finally {
      setLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // Mot de passe oublié.
  // -------------------------------------------------------------------------
  const handleReset = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await resetPassword(email)
      setSuccess('Un email de réinitialisation vous a été envoyé.')
      setMode('login')
    } catch (err) {
      setError(errAuthMsg(err.code))
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#e5f3f8] via-white to-[#f0f3f8] p-4">
      <div className="w-full max-w-md">
        {/* Carte principale */}
        <div className="rounded-2xl border border-border bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <img
              src={logo}
              alt="La Prunelle de Dieu"
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover shadow-lg ring-2 ring-primary/20"
            />
            <h1 className="text-2xl font-bold text-foreground">La Prunelle de Dieu</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLogin
                ? 'Connectez-vous pour accéder à votre espace'
                : 'Réinitialisation du mot de passe'}
            </p>
          </div>

          {/* Messages d'erreur / succès */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-success/25 bg-success/5 px-4 py-3 text-sm text-success" role="status">
              {success}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="prenom@pharmacie.fr"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? 'Cache' : 'Affiche'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SpinnerInButton busy={loading} />
                Se connecter
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-foreground">
                  Adresse email du compte
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="prenom@pharmacie.fr"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SpinnerInButton busy={loading} />
                Envoyer l'email de réinitialisation
              </button>
            </form>
          )}

          {/* Choix du mode */}
          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            {isLogin ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                  className="text-sm font-medium text-primary hover:text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
                <p className="mt-3 text-xs text-muted-foreground/70">
                  Les comptes sont créés par un administrateur.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="text-sm font-medium text-primary hover:text-primary hover:underline"
              >
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          La Prunelle de Dieu · Pharmacie
        </p>
      </div>
    </div>
  )
}