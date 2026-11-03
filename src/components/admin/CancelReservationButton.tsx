'use client'

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface CancelReservationButtonProps {
  reservationId: number
  nom: string // le client, pour que l'agent sache ce qu'il annule
  trajet?: string // « Lomé → Dapaong »
  siege?: string | number | null
}

/**
 * Annulation d'une réservation par l'agent de la compagnie : une confirmation rappelle les conséquences, puis l'API
 * d'annulation invalide les billets, libère les places et prévient le client. Aucun remboursement n'est automatique.
 */
export default function CancelReservationButton({ reservationId, nom, trajet, siege }: CancelReservationButtonProps) {
  const router = useRouter()
  const [ouvert, setOuvert] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const annuler = async () => {
    if (enCours) return
    setEnCours(true)
    setErreur(null)
    try {
      const response = await fetch(`/api/reservations/${reservationId}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (response.ok) {
        setOuvert(false)
        router.refresh()
      } else {
        const corps = await response.json().catch(() => null)
        setErreur(corps?.error || "L'annulation a échoué. Réessayez.")
      }
    } catch {
      setErreur('Erreur de connexion. Réessayez.')
    } finally {
      setEnCours(false)
    }
  }

  const fenetre = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`annulation-${reservationId}`}
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center gap-3">
          <span className="material-symbols-outlined text-error text-[1.75rem]">warning</span>
          <h4 id={`annulation-${reservationId}`} className="text-lg text-primary font-bold">
            Annuler la réservation #{reservationId} ?
          </h4>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-on-surface">
            <span className="font-bold">{nom}</span>
            {trajet ? ` · ${trajet}` : ''}
            {siege ? ` · siège #${siege}` : ''}
          </p>
          <ul className="text-sm text-on-surface-variant list-disc pl-5 flex flex-col gap-1">
            <li>Le billet est invalidé : un scan sera refusé.</li>
            <li>Le siège et les places sont libérés.</li>
            <li>Le client est prévenu par une notification.</li>
            <li>Aucun remboursement automatique : à régler avec le client.</li>
          </ul>
          {erreur && (
            <p role="alert" className="text-sm font-bold text-error">
              {erreur}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setOuvert(false)
                // La page affichait un état périmé (réservation déjà annulée, par exemple) : on la remet à jour.
                if (erreur) router.refresh()
              }}
              disabled={enCours}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-sm text-on-surface hover:bg-surface-container disabled:opacity-60"
            >
              {erreur ? 'Fermer' : 'Garder la réservation'}
            </button>
            <button
              type="button"
              onClick={annuler}
              disabled={enCours}
              className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {enCours && <span className="animate-spin material-symbols-outlined text-[1.125rem]">sync</span>}
              {enCours ? 'Annulation…' : 'Annuler la réservation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErreur(null)
          setOuvert(true)
        }}
        className="text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 group"
        title="Annuler la réservation"
        aria-label={`Annuler la réservation de ${nom}`}
      >
        <span className="material-symbols-outlined text-[1.125rem]">cancel</span>
        <span className="text-[0.625rem] font-bold uppercase hidden group-hover:inline">Annuler</span>
      </button>
      {ouvert && createPortal(fenetre, document.body)}
    </>
  )
}
