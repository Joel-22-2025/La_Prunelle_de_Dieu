// ===========================================================================
// Recherche globale (header) : médicaments (admin) + clients + factures.
// Raccourci clavier "/" pour se focaliser, Échap pour fermer.
// ===========================================================================
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Pill, Search, Users, X } from 'lucide-react'
import { getAllMedicaments } from '@/services/medicamentService'
import { getAllClients } from '@/services/clientService'
import { getFactures } from '@/services/factureService'
import { Input } from '@/components/ui/input'

const LIMITE = 5

export default function GlobalSearch({ isAdmin = false }) {
  const navigate = useNavigate()
  const [terme, setTerme] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [base, setBase] = useState(null)
  const conteneurRef = useRef(null)
  const inputRef = useRef(null)

  // Charge une seule fois l'index de recherche.
  useEffect(() => {
    let actif = true
    ;(async () => {
      setChargement(true)
      try {
        const [medicaments, clients, factures] = await Promise.all([
          isAdmin ? getAllMedicaments() : Promise.resolve([]),
          getAllClients(),
          getFactures({ limitMax: 200 }),
        ])
        if (actif) setBase({ medicaments, clients, factures })
      } catch (err) {
        console.error('Recherche globale indisponible :', err)
      } finally {
        if (actif) setChargement(false)
      }
    })()
    return () => { actif = false }
  }, [isAdmin])

  // Clic extérieur → fermeture.
  useEffect(() => {
    if (!ouvert) return undefined
    const onPointer = (event) => {
      if (conteneurRef.current && !conteneurRef.current.contains(event.target)) setOuvert(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [ouvert])

  // Raccourci "/" (hors champ de saisie) + Échap.
  useEffect(() => {
    const onKey = (event) => {
      const cible = document.activeElement
      const enSaisie = cible?.tagName === 'INPUT' || cible?.tagName === 'TEXTAREA'
      if (event.key === '/') {
        if (enSaisie) return
        event.preventDefault()
        inputRef.current?.focus()
        setOuvert(true)
      } else if (event.key === 'Escape') {
        setOuvert(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const q = terme.trim().toLowerCase()

  const resultats = q
    ? {
        medicaments: (base?.medicaments || []).filter(
          (m) => [m.nom, m.codeBarre, m.principeActif].some((champ) => String(champ ?? '').toLowerCase().includes(q)),
        ).slice(0, LIMITE),
        clients: (base?.clients || []).filter(
          (c) => [c.nom, c.telephone].some((champ) => String(champ ?? '').toLowerCase().includes(q)),
        ).slice(0, LIMITE),
        factures: (base?.factures || []).filter((f) => String(f.numero ?? '').toLowerCase().includes(q)).slice(0, LIMITE),
      }
    : null

  const total = resultats ? resultats.medicaments.length + resultats.clients.length + resultats.factures.length : 0

  const ouvrir = (path) => {
    navigate(path)
    setTerme('')
    setOuvert(false)
  }

  return (
    <div ref={conteneurRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={terme}
        onChange={(e) => {
          setTerme(e.target.value)
          setOuvert(true)
        }}
        onFocus={() => setOuvert(true)}
        placeholder="Rechercher un médicament, un client, une facture…"
        className="h-9 pl-9 pr-8 bg-background shadow-xs"
        aria-label="Recherche globale"
      />
      {terme ? (
        <button
          type="button"
          onClick={() => {
            setTerme('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Effacer la recherche"
        >
          <X className="size-4" />
        </button>
      ) : (
        <kbd className="bg-muted text-muted-foreground pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 text-[11px] font-medium sm:block">
          /
        </kbd>
      )}

      {ouvert && q && chargement ? (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1.5 w-full rounded-lg border p-2 shadow-md">
          <p className="px-2 py-2 text-sm text-muted-foreground">Chargement…</p>
        </div>
      ) : null}

      {ouvert && q && resultats && total === 0 ? (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1.5 w-full rounded-lg border p-4 text-center text-sm text-muted-foreground shadow-md">
          Aucun résultat pour « {terme} »
        </div>
      ) : null}

      {ouvert && q && resultats && total > 0 ? (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1.5 w-full rounded-lg border p-1.5 shadow-md">
          {isAdmin && resultats.medicaments.length > 0 ? (
            <div className="py-0.5">
              <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Médicaments</p>
              {resultats.medicaments.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => ouvrir(`/admin/medicaments/${m.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <Pill className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-left">{m.nom}</span>
                </button>
              ))}
            </div>
          ) : null}

          {resultats.clients.length > 0 ? (
            <div className="py-0.5">
              <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Clients</p>
              {resultats.clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => ouvrir(`/clients/${c.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <Users className="size-4 shrink-0 text-ocean" />
                  <span className="min-w-0 flex-1 truncate text-left">{c.nom}</span>
                  <span className="text-xs text-muted-foreground">{c.telephone}</span>
                </button>
              ))}
            </div>
          ) : null}

          {resultats.factures.length > 0 ? (
            <div className="py-0.5">
              <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Factures</p>
              {resultats.factures.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => ouvrir(`/factures/${f.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <FileText className="size-4 shrink-0 text-success" />
                  <span className="font-medium">{f.numero}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}