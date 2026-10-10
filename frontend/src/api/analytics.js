import api from './axios'

export async function getAnalytics({ days = 14 } = {}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const response = await api.get('/analytics', { params: { days, tz: timeZone } })
  const analytics = response.data?.analytics
  if (!analytics || typeof analytics !== 'object') {
    throw new Error('Analytics response was invalid.')
  }
  return analytics
}
