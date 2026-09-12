import { cn } from '@/lib/utils'

// ===========================================================================
// Tooltip local (CSS) : affiché au survol / focus, conforme au style shadcn.
// ===========================================================================
function TooltipProvider({ children }) {
  return children
}

function Tooltip({ children }) {
  return <span className="group/tt relative inline-flex">{children}</span>
}

function TooltipTrigger({ className, children, ...props }) {
  return (
    <span tabIndex={0} className={cn('inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:rounded', className)} {...props}>
      {children}
    </span>
  )
}

function TooltipContent({ side = 'top', className, children }) {
  const positions = {
    top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
    right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
    left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
  }
  return (
    <span
      role="tooltip"
      className={cn(
        'bg-foreground text-background pointer-events-none absolute z-50 hidden w-max max-w-xs rounded-md px-2 py-1 text-xs font-medium shadow-sm group-hover/tt:block group-focus-visible/tt:block group-hover/tt:animate-in group-hover/tt:fade-in-0 group-hover/tt:zoom-in-95',
        positions[side] || positions.top,
        className,
      )}
    >
      {children}
    </span>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }