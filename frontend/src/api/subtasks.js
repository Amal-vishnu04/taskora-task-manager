import api from './axios'

export async function getSubtasks(taskId) {
  const response = await api.get(`/tasks/${taskId}/subtasks`)
  return Array.isArray(response.data?.subtasks) ? response.data.subtasks : []
}

export async function createSubtask(taskId, title) {
  const response = await api.post(`/tasks/${taskId}/subtasks`, { title })
  return response.data.subtask
}

export async function updateSubtask(taskId, subtaskId, changes) {
  const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, changes)
  return response.data.subtask
}

export async function deleteSubtask(taskId, subtaskId) {
  await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`)
}

export async function getSubtaskSummary() {
  const response = await api.get('/subtasks/summary')
  const summary = response.data?.summary
  return summary && typeof summary === 'object' ? summary : {}
}
