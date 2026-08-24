import React from 'react'

export default function GlobalLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-surface-container-low">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl animate-bounce">local_shipping</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-2xl font-black text-primary tracking-tighter">TOGOTRANSIT</h2>
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}
