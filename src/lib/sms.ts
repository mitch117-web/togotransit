import prisma from './prisma'

/**
 * Simulate sending an SMS notification
 * In a real application, this would call an API like Twilio, Vonage, or a local provider
 */
export async function sendSMS(to: string, message: string) {
  // Vérifier si les SMS sont activés dans les paramètres système
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' }
    })
    
    if (settings && !settings.smsEnabled) {
      console.log(`[SMS DISABLED] Notification blocked for: +228 ${to}`)
      return { success: false, error: 'SMS notifications are disabled in settings' }
    }
  } catch (error) {
    console.error('Failed to check SMS settings:', error)
  }

  console.log(`[SMS SIMULATION] To: +228 ${to} | Message: ${message}`)
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // In a real app, you'd handle the response from the SMS provider
  return {
    success: true,
    messageId: `sim_${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString()
  }
}
