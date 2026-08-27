'use client'

import React from 'react'
import * as XLSX from 'xlsx'

export default function ExportButton({ data, filename, label }: { data: any[], filename: string, label: string }) {
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold py-2 px-4 rounded-lg transition-all border border-outline-variant shadow-sm text-sm"
    >
      <span className="material-symbols-outlined text-[1.125rem]">download</span>
      {label}
    </button>
  )
}
