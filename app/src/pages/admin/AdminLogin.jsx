import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase, supabaseConfigured } from '../../supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!supabaseConfigured) {
      setError('Supabase is not connected yet. Add the project URL and anon key to enable admin sign-in.')
      return
    }
    setBusy(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setBusy(false)
      return
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .single()
    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut()
      setError(profileError?.message || 'This team account is inactive.')
      setBusy(false)
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-story"><Link className="login-brand" to="/"><span className="brand-mark"><Sparkles size={18} /></span><span><b>POLISHERS</b><small>DA ELITE CLEANING</small></span></Link><div><span className="eyebrow eyebrow-light">THE WORK BEHIND THE SHINE</span><h1>Good work<br />starts <em>behind the scenes.</em></h1><p>Your home for the details, people and care that make every clean a little more exceptional.</p></div><span className="login-story-foot"><ShieldCheck size={16} /> A private space for the Polishers team</span></section>
      <section className="login-panel"><Link className="login-back" to="/"><ArrowLeft size={15} /> Back to website</Link><div className="login-form-wrap"><span className="login-icon"><ShieldCheck size={23} /></span><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your<br /><em>workspace.</em></h2><p>Enter your team credentials to continue.</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark button-large" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}{!busy && <ArrowRight size={16} />}</button></form><small className="login-no-signup">Team access is by invitation only. <a href="mailto:polishersdaelit@gmail.com">Need help?</a></small></div><div className="login-panel-foot">Dirt doesn't stand a chance. <span>© {new Date().getFullYear()} Polishers Da Elite</span></div></section>
    </main>
  )
}
