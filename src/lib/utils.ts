import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Fusionne les classes CSS sans conflit (utilisé par tous les composants shadcn).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}