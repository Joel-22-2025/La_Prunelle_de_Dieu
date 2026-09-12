// ===========================================================================
// Layout applicatif :
//  - desktop  : sidebar fixe (menu selon le rôle) + header sticky + contenu.
//  - mobile   : sidebar repliée dans un Sheet (bouton hamburger du header).
// Le header contient la recherche globale, les notifications de stock et le
// menu utilisateur.
// ===========================================================================
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  ReceiptText,
  ShoppingCart,
  UserCircle,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'
import { cn } from '@/lib/utils'
import { RoleBadge } from '@/components/Badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import GlobalSearch from '@/components/dashboard/GlobalSearch'
import Notifications from '@/components/dashboard/Notifications'

const ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/vente', label: 'Nouvelle vente', icon: ReceiptText, end: true },
  { to: '/ventes', label: 'Ventes', icon: ShoppingCart },
  { to: '/factures', label: 'Factures', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
]

const ITEMS_ADMIN = [
  ...ITEMS,
  { to: '/admin/medicaments', label: 'Médicaments', icon: Pill },
  { to: '/admin/stock', label: 'Stock', icon: Boxes },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
]

// ---------------------------------------------------------------------------
// Liste de navigation réutilisée (sidebar desktop + Sheet mobile).
// ---------------------------------------------------------------------------
function NavList({ items, className, onNavigate }) {
  return (
    <nav className={cn('space-y-1 px-3 py-4', className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? item.to === '/dashboard'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Barre de marque (sidebar + Sheet).
// ---------------------------------------------------------------------------
function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <img
        src={logo}
        alt="Logo La Prunelle de Dieu"
        className="size-15 shrink-0 rounded-xl object-contain"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">La Prunelle de Dieu</p>
        <p className="truncate text-xs text-sidebar-foreground/60">Gestion Pharmacie</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bloc utilisateur (sidebar desktop).
// ---------------------------------------------------------------------------
function UserFooter({ profile, user, onNavigate }) {
  const initial = (profile?.prenom || profile?.nom || user?.email || 'P').charAt(0).toUpperCase()
  return (
    <div className="border-t border-sidebar-border p-4">
      <NavLink
        to="/profil"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent/70"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary-foreground">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sidebar-foreground">
            {profile?.prenom} {profile?.nom}
          </p>
          <RoleBadge role={profile?.role} className="mt-0.5" />
        </div>
      </NavLink>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout principal.
// ---------------------------------------------------------------------------
export default function Layout() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuMobile, setMenuMobile] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const items = isAdmin ? ITEMS_ADMIN : ITEMS

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initial = (profile?.prenom || profile?.nom || user?.email || 'P').charAt(0).toUpperCase()
  const nomComplet = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim()

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ----- Sidebar desktop ----- */}
      <aside className="bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border lg:flex print:hidden">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList items={items} />
        </div>
        <UserFooter profile={profile} user={user} />
      </aside>

      {/* ----- Zone de contenu ----- */}
      <div className="lg:pl-64 print:pl-0">
        {/* Header sticky */}
        <header className="bg-background/80 sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6 print:hidden">
          {/* Menu mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuMobile(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </Button>

          <span className="text-sm font-semibold lg:hidden">Prunelle</span>

          {/* Recherche globale */}
          <div className="mx-auto flex w-full max-w-md justify-center">
            <GlobalSearch isAdmin={isAdmin} />
          </div>

          {/* Notifications + profil */}
          <div className="ml-auto flex items-center gap-1.5">
            <Notifications isAdmin={isAdmin} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full p-1 outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Menu utilisateur"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[8rem] truncate text-sm font-medium leading-tight">
                      {nomComplet || user?.email}
                    </span>
                    <span className="block text-xs capitalize text-muted-foreground">
                      {profile?.role === 'admin' ? 'Administrateur' : 'Pharmacien'}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="block truncate">{nomComplet || user?.email}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/profil')}>
                  <UserCircle className="text-muted-foreground" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="text-destructive" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>

      {/* ----- Menu mobile (Sheet) ----- */}
      <Sheet open={menuMobile} onOpenChange={setMenuMobile}>
        <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 border-sidebar-border p-0">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          </SheetHeader>
          <Brand />
          <div className="flex-1 overflow-y-auto">
            <NavList items={items} onNavigate={() => setMenuMobile(false)} />
          </div>
          <UserFooter profile={profile} user={user} onNavigate={() => setMenuMobile(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}