'use client'

import React from 'react'
import jsPDF from 'jspdf'
import { QRCodeCanvas } from 'qrcode.react'

interface PrintTicketButtonProps {
  booking: any
}

export default function PrintTicketButton({ booking }: PrintTicketButtonProps) {
  const generateTicket = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150] // Format ticket de caisse / reçu
    })

    const qrCanvas = document.getElementById(`qr-${booking.id}`) as HTMLCanvasElement
    const qrDataUrl = qrCanvas?.toDataURL('image/png')

    // Style
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('TOGOTRANSIT', 40, 15, { align: 'center' })
    
    doc.setFontSize(10)
    doc.text('TICKET DE TRANSPORT', 40, 22, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(10, 26, 70, 26)

    // Infos Passager
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Passager:', 10, 35)
    doc.setFont('helvetica', 'bold')
    doc.text(booking.user.name, 10, 40)

    doc.setFont('helvetica', 'normal')
    doc.text('Téléphone:', 10, 48)
    doc.setFont('helvetica', 'bold')
    doc.text(booking.user.phone, 10, 53)

    // Infos Voyage
    doc.line(10, 58, 70, 58)
    
    doc.setFont('helvetica', 'normal')
    doc.text('Trajet:', 10, 65)
    doc.setFont('helvetica', 'bold')
    doc.text(`${booking.trip.origin} > ${booking.trip.destination}`, 10, 70)

    doc.setFont('helvetica', 'normal')
    doc.text('Départ:', 10, 78)
    doc.setFont('helvetica', 'bold')
    doc.text(new Date(booking.trip.departureTime).toLocaleString('fr-FR'), 10, 83)

    doc.setFont('helvetica', 'normal')
    doc.text('Siège:', 10, 91)
    doc.setFontSize(16)
    doc.text(`#${booking.seatNumber}`, 10, 98)

    // Prix
    doc.setFontSize(10)
    doc.text('PRIX:', 45, 91)
    doc.setFontSize(14)
    doc.text(`${booking.price.toLocaleString('fr-FR')} F`, 45, 98)

    // QR Code
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 25, 105, 30, 30)
    }

    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text('Merci de voyager avec TogoTransit', 40, 142, { align: 'center' })
    doc.text(`ID: ${booking.id.substring(0, 8)}`, 40, 146, { align: 'center' })

    doc.save(`Ticket_${booking.id.substring(0, 8)}.pdf`)
  }

  return (
    <>
      {/* Hidden QR Code for capture */}
      <div style={{ display: 'none' }}>
        <QRCodeCanvas 
          id={`qr-${booking.id}`}
          value={`TOGOTRANSIT-BOOKING-${booking.id}`}
          size={128}
          level="H"
        />
      </div>
      
      <button 
        onClick={generateTicket}
        className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex items-center gap-1 group"
        title="Imprimer le ticket"
      >
        <span className="material-symbols-outlined text-[1.125rem]">print</span>
        <span className="text-[0.625rem] font-bold uppercase hidden group-hover:inline">Ticket</span>
      </button>
    </>
  )
}
