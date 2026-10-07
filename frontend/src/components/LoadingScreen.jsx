export default function LoadingScreen({ label = 'Loading Taskora' }) {
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <span className="loading-mark" aria-hidden="true" />
      <span>{label}</span>
    </main>
  )
}