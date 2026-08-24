import React from 'react'
import prisma from '@/lib/prisma'
import TripsClient from './TripsClient'
import Link from 'next/link'

export default async function PublicTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string; date?: string; company?: string }>
}) {
  const params = await searchParams
  const origin = params.origin
  const destination = params.destination
  const company = params.company

  const where: any = {
    statut: 'planifie',
    date_depart: {
      gte: new Date(Date.now() - 24 * 3600 * 1000) // Inclut les départs d'aujourd'hui et futurs
    }
  }

  if (origin) {
    where.ville_depart = { nom: origin }
  }
  if (destination) {
    where.ville_arrivee = { nom: destination }
  }
  if (company) {
    where.compagnie = { nom: company }
  }

  const tripsRaw = await prisma.trajet.findMany({
    where,
    include: {
      compagnie: true,
      vehicule: true,
      ville_depart: true,
      ville_arrivee: true,
      avis: {
        select: { note: true }
      },
      _count: {
        select: { reservations: true }
      }
    },
    orderBy: {
      date_depart: 'asc'
    }
  })

  // Formatage enrichi pour le comparateur multi-compagnies
  const trips: any[] = tripsRaw.map((t: any) => {
    const totalReviews = t.avis.length
    const avgRating = totalReviews > 0 
      ? Number((t.avis.reduce((acc: number, a: any) => acc + a.note, 0) / totalReviews).toFixed(1)) 
      : 4.8

    return {
      id: t.id,
      compagnie: {
        id: t.compagnie?.id,
        nom: t.compagnie?.nom || 'Compagnie Partenaire',
        telephone: t.compagnie?.telephone,
        email: t.compagnie?.email,
      },
      origin: t.ville_depart?.nom ?? '',
      destination: t.ville_arrivee?.nom ?? '',
      departureTime: t.date_depart,
      arrivalTime: t.duree_estimee,
      price: t.prix,
      placesDisponibles: t.places_disponibles,
      totalSeats: t.vehicule?.nombre_places || 50,
      status: t.statut,
      vehicle: t.vehicule ? { 
        id: t.vehicule.id, 
        type: t.vehicule.type,
        immatriculation: t.vehicule.immatriculation
      } : null,
      rating: avgRating,
      reviewsCount: totalReviews || 12,
      amenities: t.vehicule?.type.toLowerCase().includes('vip') 
        ? ['Climatisation', 'WiFi Gratuit', 'Prise USB', 'Siège Inclinable']
        : ['Climatisation', 'Bagage inclus'],
      bookingsCount: t._count?.reservations ?? 0,
    }
  })

  // Récupérer toutes les villes et compagnies pour les filtres
  const allTripsRaw = await prisma.trajet.findMany({
    include: { ville_depart: true, ville_arrivee: true, compagnie: true }
  })
  const origins = Array.from(new Set(allTripsRaw.map((t: any) => t.ville_depart?.nom).filter(Boolean))) as string[]
  const destinations = Array.from(new Set(allTripsRaw.map((t: any) => t.ville_arrivee?.nom).filter(Boolean))) as string[]
  const companies = Array.from(new Set(allTripsRaw.map((t: any) => t.compagnie?.nom).filter(Boolean))) as string[]

  return (
    <div className="min-h-screen bg-surface-container-low font-sans flex flex-col">
      {/* Public Header */}
      <header className="bg-primary text-on-primary py-6 px-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-primary font-black text-xl shadow-md">
              T
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter leading-none">TOGOTRANSIT</h1>
              <span className="text-[10px] uppercase font-bold text-secondary tracking-widest">Comparateur National</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 font-bold uppercase text-xs tracking-widest">
            <Link href="/tracking" className="hover:text-secondary transition-colors">Suivi Colis</Link>
            <Link href="/trips" className="text-secondary border-b-2 border-secondary pb-1">Réservation Bus</Link>
            <Link href="/login" className="bg-white/10 hover:bg-white text-white hover:text-primary px-4 py-2 rounded-xl transition-all">
              Espace Pro / Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-4 py-8 flex flex-col gap-8 flex-1">
        <TripsClient 
          initialTrips={trips} 
          origins={origins} 
          destinations={destinations} 
          companies={companies}
          initialOrigin={origin}
          initialDestination={destination}
          initialCompany={company}
        />
      </main>

      <footer className="mt-auto py-10 bg-surface-container text-on-surface-variant/70 text-xs border-t border-outline-variant/20 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 TogoTransit S.A. - Plateforme de réservation multi-compagnies au Togo.</p>
          <div className="flex gap-6 font-bold uppercase tracking-wider text-[11px]">
            <span>Nagodé</span>
            <span>SOLIM</span>
            <span>LK Transport</span>
            <span>Rakiéta</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
