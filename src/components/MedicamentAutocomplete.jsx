// ===========================================================================
// Autocomplete de médicaments : champ de recherche + liste déroulante.
// (Préparation à l'intégration future d'un scanner de code-barres.)
// ===========================================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pill, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function MedicamentAutocomplete({
  medicaments = [],
  value,
  onChange,
  placeholder = 'Rechercher un médicament…',
  disabled = false,
}) {
  const [text, setText] = useState(value ? value.nom : '')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  // Synchronise la saisie quand la valeur change de l'extérieur.
  useEffect(() => {
    if (value) setText(value.nom)
  }, [value])

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return []
    return medicaments.filter((m) => {
      if (m.statut !== 'actif') return false
      return (
        m.nom.toLowerCase().includes(q) ||
        String(m.codeBarre ?? '').toLowerCase().includes(q) ||
        String(m.principeActif ?? '').toLowerCase().includes(q)
      )
    })
  }, [medicaments, text])

  const select = (medicament) => {
    onChange(medicament)
    setText(medicament.nom)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          if (value) onChange(null) // la saisie invalide la sélection courante
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled}
        placeholder={placeholder}
        className="pl-9 pr-9"
        aria-label={placeholder}
      />
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText('')
            onChange(null)
            setOpen(false)
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la sélection"
        >
          <X className="size-4" />
        </button>
      ) : null}

      {open && filtered.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  select(m)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  value?.id === m.id && 'bg-accent/60',
                )}
              >
                <Pill className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium">{m.nom}</span>
                  <span className="block text-xs text-muted-foreground">
                    {m.dosage || '—'} · {m.categorie || '—'}
                  </span>
                </span>
                {value?.id === m.id && <Check className="size-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}