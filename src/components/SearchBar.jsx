// ===========================================================================
// Barre de recherche avec debounce (300 ms par défaut).
// ===========================================================================
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Rechercher…',
  delay = 300,
  className,
}) {
  const [text, setText] = useState(value || '')

  // Debounce : on ne remonte la valeur au parent qu'après une pause de saisie.
  useEffect(() => {
    const timer = setTimeout(() => onChange(text), delay)
    return () => clearTimeout(timer)
  }, [text, delay, onChange])

  // Synchronise la saisie si la valeur externe change.
  useEffect(() => {
    if (value !== text) setText(value || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
        aria-label={placeholder}
      />
      {text ? (
        <button
          type="button"
          onClick={() => setText('')}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la recherche"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}