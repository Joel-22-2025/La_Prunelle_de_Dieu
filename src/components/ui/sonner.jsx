import { useTheme } from '@/hooks/use-theme'
import { Toaster as Sonner, toast } from 'sonner'

// ===========================================================================
// Toaster (notifications toast via la lib "sonner", version shadcn).
// richColors + variables palette → toast colorés (vert/rouge/orange/bleu)
// selon le type d'évènement (success / error / warning / info / défaut).
// À monter une seule fois dans l'application (voir App.jsx).
// ===========================================================================
const Toaster = ({ ...props }) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme}
      richColors
      closeButton
      position="top-right"
      offset={12}
      gap={10}
      className="toaster group"
      style={{
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--success': '#18a77a',
        '--error': '#e84b55',
        '--warning': '#f6b53e',
        '--info': '#079fbe',
      }}
      toastOptions={{
        style: {
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          borderRadius: '0.75rem',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }