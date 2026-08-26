import React from 'react'
import Link from 'next/link'
import SidebarLinks from '@/components/admin/SidebarLinks'
import LogoutButton from '@/components/admin/LogoutButton'
import MobileNav from '@/components/admin/MobileNav'
import LanguageSelector from '@/components/LanguageSelector'
import AdminUserBadge from '@/components/admin/AdminUserBadge'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row font-sans">
      {/* SideNavBar (Desktop) */}
      <nav className="hidden md:flex flex-col h-screen w-64 left-0 top-0 sticky bg-surface-container-low border-r border-outline-variant p-4 gap-2 z-40 shadow-sm">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-black text-xl shadow-md">
            T
          </div>
          <div>
            <h1 className="font-black text-lg text-primary leading-tight">TogoTransit</h1>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider opacity-70">Portail Pro & Admin</p>
          </div>
        </div>
        
        <SidebarLinks />

        <Link href="/admin/parcels/new" className="w-full bg-primary text-on-primary text-xs font-black py-3 rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-4 shadow-md group uppercase tracking-wider">
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          Nouvel Envoi Colis
        </Link>
        
        <div className="mt-4 pt-4 border-t border-outline-variant/60">
          <AdminUserBadge />
        </div>
      </nav>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopAppBar */}
        <header className="sticky top-0 w-full z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary font-black text-sm">
              T
            </div>
            <div className="font-black text-primary text-sm">TogoTransit Pro</div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <form className="relative w-full" action="/admin/parcels" method="GET">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                name="q"
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-xs font-bold focus:outline-none focus:border-primary transition-all" 
                placeholder="Rechercher un colis, un passager..." 
                type="text"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 bg-background overflow-x-hidden pb-24 md:pb-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
