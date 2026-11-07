import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useToast } from '../../components/ui/ToastProvider'
import { supabase, supabaseConfigured } from '../../supabase'
import { friendlyErrorMessage } from '../../utils/friendlyError'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const showToast = useToast()

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!supabaseConfigured) {
      const message = 'Admin sign-in is unavailable because the Supabase project is not connected.'
      setError(message)
      showToast({ tone: 'error', title: 'Sign-in unavailable', message })
      return
    }
    setBusy(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        const message = friendlyErrorMessage(authError, 'We could not sign you in. Check your connection and try again.')
        setError(message)
        showToast({ tone: 'error', title: 'Could not sign in', message })
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()
      if (profileError) {
        await supabase.auth.signOut()
        const message = friendlyErrorMessage(profileError, 'We could not verify your team access. Try again, or ask an administrator to check your profile.')
        setError(message)
        showToast({ tone: 'error', title: 'Could not verify access', message })
        return
      }
      if (!profile?.is_active) {
        await supabase.auth.signOut()
        const message = 'Supabase accepted your sign-in, but admin access is disabled on this profile. In public.profiles, set is_active to true for this user, then sign in again.'
        setError(message)
        showToast({ tone: 'error', title: 'Profile access is disabled', message })
        return
      }

      showToast({ tone: 'success', title: 'Signed in', message: 'Your admin workspace is ready.' })
      navigate('/admin', { replace: true })
    } catch (issue) {
      const message = friendlyErrorMessage(issue, 'We could not sign you in. Check your connection and try again.')
      setError(message)
      showToast({ tone: 'error', title: 'Could not sign in', message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div>
          <span className="eyebrow eyebrow-light">THE WORK BEHIND THE SHINE</span>
          <h1>Good work<br />starts <em>behind the scenes.</em></h1>
          <p>Your home for the details, people and care that make every clean a little more exceptional.</p>
        </div>
        <span className="login-story-foot"><ShieldCheck size={16} /> A private space for the Polishers team</span>
      </section>
      <section className="login-panel">
        <div className="login-panel-top">
          <Link className="login-brand" to="/">
            <img src={`${import.meta.env.BASE_URL}Polishers%20DA%20Elite%20Logo.png`} alt="Polishers Da Elite" />
          </Link>
          <Link className="login-back" to="/">Back to website</Link>
        </div>
        <div className="login-form-wrap">
          <span className="login-icon"><ShieldCheck size={23} /></span>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to your<br /><em>workspace.</em></h2>
          <p>Enter your team credentials to continue.</p>
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-dark button-large" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <small className="login-no-signup">Team access is by invitation only. <a href="mailto:polishersdaelit@gmail.com">Need help?</a></small>
        </div>
        <div className="login-panel-foot">Dirt doesn't stand a chance. <span>© {new Date().getFullYear()} Polishers Da Elite</span></div>
      </section>
    </main>
  )
}
