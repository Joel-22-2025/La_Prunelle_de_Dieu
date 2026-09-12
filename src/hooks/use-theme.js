import { useEffect, useState } from 'react'

// ===========================================================================
// Détection du thème (light / dark) en observant la classe ".dark" sur <html>.
// Utilisé par le Toaster shadcn.
// ===========================================================================
export function useTheme() {
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      )
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return { theme }
}