export function friendlyErrorMessage(error, fallback) {
  const message = String(error?.message || error || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()

  if (/failed to fetch|fetch failed|network request failed|networkerror|load failed|timed? out/.test(message)) {
    return 'We could not reach the service. Check your internet connection and try again.'
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'That email and password do not match. Check your sign-in details and try again.'
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.'
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'There have been too many attempts. Wait a few minutes, then try again.'
  }
  if (code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'Your account does not have permission for this action. Ask an administrator to check your access.'
  }
  if (message.includes('storage') || message.includes('upload') || message.includes('bucket')) {
    return 'We could not upload that photo. Check your connection and try again; photos must be JPG, PNG, or WebP and under 5 MB.'
  }
  if (Number(error?.status) >= 500) {
    return 'The service is having trouble right now. Please try again in a little while.'
  }

  return fallback
}