'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/lib/theme/ThemeContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { colors, theme, toggleTheme } = useTheme()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await response.json()
      if (data.message) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-[1000]">
      {isOpen && (
        <div 
          className="w-[420px] h-[650px] mb-6 flex flex-col overflow-hidden rounded-3xl shadow-2xl backdrop-blur-sm border transition-all duration-300"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
            boxShadow: theme === 'dark' 
              ? '0 25px 50px -12px rgba(0,0,0,0.5)' 
              : '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
          {/* Header */}
          <div 
            className="p-5 flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
            }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: colors.onPrimary + '20' }}>
                  <span className="text-2xl">🚚</span>
                </div>
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: '#22c55e', borderColor: colors.primary }}>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: colors.onPrimary }}>
                  TogoTransit AI
                </h3>
                <p className="text-xs opacity-80" style={{ color: colors.onPrimary }}>
                  Toujours prêt à vous aider
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: colors.onPrimary + '15' }}>
                <span className="text-xl">{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{ backgroundColor: colors.onPrimary + '15' }}>
                <span className="text-xl" style={{ color: colors.onPrimary }}>✕</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            className="flex-1 p-5 overflow-y-auto"
            style={{ backgroundColor: colors.surfaceContainerLow }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primaryContainer} 0%, ${colors.secondaryContainer} 100%)`,
                  }}>
                  <span className="text-5xl">👋</span>
                </div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: colors.onSurface }}>
                  Bienvenue !
                </h2>
                <p 
                  className="text-center max-w-[250px] leading-relaxed"
                  style={{ color: colors.onSurfaceVariant }}>
                  Je suis votre assistant TogoTransit. Posez-moi toutes vos questions sur vos colis et livraisons !
                </p>
                <div className="flex flex-wrap gap-2 mt-6">
                  <QuickSuggestion text="Suivre un colis" onClick={() => setInput("Je veux suivre mon colis")} />
                  <QuickSuggestion text="Tarifs livraison" onClick={() => setInput("Quels sont vos tarifs de livraison ?")} />
                  <QuickSuggestion text="Heures d'ouverture" onClick={() => setInput("Quelles sont vos heures d'ouverture ?")} />
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`mb-5 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] px-5 py-3.5 ${
                      msg.role === 'user' 
                        ? 'rounded-2xl rounded-tr-sm' 
                        : 'rounded-2xl rounded-tl-sm'
                    }`}
                    style={{
                      backgroundColor: msg.role === 'user' 
                        ? colors.primary 
                        : colors.surface,
                      color: msg.role === 'user' 
                        ? colors.onPrimary 
                        : colors.onSurface,
                      border: msg.role === 'user' ? 'none' : `1px solid ${colors.outlineVariant}`,
                      boxShadow: msg.role === 'user' 
                        ? `0 4px 12px ${colors.primary}40` 
                        : `0 2px 8px ${colors.onSurface}10`
                    }}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p 
                      className="text-[10px] mt-1.5 opacity-60"
                      style={{ color: msg.role === 'user' ? colors.onPrimary : colors.onSurfaceVariant }}>
                      {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start mb-5">
                <div 
                  className="px-5 py-3.5 rounded-2xl rounded-tl-sm"
                  style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.outlineVariant}`,
                    boxShadow: `0 2px 8px ${colors.onSurface}10`
                  }}>
                  <div className="flex gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-bounce"
                      style={{ 
                        backgroundColor: colors.primary,
                        animationDelay: '0ms'
                      }}></div>
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-bounce"
                      style={{ 
                        backgroundColor: colors.primary,
                        animationDelay: '150ms'
                      }}></div>
                    <div 
                      className="w-2.5 h-2.5 rounded-full animate-bounce"
                      style={{ 
                        backgroundColor: colors.primary,
                        animationDelay: '300ms'
                      }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form 
            onSubmit={sendMessage} 
            className="p-4 border-t"
            style={{ 
              backgroundColor: colors.surface,
              borderColor: colors.outlineVariant
            }}>
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="w-full px-5 py-4 rounded-2xl border-2 focus:outline-none transition-all"
                  style={{
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.outlineVariant,
                    color: colors.onSurface,
                    
                  }}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-105 disabled:scale-100 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: colors.onPrimary,
                  boxShadow: `0 4px 15px ${colors.primary}40`
                }}>
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colors.onPrimary }}></div>
                ) : (
                  <span className="text-xl">➤</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-2xl shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          color: colors.onPrimary,
          boxShadow: `0 8px 25px ${colors.primary}50`
        }}>
        <span className="text-3xl">{isOpen ? '✕' : '💬'}</span>
      </button>
    </div>
  )
}

function QuickSuggestion({ text, onClick }: { text: string, onClick: () => void }) {
  const { colors } = useTheme()
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
      style={{
        backgroundColor: colors.surfaceContainer,
        color: colors.onSurfaceVariant,
        border: `1px solid ${colors.outlineVariant}`
      }}>
      {text}
    </button>
  )
}
