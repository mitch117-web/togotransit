import React from 'react'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import DashboardCharts from './DashboardCharts'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'

/**
 * Lecture du contexte de la session depuis le JWT signé (cookie).
 * Retourne le rôle, l'ID utilisateur, et l'ID de la compagnie.
 */
async function getSessionContext() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return { role: null, compagnieId: null, userId: null }

  const payload = verifyToken(token)
  if (!payload) return { role: null, compagnieId: null, userId: null }

  return {
    role: payload.role,
    compagnieId: payload.compagnieId,
    userId: payload.userId,
  }
}

/**
 * Récupération des statistiques filtrées selon le rôle connecté :
 * - super_admin → voit toutes les données de toutes les compagnies
 * - gestionnaire → voit uniquement les données de sa compagnie
 */
async function getStats(role: string | null, compagnieId: number | null) {
  // Filtre de compagnie : null = tout voir (super_admin), sinon filtrer
  const compagnieFilter = (role === 'super_admin' || !compagnieId)
    ? {}
    : { compagnie_id: compagnieId }

  const parcelFilter = (role === 'super_admin' || !compagnieId)
    ? {}
    : { compagnie_id: compagnieId }

  // Infos de la compagnie connectée (pour l'affichage)
  const compagnie = compagnieId
    ? await prisma.compagnie.findUnique({
        where: { id: compagnieId },
        select: { id: true, nom: true, logo: true, statut: true, telephone: true },
      })
    : null

  // 1. KPIs principaux
  const [totalParcels, inTransitParcels, totalTrips, revenueResult] = await Promise.all([
    prisma.parcel.count({ where: parcelFilter }),
    prisma.parcel.count({ where: { ...parcelFilter, status: 'IN_TRANSIT' } }),
    prisma.trajet.count({ where: compagnieFilter }),
    prisma.parcel.aggregate({
      _sum: { price: true },
      where: { ...parcelFilter, paymentStatus: 'PAID' },
    }),
  ])

  // 2. Dernières expéditions
  const recentParcels = await prisma.parcel.findMany({
    where: parcelFilter,
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      compagnie: { select: { nom: true } },
    },
  })

  // 3. Volume 7 derniers jours
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    return d
  }).reverse()

  const chartData = await Promise.all(
    last7Days.map(async (date) => {
      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)
      const count = await prisma.parcel.count({
        where: {
          ...parcelFilter,
          createdAt: { gte: date, lt: nextDay },
        },
      })
      return {
        name: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        colis: count,
      }
    })
  )

  // 4. Revenus par trajet/route
  const parcelsByRoute = await prisma.parcel.groupBy({
    by: ['origin', 'destination'],
    _sum: { price: true },
    where: { ...parcelFilter, paymentStatus: 'PAID' },
  })

  const revenueByRoute = parcelsByRoute.map((route) => ({
    route: `${route.origin}–${route.destination.substring(0, 4)}.`,
    montant: route._sum.price || 0,
  }))

  // 5. Stats par agence (origin)
  const parcelsByAgency = await prisma.parcel.groupBy({
    by: ['origin'],
    _count: { id: true },
    where: parcelFilter,
  })
  const agencyStats = parcelsByAgency.map((a) => ({
    name: a.origin,
    value: a._count.id,
  }))

  // 6. Revenus 6 derniers mois
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }).reverse()

  const monthlyRevenue = await Promise.all(
    last6Months.map(async (date) => {
      const nextMonth = new Date(date)
      nextMonth.setMonth(date.getMonth() + 1)
      const rev = await prisma.parcel.aggregate({
        _sum: { price: true },
        where: {
          ...parcelFilter,
          paymentStatus: 'PAID',
          createdAt: { gte: date, lt: nextMonth },
        },
      })
      return {
        month: date.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: rev._sum.price || 0,
      }
    })
  )

  // 7. Stats par catégorie
  const parcelsByCategory = await prisma.parcel.groupBy({
    by: ['category'],
    _count: { id: true },
    where: parcelFilter,
  })
  const categoryStats = parcelsByCategory.map((cat: any) => ({
    name: cat.category,
    value: cat._count.id,
  }))

  return {
    compagnie,
    totalParcels,
    inTransitParcels,
    totalTrips,
    revenue: revenueResult._sum.price || 0,
    recentParcels,
    chartData,
    revenueByRoute: revenueByRoute.length > 0 ? revenueByRoute : [{ route: 'Aucun', montant: 0 }],
    agencyStats,
    monthlyRevenue,
    categoryStats,
  }
}

