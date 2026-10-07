export function getApiErrorMessage(error, fallback = 'Taskora could not complete your request. Please try again.') {
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      return 'Taskora took too long to respond. Please try again.'
    }
    if (error?.isAxiosError || error?.request) {
      return 'Unable to connect to Taskora. Please check your connection and try again.'
    }
    return fallback
  }

  const status = error.response.status
  const requestUrl = error.config?.url || ''

  if (status === 400) return 'Some information could not be accepted. Review your entries and try again.'
  if (status === 401) {
    return requestUrl.includes('/auth/login')
      ? 'Email or password is incorrect.'
      : 'Your session has expired. Please sign in again.'
  }
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'That item is no longer available. Refresh and try again.'
  if (status === 409) {
    return requestUrl.includes('/auth/register')
      ? 'An account with that email address already exists.'
      : 'That change conflicts with existing information. Review your entries and try again.'
  }
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.'
  if (status >= 500) return 'Taskora could not complete your request. Please try again shortly.'
  return fallback
}