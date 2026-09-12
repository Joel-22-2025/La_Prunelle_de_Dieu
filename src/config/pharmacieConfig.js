// ===========================================================================
// Configuration officielle de la structure « Prunelle de Dieu ».
// ---------------------------------------------------------------------------
// Infos officielles reproduites EXACTEMENT (ne pas inventer/modifier).
// Utilisée par l'en-tête de facture (écran + PDF) et l'ensemble de l'app
// pour éviter toute duplication des coordonnées.
// ===========================================================================
import logo from '@/assets/logo.png'

export const PHARMACIE_CONFIG = {
  nom: `Clinique d'Accouchement Eutocique "La Prunelle de Dieu"`,
  autorisation1: '00449/MS/DC/SGM/CJ',
  autorisation2: 'DNSP/SRS/SA/05/GG22',
  adresse: 'Abomey-Calavi Hévié (Sôke)',
  telephone1: '(229) 01 97 37 00 14',
  telephone2: '(229) 01 45 48 26 85',
  ifu: '0 2021 1292 4290',
  logo,
  devise: 'FCFA',
  messagePied: 'Merci de votre confiance !',
}

// Libellé de l'autorisation complète tel qu'affiché sur la facture.
export const AUTORISATION_COMPLETE = {
  prefixe: 'Autorisation N°',
  ligne1: PHARMACIE_CONFIG.autorisation1,
  ligne2: PHARMACIE_CONFIG.autorisation2,
}