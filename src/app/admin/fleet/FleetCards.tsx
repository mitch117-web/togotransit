'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import DeleteVehicleButton from '@/components/admin/DeleteVehicleButton'

type Vehicle = {
  id: number | string
  plateNumber: string
  type: string
  capacity: number
  status: 'AVAILABLE' | 'IN_SERVICE' | 'MAINTENANCE' | string
}

type Stats = {
  total: number
  inService: number
  available: number
  maintenance: number
}

const SOFT_SHADOW = 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]'
const SOFT_SHADOW_HOVER = 'hover:shadow-[0_20px_35px_-15px_rgba(15,23,42,0.18)]'

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function KpiGrid({ stats }: { stats: Stats }) {
  const kpis = [
    {
      label: 'Total Véhicules',
      value: stats.total,
      icon: 'apps',
      iconBg: 'bg-primary-container',
      iconColor: 'text-on-primary-container',
      cardBg: 'bg-surface-container-lowest',
      border: 'border-outline-variant',
      numberColor: 'text-primary',
      labelColor: 'text-on-surface-variant',
    },
    {
      label: 'En Service',
      value: stats.inService,
      icon: 'route',
      iconBg: 'bg-surface-variant',
      iconColor: 'text-primary',
      cardBg: 'bg-surface-container-lowest',
      border: 'border-outline-variant',
      numberColor: 'text-primary',
      labelColor: 'text-on-surface-variant',
    },
    {
      label: 'Disponibles',
      value: stats.available,
      icon: 'check_circle',
      iconBg: 'bg-surface-container-highest',
      iconColor: 'text-on-surface',
      cardBg: 'bg-surface-container-lowest',
      border: 'border-outline-variant',
      numberColor: 'text-primary',
      labelColor: 'text-on-surface-variant',
    },
    {
      label: 'En Maintenance',
      value: stats.maintenance,
      icon: 'build',
      iconBg: 'bg-error-container',
      iconColor: 'text-error',
      cardBg: 'bg-error-container/20',
      border: 'border-outline-variant',
      numberColor: 'text-error',
      labelColor: 'text-error',
    },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch"
    >
      {kpis.map((k) => (
        <motion.div
          key={k.label}
          variants={cardVariants}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={`h-full ${k.cardBg} p-4 rounded-2xl border ${k.border} flex flex-col justify-between ${SOFT_SHADOW} ${SOFT_SHADOW_HOVER} transition-shadow`}
        >
          <div className={`w-10 h-10 rounded-full ${k.iconBg} flex items-center justify-center ${k.iconColor} mb-4 shrink-0`}>
            <span className="material-symbols-outlined">{k.icon}</span>
          </div>
          <div className="mt-auto">
            <p className={`font-label-sm text-label-sm ${k.labelColor} uppercase tracking-wide`}>{k.label}</p>
            <p className={`font-headline-lg text-headline-lg ${k.numberColor} mt-1`}>{k.value}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

export function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-6 items-stretch"
    >
      {vehicles.map((vehicle) => (
        <motion.div
          key={vehicle.id}
          variants={cardVariants}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={`h-full bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden flex flex-col ${SOFT_SHADOW} ${SOFT_SHADOW_HOVER} transition-shadow`}
        >
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                vehicle.status === 'AVAILABLE' ? 'bg-green-500' :
                vehicle.status === 'IN_SERVICE' ? 'bg-blue-500' :
                'bg-error'
              }`}></div>
              <Link href={`/admin/fleet/${vehicle.id}`} className="font-bold text-primary hover:underline whitespace-nowrap">{vehicle.plateNumber}</Link>
            </div>
            <span
              title={vehicle.type}
              className="text-[0.625rem] font-black uppercase text-on-surface-variant bg-surface-container px-2 py-1 rounded truncate max-w-[55%]"
            >
              {vehicle.type}
            </span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1">
            <div className="flex justify-between items-center gap-2">
              <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[1.125rem]">group</span>
                Capacité: {vehicle.capacity} places
              </span>
              <span className="text-on-surface-variant font-body-sm text-body-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[1.125rem]">history</span>
                Dernier trajet: Hier
              </span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-3">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Statut actuel</p>
              <p className="font-body-md text-body-md text-primary font-medium">
                {vehicle.status === 'AVAILABLE' ? 'Prêt pour départ' :
                 vehicle.status === 'IN_SERVICE' ? 'En cours de trajet' :
                 "À l'atelier de maintenance"}
              </p>
            </div>

            <div className="flex gap-2 mt-auto pt-3 border-t border-outline-variant/30">
              <Link
                href={`/admin/fleet/${vehicle.id}`}
                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md py-2 rounded-xl transition-all active:scale-95 text-center"
              >
                Détails
              </Link>
              <Link
                href={`/admin/fleet/${vehicle.id}/edit`}
                className="px-3 bg-surface-container-highest hover:bg-primary/20 text-primary border border-outline-variant rounded-xl transition-all active:scale-95 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">edit</span>
              </Link>
              <DeleteVehicleButton vehicleId={String(vehicle.id)} />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
