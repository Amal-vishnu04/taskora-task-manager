import { useEffect, useRef } from 'react'

const focusableSelector = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

export function useDialogFocus(open) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const focusableElements = () => [...(dialog?.querySelectorAll(focusableSelector) || [])]
    const initialFocus = dialog?.querySelector('[autofocus]') || focusableElements()[0] || dialog
    initialFocus?.focus()

    function containFocus(event) {
      if (event.key !== 'Tab') return

      const elements = focusableElements()
      if (!elements.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog?.addEventListener('keydown', containFocus)
    return () => {
      dialog?.removeEventListener('keydown', containFocus)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])

  return dialogRef
}