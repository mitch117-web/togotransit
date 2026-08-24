import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-container-low font-sans flex flex-col">
      {/* Hero Section */}
      <header className="bg-primary text-on-primary py-20 px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-container rounded-full translate-y-1/2 -translate-x-1/2 opacity-10 blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[1.25rem] bg-white flex items-center justify-center text-primary shadow-2xl">
              <span className="text-4xl font-black">T</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">TOGOTRANSIT</h1>
          </div>
          
          <div className="flex flex-col gap-4 max-w-2xl">
            <h2 className="text-2xl md:text-4xl font-bold text-secondary">La logistique moderne au Togo</h2>
            <p className="text-lg opacity-80 leading-relaxed">
              Expédiez vos colis et réservez vos voyages en toute simplicité. 
              Une plateforme fiable, rapide et sécurisée pour tous vos besoins de transport.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <Link 
              href="/login" 
              className="bg-white text-primary px-8 py-4 rounded-2xl font-black text-lg hover:bg-secondary hover:text-on-secondary transition-all shadow-xl shadow-primary/20"
            >
              ESPACE AGENT
            </Link>
          </div>
        </div>
      </header>

      {/* Main Actions */}
      <main className="max-w-6xl mx-auto w-full p-4 -mt-16 relative z-20 flex flex-col gap-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tracking Card */}
          <Link href="/tracking" className="group bg-white p-10 rounded-[3rem] border border-outline-variant shadow-2xl hover:border-primary transition-all duration-500 flex flex-col gap-6">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all duration-500">
              <span className="material-symbols-outlined text-5xl">local_shipping</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl font-black text-primary uppercase tracking-tighter">Suivre un colis</h3>
              <p className="text-on-surface-variant text-lg">Entrez votre numéro de tracking pour localiser votre envoi en temps réel.</p>
            </div>
            <div className="mt-4 flex items-center gap-2 font-black text-primary uppercase tracking-widest text-sm">
              Commencer le suivi
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* Booking Card */}
          <Link href="/trips" className="group bg-white p-10 rounded-[3rem] border border-outline-variant shadow-2xl hover:border-secondary transition-all duration-500 flex flex-col gap-6">
            <div className="w-20 h-20 rounded-3xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-all duration-500">
              <span className="material-symbols-outlined text-5xl">confirmation_number</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl font-black text-secondary uppercase tracking-tighter">Réserver un ticket</h3>
              <p className="text-on-surface-variant text-lg">Consultez les horaires de bus et réservez votre place pour votre prochain voyage.</p>
            </div>
            <div className="mt-4 flex items-center gap-2 font-black text-secondary uppercase tracking-widest text-sm">
              Voir les départs
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>

        {/* Features Grid */}
        <section className="py-12 flex flex-col gap-12">
          <h3 className="text-center text-2xl font-black text-primary opacity-30 uppercase tracking-[0.2em]">Pourquoi nous choisir ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Sécurité', text: 'Vos colis et vos voyages sont assurés et tracés de bout en bout.', icon: 'verified_user' },
              { title: 'Partout au Togo', text: 'Un réseau d\'agences couvrant toutes les régions du pays.', icon: 'map' },
              { title: 'Paiement Facile', text: 'Payez via TMoney, Flooz ou directement en agence.', icon: 'account_balance_wallet' }
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-3xl">{f.icon}</span>
                </div>
                <h4 className="text-xl font-black text-primary">{f.title}</h4>
                <p className="text-on-surface-variant text-sm leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto py-16 bg-surface-container text-on-surface-variant text-center border-t border-outline-variant">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 px-4">
          <div className="flex items-center justify-center gap-3 opacity-50">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-bold">T</div>
            <h1 className="text-xl font-black tracking-tighter">TOGOTRANSIT</h1>
          </div>
          <p className="text-xs opacity-60">© 2026 TogoTransit S.A. - Service National de Logistique & Transport. Tous droits réservés.</p>
          <div className="flex justify-center gap-8 font-black uppercase tracking-tighter text-[10px] opacity-40">
            <Link href="#">Aide</Link>
            <Link href="#">Agences</Link>
            <Link href="#">Tarifs</Link>
            <Link href="#">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
