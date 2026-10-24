// ===========================================================================
// Page de profil (/profil)
// ---------------------------------------------------------------------------
// Affiche les informations du compte connecté : nom, prénom, email, rôle,
// dates de création et de dernière connexion, et permet de changer son mot
// de passe via une modale. Le Layout fournit la barre latérale et la
// déconnexion.
// ===========================================================================
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader'
import { RoleBadge } from '@/components/Badge'
import ModalMotDePasse from '@/components/profil/ModalMotDePasse'
import { formatDate } from '@/lib/format'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-all text-right">{value || '—'}</span>
    </div>
  )
}

export default function Profil() {
  const { user, profile } = useAuth()

  const prenom = profile?.prenom || ''
  const nom = profile?.nom || ''

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Mon profil" description="Vos informations personnelles." />

      <Card className="gap-0 py-6">
        <CardContent className="px-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
              {(prenom[0] || 'P').toUpperCase()}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {prenom} {nom}
              </h2>
              <RoleBadge role={profile?.role} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-6">
        <CardContent className="px-6">
          <InfoRow label="Email" value={profile?.email || user?.email} />
          <InfoRow label="Identifiant (uid)" value={user?.uid} />
          <InfoRow label="Rôle" value={profile?.role === 'admin' ? 'Administrateur' : 'Pharmacien'} />
          <InfoRow
            label="Compte"
            value={
              profile?.actif ? (
                <Badge variant="success">Actif</Badge>
              ) : (
                <Badge variant="destructive">Désactivé</Badge>
              )
            }
          />
          <InfoRow label="Créé le" value={formatDate(profile?.createdAt)} />
          <InfoRow label="Dernière connexion" value={formatDate(profile?.lastLogin)} />
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>Modifiez le mot de passe de votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ModalMotDePasse />
        </CardContent>
      </Card>
    </div>
  )
}
