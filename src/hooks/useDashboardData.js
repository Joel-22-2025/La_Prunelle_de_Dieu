// ===========================================================================
// Hook Dashboard : agrège les VRAIES données de l'application (Firestore)
// pour alimenter le tableau de bord.
// ---------------------------------------------------------------------------
// Rôle-aware : un pharmacien ne voit que ses propres ventes (filtre
// utilisateurId, en accord avec les règles Firestore). L'admin voit tout.
// ===========================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllMedicaments } from '@/services/medicamentService'
import { getTousLesStocks, getMouvementsStock, getAlertesStock } from '@/services/stockService'
import { getVentes } from '@/services/venteService'
import { getAllClients } from '@/services/clientService'
import { PHARMACIE_INFO } from '@/services/factureService'

// ---------------------------------------------------------------------------
// Petits helpers temporels (fuseau local).
// ---------------------------------------------------------------------------
const minuit = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value)

const RANGES = ['jour', '7j', '30j', 'annee']

// Transforme "V-2026-0001" en { vente, facture } de lecture pour l'affichage.
function bucketsPourVentes(ventes, range) {
  const maintenant = new Date()
  const debut = minuit(maintenant)
  const index = {}

  if (range === 'jour') {
    for (let h = 0; h < 24; h += 1) {
      index[h] = { label: `${String(h).padStart(2, '0')}h`, total: 0 }
    }
  } else if (range === '7j') {
    for (let j = 6; j >= 0; j -= 1) {
      const d = new Date(debut)
      d.setDate(debut.getDate() - j)
      index[d.getTime()] = {
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        date: d,
        total: 0,
      }
    }
  } else if (range === '30j') {
    for (let j = 29; j >= 0; j -= 1) {
      const d = new Date(debut)
      d.setDate(debut.getDate() - j)
      index[d.getTime()] = {
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        date: d,
        total: 0,
      }
    }
  } else {
    for (let m = 0; m < 12; m += 1) {
      index[m] = { label: new Date(2000, m, 1).toLocaleDateString('fr-FR', { month: 'short' }), total: 0 }
    }
  }

  for (const vente of ventes) {
    if (vente.statut !== 'validee') continue // seules les ventes validées comptent
    const date = toDate(vente.date)
    if (!date || Number.isNaN(date.getTime())) continue
    if (range === 'annee') {
      if (date.getFullYear() !== maintenant.getFullYear()) continue
      const m = date.getMonth()
      if (index[m]) index[m].total += Number(vente.montantTotal) || 0
    } else if (range === 'jour') {
      if (minuit(date).getTime() !== debut.getTime()) continue
      const h = date.getHours()
      if (index[h]) index[h].total += Number(vente.montantTotal) || 0
    } else {
      const key = minuit(date).getTime()
      if (index[key]) index[key].total += Number(vente.montantTotal) || 0
    }
  }

  return Object.values(index)
}

export function useDashboardData({ role, uid, actif = true }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requeteId = useRef(0)

  const charger = useCallback(async () => {
    const id = ++requeteId.current
    setLoading(true)
    setError(null)
    try {
      const [medicaments, stocks, alerts, ventes, clients, mouvements] = await Promise.all([
        getAllMedicaments().catch(() => []),
        getTousLesStocks().catch(() => []),
        getAlertesStock().catch(() => ({ stockFaible: [], ruptures: [] })),
        getVentes({ utilisateurId: role === 'pharmacien' ? uid : null, limitMax: 500 }).catch(() => []),
        getAllClients().catch(() => []),
        getMouvementsStock({}).catch(() => []),
      ])

      if (requeteId.current !== id) return

      const actifs = medicaments.filter((m) => m.statut === 'actif')

      const maintenant = new Date()
      const debutJour = minuit(maintenant)
      const hier = new Date(debutJour)
      hier.setDate(hier.getDate() - 1)

      const ventesJour = ventes.filter((v) => {
        const d = toDate(v.date)
        return d && minuit(d).getTime() === debutJour.getTime()
      })
      const ventesHier = ventes.filter((v) => {
        const d = toDate(v.date)
        return d && minuit(d).getTime() === hier.getTime()
      })
      const caJour = ventesJour
        .filter((v) => v.statut === 'validee')
        .reduce((s, v) => s + (Number(v.montantTotal) || 0), 0)
      const caHier = ventesHier
        .filter((v) => v.statut === 'validee')
        .reduce((s, v) => s + (Number(v.montantTotal) || 0), 0)

      const totalStock = stocks.reduce((s, st) => s + (Number(st.quantiteDisponible) || 0), 0)

      // Ventes récentes (8 dernières, toutes statuts confondus — badge affiché).
      const recentSales = ventes.slice(0, 8).map((v) => ({
        id: v.id,
        numero: v.numero,
        date: v.date,
        clientNom: v.clientNom || 'Client de passage',
        montantTotal: Number(v.montantTotal) || 0,
        modePaiement: v.modePaiement,
        statut: v.statut,
        premierProduit: v.lignes?.[0]?.medicamentNom,
        quantitePremier: v.lignes?.[0]?.quantite,
      }))

      // Activités : mouvements stock + ventes, triées par date, 8 dernières.
      const activites = [
        ...mouvements.slice(0, 40).map((m) => ({
          kind: 'mouvement',
          type: m.type, // entree | sortie | ajustement
          motif: m.motif,
          medicamentId: m.medicamentId,
          detail: m.motifDetail || '',
          quantite: Number(m.quantite) || 0,
          utilisateurNom: m.utilisateurNom || '',
          date: m.date,
          reference: '',
        })),
        ...ventes.slice(0, 40).map((v) => ({
          kind: 'vente',
          type: 'vente',
          motif: 'vente',
          medicamentId: null,
          detail: `${v.numero} · ${new Intl.NumberFormat('fr-FR').format(Number(v.montantTotal) || 0)} F`,
          quantite: 0,
          utilisateurNom: v.utilisateurNom || '',
          date: v.date,
          reference: v.numero,
        })),
      ].sort((a, b) => {
        const da = toDate(a.date)
        const db = toDate(b.date)
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0)
      })

      setData({
        role,
        medicamentsCount: actifs.length,
        medicamentsTotal: medicaments.length,
        medicamentNoms: Object.fromEntries(actifs.map((m) => [m.id, m.nom])),
        totalStock,
        nbStocks: stocks.length,
        alerts: alerts || { stockFaible: [], ruptures: [] },
        clientsCount: clients.length,
        caJour,
        caHier,
        nbVentesJour: ventesJour.filter((v) => v.statut === 'validee').length,
        nbVentesTotal: ventes.length,
        recentSales: recentSales.slice(0, 8),
        activites: activites.slice(0, 8),
        charts: Object.fromEntries(RANGES.map((r) => [r, bucketsPourVentes(ventes, r)])),
        pharmacie: PHARMACIE_INFO,
        medicaments: actifs,
      })
      setLoading(false)
    } catch (cause) {
      if (requeteId.current !== id) return
      setError(cause?.message || 'Erreur de chargement des données')
      setLoading(false)
    }
  }, [role, uid])

  useEffect(() => {
    if (!actif || !role || !uid) return undefined
    charger()
  }, [actif, role, uid, charger])

  return { data, loading, error, reload: charger }
}