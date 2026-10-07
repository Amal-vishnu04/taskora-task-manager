import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'
import { getApiErrorMessage } from '../api/errors'
import { uploadTaskImage } from '../api/upload'
import { useDialogFocus } from './useDialogFocus'

const statuses = ['pending', 'in_progress', 'completed']
const statusLabels = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = part => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getInitialValues(task) {
  return {
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    dueDate: toDateTimeLocal(task?.dueDate),
  }
}

export default function TaskFormModal({ open, task, saving, onClose, onSave }) {
  const [form, setForm] = useState(() => getInitialValues(task))
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [draggingImage, setDraggingImage] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)
  const submittingRef = useRef(false)
  const dialogRef = useDialogFocus(open)
  const isEditing = Boolean(task)
  const existingImageUrl = task?.imageUrl || task?.image_url || ''
  const previewUrl = selectedImage?.previewUrl || (removeExistingImage ? '' : existingImageUrl)
  const busy = saving || uploading || submitting

  const initialValues = getInitialValues(task)
  const hasChanges = selectedImage !== null
    || removeExistingImage
    || Object.keys(initialValues).some(key => form[key] !== initialValues[key])

  function requestClose() {
    if (busy) return
    if (hasChanges && !window.confirm('Discard your unsaved task changes?')) return
    onClose()
  }

  useEffect(() => {
    if (!open) return undefined
    const objectUrl = selectedImage?.previewUrl
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [open, selectedImage])

  useEffect(() => {
    if (!open) return undefined
    function handleKeyDown(event) {
      if (event.key !== 'Escape' || busy) return
      if (hasChanges && !window.confirm('Discard your unsaved task changes?')) return
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, hasChanges, onClose])

  if (!open) return null

  function updateField(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  function selectImage(file) {
    if (!file || busy) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPG, PNG, or WEBP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.')
      return
    }

    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) })
    setRemoveExistingImage(false)
  }

  function removeImageSelection() {
    if (selectedImage) {
      setSelectedImage(null)
      return
    }
    if (existingImageUrl) setRemoveExistingImage(true)
  }

  function handleFileInput(event) {
    selectImage(event.target.files?.[0])
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    setDraggingImage(false)
    selectImage(event.dataTransfer.files?.[0])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const title = form.title.trim()
    if (!title) {
      setError('Enter a task title.')
      return
    }
    if (title.length > 255) {
      setError('Task titles must be 255 characters or fewer.')
      return
    }
    if (!statuses.includes(form.status)) {
      setError('Choose a supported task status.')
      return
    }
    let dueDate = null
    if (form.dueDate) {
      const parsedDate = new Date(form.dueDate)
      if (Number.isNaN(parsedDate.getTime())) {
        setError('Enter a valid due date and time.')
        return
      }
      dueDate = parsedDate.toISOString()
    }

    if (submittingRef.current || submitting || saving || uploading) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      let imageUrl
      if (selectedImage?.file) {
        setUploading(true)
        try {
          imageUrl = await uploadTaskImage(selectedImage.file)
        } catch (uploadError) {
          setError(getApiErrorMessage(uploadError, 'Image upload failed. Please check the file and try again.'))
          return
        } finally {
          setUploading(false)
        }
      }

      await onSave({
        title,
        description: form.description.trim() || null,
        status: form.status,
        dueDate,
        ...(selectedImage ? { imageUrl } : {}),
        ...(removeExistingImage && !selectedImage ? { image_url: null } : {}),
      })
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Unable to save task. Please try again.'))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <section ref={dialogRef} className="task-form-dialog" role="dialog" aria-modal="true" aria-labelledby="task-form-title" tabIndex={-1}>
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">TASK DETAILS</p>
            <h2 id="task-form-title">{isEditing ? 'Refine your task' : 'Create a task'}</h2>
            <p>{isEditing ? 'Make a change and keep your plan current.' : 'Give your next piece of work a clear starting point.'}</p>
          </div>
          <button className="dialog-close" onClick={requestClose} disabled={busy} aria-label="Close task form"><X size={18} /></button>
        </div>
        <form className="task-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="task-title">Title</label>
          <input autoFocus className="text-input" id="task-title" name="title" maxLength={255} placeholder="What needs to get done?" required value={form.title} onChange={updateField} aria-describedby={error ? 'task-form-error' : undefined} />
          <label className="field-label" htmlFor="task-description">Description <span className="optional-label">Optional</span></label>
          <textarea className="text-input task-description-input" id="task-description" name="description" placeholder="Add a little more context" rows={3} value={form.description} onChange={updateField} aria-describedby={error ? 'task-form-error' : undefined} />
          <div className="task-image-field">
            <span className="field-label">Task Image <span className="optional-label">Optional</span></span>
            <input
              ref={fileInputRef}
              className="sr-only"
              id="task-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose task image file"
              disabled={busy}
              aria-describedby={error ? 'task-form-error' : undefined}
              onChange={handleFileInput}
            />
            {previewUrl ? (
              <div className="task-image-preview">
                <img src={previewUrl} alt={`Preview for ${form.title || task?.title || 'task image'}`} />
                <div className="task-image-preview-meta">
                  <strong>{selectedImage ? 'New image' : 'Existing image'}</strong>
                  <small>{selectedImage?.file.name || 'Attached task image'}</small>
                </div>
                <button
                  className="task-image-remove"
                  type="button"
                  disabled={busy}
                  onClick={removeImageSelection}
                  aria-label={selectedImage ? 'Remove selected image' : 'Remove image'}
                >
                  <X size={16} />{selectedImage ? 'Remove selected image' : 'Remove image'}
                </button>
              </div>
            ) : (
              <button
                className={`image-dropzone ${draggingImage ? 'image-dropzone-active' : ''}`}
                type="button"
                disabled={busy}
                aria-label="Choose a task image or drop it here"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={event => { event.preventDefault(); setDraggingImage(true) }}
                onDragLeave={() => setDraggingImage(false)}
                onDrop={handleDrop}
              >
                <span className="image-dropzone-icon"><ImagePlus size={20} /></span>
                <span className="image-dropzone-copy"><strong><Upload size={14} /> Choose or drop an image</strong><small>JPG, PNG or WEBP · Max 5 MB</small></span>
              </button>
            )}
            {removeExistingImage && !selectedImage && (
              <div className="image-removal-note" role="status">
                <span>Existing image will be removed when you save.</span>
                <button type="button" className="restore-image-button" onClick={() => setRemoveExistingImage(false)} disabled={busy}>Restore image</button>
              </div>
            )}
          </div>
          <div className="task-form-row">
            <div className="task-form-field">
              <label className="field-label" htmlFor="task-status">Status</label>
              <select className="text-input" id="task-status" name="status" value={form.status} required onChange={updateField} aria-describedby={error ? 'task-form-error' : undefined}>
                {statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
            </div>
            <div className="task-form-field">
              <label className="field-label" htmlFor="task-due-date">Due date <span className="optional-label">Optional</span></label>
              <input className="text-input" id="task-due-date" name="dueDate" type="datetime-local" value={form.dueDate} onChange={updateField} aria-describedby={error ? 'task-form-error' : undefined} />
            </div>
          </div>
          {error && <p className="form-error" id="task-form-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={requestClose} disabled={busy}>Cancel</button>
            <button className="primary-button" type="submit" disabled={busy}>
              {uploading ? 'Uploading image…' : saving || submitting ? 'Saving task…' : isEditing ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}