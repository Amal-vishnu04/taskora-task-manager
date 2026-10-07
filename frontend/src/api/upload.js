import api from './axios'

export async function uploadTaskImage(file) {
  const formData = new FormData()
  formData.append('image', file)

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const imageUrl = response.data?.imageUrl

  if (typeof imageUrl !== 'string') {
    throw new Error('The upload did not return an image URL.')
  }

  try {
    if (new URL(imageUrl).protocol !== 'https:') {
      throw new Error('The upload did not return a secure image URL.')
    }
  } catch {
    throw new Error('The upload did not return a secure image URL.')
  }

  return imageUrl
}