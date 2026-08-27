import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex flex-col relative overflow-hidden">
      {/* Ambiance de fond */}
      <div className="absolute top-[-12rem] right-[-8rem] w-[36rem] h-[36rem] bg-primary rounded-full opacity-[0.12] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-14rem] left-[-10rem] w-[32rem] h-[32rem] bg-secondary rounded-full opacity-[0.10] blur-3xl pointer-events-none"></div>
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #f5f7ff 1px, transparent 1px)',
          backgroundSize: '2rem 2rem',
        }}
      ></div>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 relative z-10">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] bg-primary flex items-center justify-center text-on-primary shadow-2xl shadow-primary/30">
              <span className="text-4xl md:text-5xl font-black">T</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">TOGOTRANSIT</h1>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl md:text-4xl font-bold text-primary">La logistique moderne au Togo</h2>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl">
              Plateforme de gestion des trajets, de la flotte et des colis pour les compagnies
              de transport togolaises — fiable, rapide et sécurisée.
            </p>
          </div>

          <Link
            href="/login"
            className="group flex items-center gap-3 bg-primary text-on-primary px-10 py-5 rounded-2xl font-black text-lg hover:brightness-110 transition-all shadow-xl shadow-primary/20"
          >
            <span className="material-symbols-outlined text-2xl">login</span>
            SE CONNECTER
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>

          <p className="text-sm text-on-surface-variant -mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">smartphone</span>
            Voyageur ? Réservez vos trajets et suivez vos colis depuis l&apos;application mobile TogoTransit.
          </p>
        </div>

        {/* Points forts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl w-full">
          {[
            { title: 'Sécurité', text: 'Trajets et colis assurés, tracés de bout en bout.', icon: 'verified_user' },
            { title: 'Partout au Togo', text: 'Un réseau d\'agences couvrant toutes les régions du pays.', icon: 'map' },
            { title: 'Paiement Facile', text: 'TMoney, Flooz ou règlement directement en agence.', icon: 'account_balance_wallet' }
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4 bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">{f.icon}</span>
              </div>
              <h4 className="text-lg font-black text-primary">{f.title}</h4>
              <p className="text-on-surface-variant text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-10 bg-surface-container text-on-surface-variant text-center border-t border-outline-variant relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-4 px-4">
          <p className="text-xs opacity-60">© 2026 TogoTransit S.A. - Service National de Logistique & Transport. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
