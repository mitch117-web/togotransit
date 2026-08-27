'use client'

import React from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Parcel {
  id: string
  trackingId: string
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  weight: number
  category: string
  deliveryType: string
  origin: string
  destination: string
  price: number
  paymentStatus: string
  paymentMethod: string | null
  createdAt: string | Date
}

export default function GenerateInvoiceButton({ parcel }: { parcel: Parcel }) {
  const generatePDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 44, 52)
    doc.text('TOGO TRANSIT S.A.', 20, 20)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('Logistique & Transport International', 20, 27)
    doc.text('Lomé, Togo - Quartier Adéwui', 20, 32)
    doc.text('Tél: +228 90 00 00 00 | Email: contact@togotransit.tg', 20, 37)

    // Invoice Info
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text('FACTURE DE TRANSPORT', pageWidth - 80, 20)
    
    doc.setFontSize(10)
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 80, 30)
    doc.text(`N° Facture: INV-${parcel.trackingId}`, pageWidth - 80, 35)
    doc.text(`Tracking ID: ${parcel.trackingId}`, pageWidth - 80, 40)

    // Horizontal Line
    doc.setDrawColor(200)
    doc.line(20, 45, pageWidth - 20, 45)

    // Sender & Receiver
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('EXPÉDITEUR', 20, 55)
    doc.text('DESTINATAIRE', pageWidth / 2 + 10, 55)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(parcel.senderName, 20, 62)
    doc.text(`Tél: ${parcel.senderPhone}`, 20, 67)
    doc.text(`Origine: ${parcel.origin}`, 20, 72)

    doc.text(parcel.receiverName, pageWidth / 2 + 10, 62)
    doc.text(`Tél: ${parcel.receiverPhone}`, pageWidth / 2 + 10, 67)
    doc.text(`Destination: ${parcel.destination}`, pageWidth / 2 + 10, 72)

    // Table of Items
    const tableData = [
      [
        'Expédition de Colis',
        parcel.category,
        `${parcel.weight} kg`,
        parcel.deliveryType,
        `${parcel.price.toLocaleString('fr-FR')} F`
      ]
    ]

    // @ts-ignore
    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Catégorie', 'Poids', 'Type', 'Montant']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 86, 179] },
      margin: { left: 20, right: 20 }
    })

    // Total
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL À PAYER: ${parcel.price.toLocaleString('fr-FR')} FCFA`, pageWidth - 85, finalY)

    // Payment Info
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Statut du paiement: ${parcel.paymentStatus === 'PAID' ? 'RÉGLÉ' : 'À PAYER'}`, 20, finalY + 10)
    if (parcel.paymentMethod) {
      doc.text(`Méthode de paiement: ${parcel.paymentMethod}`, 20, finalY + 15)
    }

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150)
    const footerText = 'Merci de votre confiance. TogoTransit - Rapide, Sûr, Fiable.'
    doc.text(footerText, (pageWidth - doc.getTextWidth(footerText)) / 2, pageWidth > 250 ? 280 : 285)

    // Save
    doc.save(`Facture_TogoTransit_${parcel.trackingId}.pdf`)
  }

  return (
    <button 
      onClick={generatePDF}
      className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[1.25rem]">description</span>
      Télécharger Facture
    </button>
  )
}
