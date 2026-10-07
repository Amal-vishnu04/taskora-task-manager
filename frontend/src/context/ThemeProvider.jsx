import { useState } from 'react'
import { ThemeContext } from './themeContextValue'

const THEME_STORAGE_KEY = 'taskflow-theme'

function readTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setCurrentTheme] = useState(readTheme)

  function setTheme(nextTheme) {
    const safeTheme = nextTheme === 'dark' ? 'dark' : 'light'
    setCurrentTheme(safeTheme)
    document.documentElement.dataset.theme = safeTheme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, safeTheme)
    } catch {
      return
    }
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}