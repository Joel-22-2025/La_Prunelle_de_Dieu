import { cn } from '@/lib/utils'

// ===========================================================================
// Avatar : image (optionnel) avec repli sur les initiales. Composant local
// sans dépendance Radix, conforme au style shadcn.
// ===========================================================================
function Avatar({ className, ...props }) {
  return (
    <span
      data-slot="avatar"
      className={cn('bg-muted text-muted-foreground relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
}

function AvatarImage({ src, alt = '', className, ...props }) {
  if (!src) return null
  return <img src={src} alt={alt} data-slot="avatar-image" className={cn('aspect-square size-full object-cover', className)} {...props} />
}

function AvatarFallback({ className, ...props }) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn('bg-muted flex size-full items-center justify-center rounded-full text-sm font-medium', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }