import api from './axios'

export async function getTaskActivity(taskId) {
  const response = await api.get(`/activity/task/${taskId}`)
  return Array.isArray(response.data?.activity) ? response.data.activity : []
}
