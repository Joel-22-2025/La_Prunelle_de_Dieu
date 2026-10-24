// ===========================================================================
// Modale de changement de mot de passe (page Profil).
// ---------------------------------------------------------------------------
// S'ouvre depuis le bouton « Nouveau mot de passe ». L'utilisateur peut
// afficher/masquer chaque saisie, et toutes les erreurs de validation sont
// remontées par des toasts explicites.
// ===========================================================================
import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SpinnerInButton } from '@/components/ui/spinner'
import { toast } from '@/components/ui/sonner'
import {
  changerMotDePasse,
  LONGUEUR_MAX_MOT_DE_PASSE,
  LONGUEUR_MIN_MOT_DE_PASSE,
} from '@/services/authService'

// Champ mot de passe avec bouton œil pour révéler la saisie.
function ChampMotDePasse({ id, label, value, onChange, visible, onToggle, autoComplete, maxLength }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export default function ModalMotDePasse() {
  const [open, setOpen] = useState(false)
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState({ actuel: false, nouveau: false, confirmation: false })
  const [enCours, setEnCours] = useState(false)

  const reinitialiser = () => {
    setMotDePasseActuel('')
    setNouveauMotDePasse('')
    setConfirmation('')
    setVisible({ actuel: false, nouveau: false, confirmation: false })
  }

  const handleOpenChange = (ouvert) => {
    setOpen(ouvert)
    if (!ouvert) reinitialiser()
  }

  const basculerVisibilite = (champ) => {
    setVisible((etat) => ({ ...etat, [champ]: !etat[champ] }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!motDePasseActuel) {
      toast.error('Mot de passe actuel requis', {
        description: 'Saisissez votre mot de passe actuel pour confirmer le changement.',
      })
      return
    }
    if (nouveauMotDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
      toast.error('Nouveau mot de passe trop court', {
        description: `Le nouveau mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
      })
      return
    }
    if (nouveauMotDePasse.length > LONGUEUR_MAX_MOT_DE_PASSE) {
      toast.error('Nouveau mot de passe trop long', {
        description: `Le nouveau mot de passe ne doit pas dépasser ${LONGUEUR_MAX_MOT_DE_PASSE} caractères.`,
      })
      return
    }
    if (nouveauMotDePasse === motDePasseActuel) {
      toast.error('Mot de passe inchangé', {
        description: "Le nouveau mot de passe doit être différent de l'actuel.",
      })
      return
    }
    if (nouveauMotDePasse !== confirmation) {
      toast.error('Confirmation incorrecte', {
        description: 'Les deux mots de passe saisis ne correspondent pas.',
      })
      return
    }

    setEnCours(true)
    try {
      await changerMotDePasse({ motDePasseActuel, nouveauMotDePasse })
      toast.success('Mot de passe mis à jour', {
        description: 'Utilisez ce nouveau mot de passe à votre prochaine connexion.',
      })
      setOpen(false)
      reinitialiser()
    } catch (err) {
      toast.error('Changement impossible', { description: err.message })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <KeyRound />
          Nouveau mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le mot de passe</DialogTitle>
          <DialogDescription>
            Pour votre sécurité, confirmez avec votre mot de passe actuel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <ChampMotDePasse
            id="mdp-actuel"
            label="Mot de passe actuel"
            value={motDePasseActuel}
            onChange={setMotDePasseActuel}
            visible={visible.actuel}
            onToggle={() => basculerVisibilite('actuel')}
            autoComplete="current-password"
          />
          <ChampMotDePasse
            id="mdp-nouveau"
            label="Nouveau mot de passe"
            value={nouveauMotDePasse}
            onChange={setNouveauMotDePasse}
            visible={visible.nouveau}
            onToggle={() => basculerVisibilite('nouveau')}
            autoComplete="new-password"
            maxLength={LONGUEUR_MAX_MOT_DE_PASSE}
          />
          <ChampMotDePasse
            id="mdp-confirmation"
            label="Confirmer le nouveau mot de passe"
            value={confirmation}
            onChange={setConfirmation}
            visible={visible.confirmation}
            onToggle={() => basculerVisibilite('confirmation')}
            autoComplete="new-password"
            maxLength={LONGUEUR_MAX_MOT_DE_PASSE}
          />

          <p className="text-xs text-muted-foreground">
            Le nouveau mot de passe doit contenir entre {LONGUEUR_MIN_MOT_DE_PASSE} et{' '}
            {LONGUEUR_MAX_MOT_DE_PASSE} caractères.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={enCours}
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={enCours}>
              <SpinnerInButton busy={enCours} />
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
