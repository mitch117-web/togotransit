'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const TOGO_CORRIDOR_CITIES = [
  { name: 'Dapaong', x: 78, y: 40 },
  { name: 'Kara', x: 62, y: 190 },
  { name: 'Sokodé', x: 74, y: 340 },
  { name: 'Atakpamé', x: 56, y: 490 },
  { name: 'Tsévié', x: 68, y: 610 },
  { name: 'Lomé', x: 60, y: 700 },
]

function TogoCorridorWatermark() {
  const points = TOGO_CORRIDOR_CITIES.map((c) => `${c.x},${c.y}`).join(' ')
  return (
    <svg
      className="absolute top-0 right-0 h-full w-auto opacity-[0.04] pointer-events-none"
      viewBox="0 0 140 740"
      fill="none"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      <polyline points={points} stroke="#1E293B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 14" />
      {TOGO_CORRIDOR_CITIES.map((c) => (
        <circle key={c.name} cx={c.x} cy={c.y} r={c.name === 'Lomé' ? 7 : 4.5} fill="#1E293B" />
      ))}
    </svg>
  )
}

function HeroIllustration() {
  return (
    <div className="relative w-full aspect-square max-w-sm mx-auto">
      <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/15 to-secondary/10" />
      <div className="absolute inset-8 rounded-[2.5rem] border border-outline-variant bg-white/70 backdrop-blur-sm flex items-center justify-center">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '7rem' }}>directions_bus</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="absolute -top-2 -left-4 bg-white shadow-lg rounded-2xl px-4 py-3 border border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-emerald-600 text-xl">dashboard</span>
        <div className="text-left">
          <p className="text-[0.625rem] font-black text-on-surface-variant uppercase">Tableau de bord</p>
          <p className="text-xs font-bold text-on-background">Flotte &amp; trajets en direct</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="absolute -bottom-2 -right-2 bg-white shadow-lg rounded-2xl px-4 py-3 border border-outline-variant">
        <p className="text-[0.625rem] font-black text-on-surface-variant uppercase">Chiffre d&apos;affaires</p>
        <p className="text-sm font-black text-emerald-600 flex items-center gap-1">
          <span className="material-symbols-outlined text-base">trending_up</span> +12,5 %
        </p>
      </motion.div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-container-low to-surface-container font-sans flex flex-col relative overflow-x-hidden">
      {/* En-tête */}
      <header className="w-full bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center gap-6 px-4 md:px-8 py-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-md">
              <span className="text-xl font-black">T</span>
            </div>
            <span className="text-lg font-black tracking-tight text-on-background">TOGOTRANSIT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-on-surface-variant ml-4">
            <a href="#services" className="hover:text-primary transition-colors">Nos services</a>
            <a href="#compagnies" className="hover:text-primary transition-colors">Compagnies partenaires</a>
          </nav>

          <Link
            href="/login"
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-primary/20 ml-auto"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Se connecter
          </Link>
        </div>
      </header>

      {/* Ambiance de fond */}
      <div className="absolute top-[8rem] right-[-8rem] w-[36rem] h-[36rem] bg-primary rounded-full opacity-[0.1] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-14rem] left-[-10rem] w-[32rem] h-[32rem] bg-secondary rounded-full opacity-[0.08] blur-3xl pointer-events-none"></div>
      <TogoCorridorWatermark />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl w-full mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-8">
        <div className="bg-white/60 backdrop-blur-md border border-outline-variant rounded-[2.5rem] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-8 md:p-14">
            <div className="flex flex-col gap-5 text-center md:text-left items-center md:items-start">
              <span className="inline-block bg-primary-container text-on-primary-container text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                Espace professionnel
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-on-background leading-[1.1]">
                La logistique moderne au <span className="text-primary">Togo</span>
              </h1>
              <p className="text-on-surface-variant text-base md:text-lg max-w-md">
                TogoTransit centralise, pour les compagnies de transport togolaises, la gestion de la flotte, des trajets, des réservations et des colis dans un seul espace en ligne.
              </p>
              <Link
                href="/login"
                className="group mt-2 flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-xl">login</span>
                SE CONNECTER
                <span className="material-symbols-outlined transition-transform duration-300 group-hover:translate-x-1.5">arrow_forward</span>
              </Link>
            </div>
            <HeroIllustration />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="px-5 py-3 rounded-full bg-surface-container-lowest/70 backdrop-blur-sm border border-outline-variant">
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-base">smartphone</span>
              Voyageur ? Réservez vos trajets et suivez vos colis depuis l&apos;application mobile TogoTransit.
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative z-10 max-w-6xl w-full mx-auto px-4 py-16 md:py-24">
        <h3 className="text-center text-sm font-black text-on-surface-variant uppercase tracking-[0.2em] mb-10">Ce que permet la plateforme</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Gestion de flotte', text: 'Véhicules, statuts et capacités suivis en temps réel.', icon: 'directions_bus' },
            { title: 'Trajets & réservations', text: 'Planification des départs et suivi des places disponibles.', icon: 'confirmation_number' },
            { title: 'Colis & livraisons', text: 'Enregistrement, suivi et preuve de livraison numérique.', icon: 'local_shipping' },
          ].map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-4 bg-white/60 backdrop-blur-md p-7 rounded-3xl border border-outline-variant shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] hover:-translate-y-2 hover:shadow-[0_24px_40px_-18px_rgba(15,23,42,0.22)] transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
              </div>
              <h4 className="text-base font-black text-on-background">{f.title}</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compagnies partenaires */}
      <section id="compagnies" className="relative z-10 max-w-6xl w-full mx-auto px-4 pb-20">
        <div className="bg-white/60 backdrop-blur-md border border-outline-variant rounded-[2rem] p-8 md:p-12 text-center flex flex-col items-center gap-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]">
          <span className="material-symbols-outlined text-primary text-4xl">handshake</span>
          <h3 className="text-2xl font-black text-on-background">Nagodé Transport, SOLIM Transport, LK Transport…</h3>
          <p className="text-on-surface-variant max-w-xl">
            Déjà plusieurs compagnies togolaises font confiance à TogoTransit pour gérer leur flotte et leurs réservations en ligne.
          </p>
          <Link href="/login" className="mt-2 font-black text-primary hover:underline flex items-center gap-1">
            Devenir compagnie partenaire
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </section>

      <footer className="py-12 mt-4 bg-surface-container text-on-surface-variant text-center border-t border-outline-variant relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 px-4">
          <p className="text-xs opacity-60">© 2026 TogoTransit S.A. - Service National de Logistique &amp; Transport. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
