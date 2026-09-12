// ===========================================================================
// Recherche client (optionnelle à la vente) avec autocomplete.
// Vaut "Client de passage" si aucun client sélectionné.
// (Création de client retirée de la vente — elle reste possible sur /clients.)
// ===========================================================================
import { useEffect, useRef, useState } from 'react'
import { UserSearch, X } from 'lucide-react'
import { rechercherClients } from '@/services/clientService'
import { Input } from '@/components/ui/input'

export default function RechercheClient({ value, onChange }) {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const delai = useRef(null)

  // Recherche dé-bouncée (150 ms).
  useEffect(() => {
    clearTimeout(delai.current)
    const q = terme.trim()
    setOuvert(q.length > 0)
    if (q.length === 0) {
      setResultats([])
      return undefined
    }
    delai.current = setTimeout(async () => {
      setChargement(true)
      try {
        setResultats(await rechercherClients(q, 8))
      } catch {
        setResultats([])
      } finally {
        setChargement(false)
      }
    }, 150)
    return () => clearTimeout(delai.current)
  }, [terme])

  const choisir = (client) => {
    onChange(client)
    setTerme('')
    setResultats([])
    setOuvert(false)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <UserSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={terme}
          onChange={(e) => {
            setTerme(e.target.value)
            if (value) onChange(null) // la saisie invalide la sélection courante
          }}
          onFocus={() => terme.trim() && setOuvert(true)}
          onBlur={() => setTimeout(() => setOuvert(false), 150)}
          placeholder="Rechercher un client (nom ou téléphone) — facultatif"
          className="pl-9"
          aria-label="Rechercher un client"
        />

        {ouvert && (resultats.length > 0 || chargement) && (
          <ul className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {chargement ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Recherche…</li>
            ) : (
              resultats.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      choisir(c)
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{c.nom}</span>
                    <span className="text-xs text-muted-foreground">{c.telephone}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-success/25 bg-success/5 px-3 py-2 text-sm">
          <span className="text-success">
            Client : <span className="font-semibold">{value.nom}</span>
            {value.telephone ? ` (${value.telephone})` : ''}
          </span>
          <button type="button" onClick={() => onChange(null)} className="text-success hover:text-success" aria-label="Retirer le client">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sans sélection, la vente sera au nom de « Client de passage ».</p>
      )}
    </div>
  )
}