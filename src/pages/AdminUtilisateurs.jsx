// ===========================================================================
// Page : /admin/utilisateurs — gestion des comptes (admin uniquement).
// ---------------------------------------------------------------------------
// Liste en temps réel, création de comptes pharmaciens (pas d'inscription
// publique), activation / désactivation des comptes. Réservée à l'admin.
// ===========================================================================
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { toast } from '@/components/ui/sonner'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { createPharmacien, disableUser, enableUser, errAuthMsg } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { SpinnerInButton } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import ConfirmDialog from '@/components/ConfirmDialog'
import { RoleBadge } from '@/components/Badge'
import { formatDate } from '@/lib/format'

function ActifBadge({ actif }) {
  return actif ? (
    <Badge variant="success">Actif</Badge>
  ) : (
    <Badge variant="destructive">Désactivé</Badge>
  )
}

// ---------------------------------------------------------------------------
// Formulaire de création d'un pharmacien.
// ---------------------------------------------------------------------------
function CreatePharmacienForm({ onCreated }) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setCreating(true)

    try {
      await createPharmacien({ nom, prenom, email, password })
      setNom('')
      setPrenom('')
      setEmail('')
      setPassword('')
      toast.success('Compte pharmacien créé')
      onCreated?.()
    } catch (err) {
      setError(errAuthMsg(err.code) || err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="np-nom">Nom</Label>
        <Input id="np-nom" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Durand" />
      </div>
      <div>
        <Label htmlFor="np-prenom">Prénom</Label>
        <Input id="np-prenom" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Camille" />
      </div>
      <div>
        <Label htmlFor="np-email">Adresse email</Label>
        <Input id="np-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille.durand@prunelle.fr" />
      </div>
      <div>
        <Label htmlFor="np-password">Mot de passe temporaire</Label>
        <Input id="np-password" type="text" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 6 caractères" />
      </div>

      <div className="sm:col-span-2">
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        <Button type="submit" disabled={creating}>
          <SpinnerInButton busy={creating} />
          Créer le compte pharmacien
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Page principale.
// ---------------------------------------------------------------------------
export default function AdminUtilisateurs() {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState(null) // utilisateur à activer/désactiver
  const [actionLoading, setActionLoading] = useState(false)

  // Liste en temps réel des utilisateurs (la plus récente en premier).
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = []
        snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }))
        setUsers(list)
        setLoading(false)
      },
      (err) => {
        console.error('Erreur lors du chargement des utilisateurs :', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  const confirmerToggle = async () => {
    if (!target) return
    setActionLoading(true)
    try {
      if (target.actif) {
        await disableUser(target.uid)
        toast.success('Compte désactivé')
      } else {
        await enableUser(target.uid)
        toast.success('Compte réactivé')
      }
      setTarget(null)
    } catch (err) {
      toast.error("L'opération a échoué", { description: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner label="Chargement des utilisateurs…" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes : seul un administrateur peut créer des pharmaciens."
      />

      {/* Création d'un pharmacien */}
      <Card className="py-5">
        <CardHeader>
          <CardTitle>Créer un compte pharmacien</CardTitle>
          <CardDescription>L&apos;accès sera immédiatement disponible pour le pharmacien créé.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePharmacienForm />
        </CardContent>
      </Card>

      {/* Liste des utilisateurs */}
      <Card className="py-0">
        <CardHeader>
          <CardTitle>Comptes ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {users.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">Aucun compte.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="px-4">Nom</TableHead>
                  <TableHead className="px-4">Email</TableHead>
                  <TableHead className="px-4">Rôle</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4">Créé le</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.uid === user?.uid
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="px-4 font-medium">
                        {u.prenom} {u.nom}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="px-4">
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="px-4">
                        <ActifBadge actif={u.actif} />
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="px-4 text-right">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">Vous</span>
                        ) : u.actif ? (
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setTarget(u)}>
                            Désactiver
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="text-success hover:text-success" onClick={() => setTarget(u)}>
                            Réactiver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.actif ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
        description={
          target?.actif
            ? `${target?.prenom} ${target?.nom} ne pourra plus se connecter.`
            : `${target?.prenom} ${target?.nom} pourra de nouveau se connecter.`
        }
        confirmLabel={target?.actif ? 'Désactiver' : 'Réactiver'}
        destructive={target?.actif}
        loading={actionLoading}
        onConfirm={confirmerToggle}
      />
    </div>
  )
}