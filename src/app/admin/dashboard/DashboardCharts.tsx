'use client'

import React from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts'

// Palette de graphiques adaptée à l'identité marine + or (dashboard en thème
// sombre) : or (marque), émeraude, ciel, ambre, rose — des teintes qui restent
// lisibles et distinctes sur fond marine quasi-noir.
const COLORS = ['#fd761a', '#34d399', '#38bdf8', '#fbbf24', '#f472b6']
const GRID_STROKE = 'rgba(245,247,255,0.08)'
const AXIS_TICK = { fontSize: 10, fill: '#a3acc2' }
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  backgroundColor: '#131b2c',
  color: '#f5f7ff',
}
const TOOLTIP_ITEM_STYLE = { color: '#f5f7ff' }
const TOOLTIP_LABEL_STYLE = { color: '#a3acc2' }

export default function DashboardCharts({ 
  data, 
  revenueData, 
  agencyData,
  monthlyRevenue,
  categoryStats
}: { 
  data: any[], 
  revenueData: any[], 
  agencyData: any[],
  monthlyRevenue: any[],
  categoryStats: any[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume de Colis */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-primary">Volume de Colis</h3>
            <span className="text-[0.625rem] font-bold uppercase text-on-surface-variant bg-surface-container px-2 py-1 rounded">7 derniers jours</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="colis" fill="#fd761a" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenus Mensuels */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-sm text-headline-sm text-primary">Revenus Mensuels</h3>
            <span className="text-[0.625rem] font-bold uppercase text-on-surface-variant bg-surface-container px-2 py-1 rounded">6 derniers mois</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_STROKE} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={AXIS_TICK}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#34d399"
                  fillOpacity={1}
                  fill="url(#colorMonthly)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution par Agence */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-sm text-headline-sm text-primary">Volume par Agence</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={agencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {agencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Catégories de Colis */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col gap-4">
          <h3 className="font-headline-sm text-headline-sm text-primary">Types de Colis</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-cat-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