export default async function AdminDashboard() {
  const session = await getSessionContext()
  const stats = await getStats(session.role, session.compagnieId)

  const isSuperAdmin = session.role === 'super_admin'

  return (
    <div className="flex flex-col gap-8">

      {/* Bandeau d'identité compagnie / super-admin */}
      <div className={`rounded-2xl border p-4 flex items-center gap-4 shadow-sm ${
        isSuperAdmin
          ? 'bg-secondary-container/20 border-outline-variant'
          : 'bg-primary-container/30 border-outline-variant'
      }`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-md flex-shrink-0 ${
          isSuperAdmin ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
        }`}>
          {isSuperAdmin ? '👑' : (stats.compagnie?.nom?.charAt(0) ?? 'C')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.6875rem] font-black uppercase tracking-widest text-on-surface-variant opacity-60">
            {isSuperAdmin ? 'Vue Super-Admin — Plateforme TogoTransit' : 'Espace Compagnie'}
          </p>
          <h2 className="font-black text-lg text-on-surface truncate">
            {isSuperAdmin ? 'Toutes les compagnies' : (stats.compagnie?.nom ?? 'Votre Compagnie')}
          </h2>
          {!isSuperAdmin && stats.compagnie && (
            <p className="text-xs text-on-surface-variant opacity-70 mt-0.5">
              {stats.compagnie.telephone ?? ''} · Statut : <span className={`font-bold ${stats.compagnie.statut === 'actif' ? 'text-green-600' : 'text-error'}`}>{stats.compagnie.statut}</span>
            </p>
          )}
        </div>
        {isSuperAdmin && (
          <Link
            href="/admin/companies"
            className="text-xs font-black text-on-primary-container bg-primary-container hover:brightness-110 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[1rem]">domain</span>
            Gérer les compagnies
          </Link>
        )}
      </div>

      {/* KPI Grid (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Revenue KPI */}
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex flex-col gap-4 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs font-black">
                Chiffre d&apos;affaires {!isSuperAdmin ? '— ' + (stats.compagnie?.nom ?? '') : '(Toutes compagnies)'}
              </p>
              <h3 className="font-headline-lg text-headline-lg text-primary mt-2 font-black text-2xl">
                {stats.revenue.toLocaleString('fr-FR')} FCFA
              </h3>
            </div>
            <span className="bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[0.875rem]">trending_up</span> +12.5%
            </span>
          </div>
          <div className="mt-auto relative z-10">
            <p className="text-[0.625rem] text-on-surface-variant font-bold uppercase opacity-50">Performance temps réel</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
        </div>

        {/* Colis en transit */}
        <Link href="/admin/parcels" className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex flex-col justify-between hover:shadow-md transition-all group shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-primary text-3xl">package_2</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-black">Colis en transit</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-2xl text-primary font-black">{stats.inTransitParcels}</h3>
              <span className="text-error text-xs mb-1 font-bold">ACTIFS</span>
            </div>
            <p className="text-[0.625rem] text-on-surface-variant opacity-50 mt-1">sur {stats.totalParcels} total</p>
          </div>
        </Link>

        {/* Trajets programmés */}
        <Link href="/admin/bookings" className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 flex flex-col justify-between hover:shadow-md transition-all group shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-on-secondary-container">
            <span className="material-symbols-outlined text-3xl">directions_bus</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider font-black">Départs programmés</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-2xl text-primary font-black">{stats.totalTrips}</h3>
              <span className="text-primary text-xs mb-1 font-bold">TRAJETS</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <DashboardCharts
        data={stats.chartData}
        revenueData={stats.revenueByRoute}
        agencyData={stats.agencyStats}
        monthlyRevenue={stats.monthlyRevenue}
        categoryStats={stats.categoryStats}
      />

      {/* Tableau des dernières expéditions */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant flex flex-col overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="font-bold text-primary">Dernières Expéditions</h3>
            {!isSuperAdmin && stats.compagnie && (
              <span className="text-[0.625rem] bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-black uppercase">
                {stats.compagnie.nom}
              </span>
            )}
          </div>
          <Link href="/admin/parcels" className="text-xs font-black text-primary hover:underline uppercase tracking-wider">
            Voir tout l&apos;historique
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-4 text-xs text-on-surface-variant uppercase font-black">ID Tracking</th>
                <th className="p-4 text-xs text-on-surface-variant uppercase font-black">Expéditeur</th>
                <th className="p-4 text-xs text-on-surface-variant uppercase font-black">Trajet</th>
                {isSuperAdmin && (
                  <th className="p-4 text-xs text-on-surface-variant uppercase font-black">Compagnie</th>
                )}
                <th className="p-4 text-xs text-on-surface-variant uppercase font-black">Montant</th>
                <th className="p-4 text-xs text-on-surface-variant uppercase font-black">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {stats.recentParcels.map((parcel: any) => (
                <tr key={parcel.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 text-sm font-black text-primary uppercase">{parcel.trackingId}</td>
                  <td className="p-4 text-sm text-on-surface font-medium">{parcel.senderName}</td>
                  <td className="p-4 text-sm text-on-surface-variant">
                    <span className="font-bold text-on-surface">{parcel.origin}</span>
                    <span className="material-symbols-outlined text-[0.875rem] align-middle mx-1.5 opacity-30">arrow_forward</span>
                    <span className="font-bold text-on-surface">{parcel.destination}</span>
                  </td>
                  {isSuperAdmin && (
                    <td className="p-4 text-xs text-on-surface-variant font-bold">
                      {parcel.compagnie?.nom ?? '—'}
                    </td>
                  )}
                  <td className="p-4 text-sm font-black text-primary">{parcel.price.toLocaleString('fr-FR')} F</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[0.625rem] font-black uppercase border shadow-sm ${
                      parcel.status === 'DELIVERED'  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' :
                      parcel.status === 'IN_TRANSIT' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'  :
                                                       'bg-primary/10 text-primary border-primary/30'
                    }`}>
                      {parcel.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recentParcels.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-on-surface-variant opacity-50 text-sm">
                    Aucune expédition pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
