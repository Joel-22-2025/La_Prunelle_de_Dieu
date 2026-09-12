import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

// ===========================================================================
// Menu déroulant (équivalent shadcn DropdownMenu) — implémentation locale
// accessible : ouverture au clic, fermeture clic extérieur / Échap, navigation
// au clavier (Entrée/Space, Échap). Sans dépendance Radix supplémentaire.
// ===========================================================================

const DropdownMenuContext = React.createContext(null)

function DropdownMenu({ children, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen)

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((o) => !o),
      close: () => setOpen(false),
    }),
    [open],
  )

  const containerRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={value}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({ asChild = false, className, children, ...props }) {
  const { open, toggle } = React.useContext(DropdownMenuContext)
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="dropdown-menu-trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={(event) => {
        event.preventDefault()
        toggle()
      }}
      className={cn('outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded-md', className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

function DropdownMenuContent({ className, align = 'end', children, ...props }) {
  const { open } = React.useContext(DropdownMenuContext)
  if (!open) return null
  return (
    <div
      data-slot="dropdown-menu-content"
      role="menu"
      aria-orientation="vertical"
      className={cn(
        'bg-popover text-popover-foreground absolute top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-lg border p-1 shadow-md',
        'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuLabel({ className, ...props }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn('px-2.5 py-1.5 text-sm font-semibold text-foreground', className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <div
      data-slot="dropdown-menu-separator"
      role="separator"
      aria-orientation="horizontal"
      className={cn('bg-border -mx-1 my-1 h-px', className)}
      {...props}
    />
  )
}

function DropdownMenuItem({ className, inset, onSelect, onClick, children, ...props }) {
  const { close } = React.useContext(DropdownMenuContext)
  return (
    <button
      data-slot="dropdown-menu-item"
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event)
        onSelect?.()
        close()
      }}
      className={cn(
        "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent/60 hover:bg-accent focus:text-accent-foreground hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuGroup({ className, ...props }) {
  return <div data-slot="dropdown-menu-group" className={cn('space-y-0.5', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuGroup,
}