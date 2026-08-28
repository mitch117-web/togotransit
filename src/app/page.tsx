import Link from 'next/link'

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
      className="absolute top-0 right-0 h-full w-auto opacity-[0.05] pointer-events-none"
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-surface-container-low to-surface-container font-sans flex flex-col relative overflow-hidden">
      {/* Ambiance de fond */}
      <div className="absolute top-[-12rem] right-[-8rem] w-[36rem] h-[36rem] bg-primary rounded-full opacity-[0.12] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-14rem] left-[-10rem] w-[32rem] h-[32rem] bg-secondary rounded-full opacity-[0.10] blur-3xl pointer-events-none"></div>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '2rem 2rem',
        }}
      ></div>
      {/* Filigrane : corridor routier Lomé–Dapaong, en écho au réseau TogoTransit */}
      <TogoCorridorWatermark />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-32 md:py-40 relative z-10">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] bg-primary flex items-center justify-center text-on-primary shadow-2xl shadow-primary/30">
              <span className="text-4xl md:text-5xl font-black">T</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-on-background">TOGOTRANSIT</h1>
          </div>

          <div className="flex flex-col gap-5">
            <h2 className="text-2xl md:text-4xl font-bold text-primary">La logistique moderne au Togo</h2>
            <p className="text-lg text-on-background leading-relaxed max-w-xl">
              Plateforme de gestion des trajets, de la flotte et des colis pour les compagnies
              de transport togolaises — fiable, rapide et sécurisée.
            </p>
          </div>

          <Link
            href="/login"
            className="group flex items-center gap-3 bg-primary text-on-primary px-10 py-5 rounded-2xl font-black text-lg hover:brightness-110 hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.97] transition-all duration-300 shadow-xl shadow-primary/20"
          >
            <span className="material-symbols-outlined text-2xl">login</span>
            SE CONNECTER
            <span className="material-symbols-outlined transition-transform duration-300 group-hover:translate-x-2">arrow_forward</span>
          </Link>

          <div className="mt-6 px-5 py-3 rounded-full bg-surface-container-lowest/70 backdrop-blur-sm border border-outline-variant">
            <p className="text-sm text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-base">smartphone</span>
              Voyageur ? Réservez vos trajets et suivez vos colis depuis l&apos;application mobile TogoTransit.
            </p>
          </div>
        </div>

        {/* Points forts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 md:mt-40 max-w-4xl w-full">
          {[
            { title: 'Sécurité', text: 'Trajets et colis assurés, tracés de bout en bout.', icon: 'verified_user' },
            { title: 'Partout au Togo', text: 'Un réseau d\'agences couvrant toutes les régions du pays.', icon: 'map' },
            { title: 'Paiement Facile', text: 'TMoney, Flooz ou règlement directement en agence.', icon: 'account_balance_wallet' }
          ].map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-4 bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-outline-variant shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] hover:-translate-y-2 hover:shadow-[0_24px_40px_-18px_rgba(15,23,42,0.22)] transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
              </div>
              <h4 className="text-lg font-black text-primary">{f.title}</h4>
              <p className="text-on-background text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-12 mt-20 bg-surface-container text-on-surface-variant text-center border-t border-outline-variant relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 px-4">
          <p className="text-xs opacity-60">© 2026 TogoTransit S.A. - Service National de Logistique & Transport. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
