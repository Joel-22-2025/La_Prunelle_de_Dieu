// ===========================================================================
// Écran de démarrage (splash) affiché avant l'application / la page login.
// ---------------------------------------------------------------------------
// Reprend l'animation de la croix « Prunelle de Dieu » : vague bleue qui monte
// dans la croix, halo pulsé, titre et points de chargement. L'affichage et le
// fondu de sortie sont pilotés par App.jsx.
// ===========================================================================
import { cn } from '@/lib/utils'

// Contour de la croix médicale (viewBox 400 × 400).
const CROIX =
  'M130,74 Q130,40 164,40 L236,40 Q270,40 270,74 L270,114 Q270,130 286,130 L326,130 Q360,130 360,164 L360,236 Q360,270 326,270 L286,270 Q270,270 270,286 L270,326 Q270,360 236,360 L164,360 Q130,360 130,326 L130,286 Q130,270 114,270 L74,270 Q40,270 40,236 L40,164 Q40,130 74,130 L114,130 Q130,130 130,114 Z'

// Vague répétée tous les 200 unités → translation de -200 px parfaitement
// continue. Deux couches décalées donnent un léger effet de profondeur.
const VAGUE =
  'M-400 245 Q-350 215 -300 245 T-200 245 T-100 245 T0 245 T100 245 T200 245 T300 245 T400 245 T500 245 T600 245 T700 245 T800 245 V420 H-400 Z'

export default function SplashScreen({ leaving = false }) {
  return (
    <div
      className={cn('splash-screen', leaving && 'splash-screen--out')}
      role="status"
      aria-live="polite"
      aria-label="Chargement de l'application"
    >
      <div className="splash-mark-wrap">
        <span className="splash-glow" aria-hidden="true" />
        <svg
          className="splash-mark"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="splashCrossClip">
              <path d={CROIX} />
            </clipPath>
            <linearGradient id="splashGradLight" x1="60" y1="60" x2="360" y2="340" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#EAF4FE" />
              <stop offset="100%" stopColor="#CFE4FA" />
            </linearGradient>
            <linearGradient id="splashGradBlue" x1="80" y1="40" x2="340" y2="380" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5BC8FA" />
              <stop offset="45%" stopColor="#1E88E5" />
              <stop offset="100%" stopColor="#0B3E8F" />
            </linearGradient>
            <linearGradient id="splashSheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g clipPath="url(#splashCrossClip)">
            <rect width="400" height="400" fill="url(#splashGradLight)" />

            <g className="splash-water">
              <path className="splash-wave" d={VAGUE} fill="url(#splashGradBlue)" />
              <g transform="translate(0 16)" opacity="0.35">
                <path className="splash-wave splash-wave--fast" d={VAGUE} fill="#8ED8FF" />
              </g>
            </g>

            <rect width="400" height="400" fill="url(#splashSheen)" />
          </g>

          <path d={CROIX} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="splash-brand">
        <h1>La Prunelle de Dieu</h1>
        <p>Clinique d&apos;Accouchement Eutocique</p>
        <div className="splash-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
