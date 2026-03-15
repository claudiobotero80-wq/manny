'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Chrome, Mail, Loader2, X } from 'lucide-react'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  redirectTo?: string
}

export function LoginModal({ open, onClose, redirectTo = '/' }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<'google' | 'email' | null>(null)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  async function handleGoogle() {
    setLoading('google')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    if (error) {
      setMessage(error.message)
      setLoading(null)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading('email')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    setLoading(null)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('¡Revisá tu email! Te enviamos un link para entrar.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="text-2xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-white mb-1">Tu pieza está lista</h2>
          <p className="text-zinc-400 text-sm">
            Para descargarla, creá tu cuenta
            <br />
            <span className="text-zinc-500">(también guardamos tu marca)</span>
          </p>
        </div>

        <Button
          onClick={handleGoogle}
          disabled={loading !== null}
          className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-semibold mb-3 flex items-center gap-2"
        >
          {loading === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Chrome className="w-4 h-4" />
          )}
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-500">o con email</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <form onSubmit={handleEmail} className="space-y-2">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            required
          />
          <Button
            type="submit"
            variant="outline"
            disabled={loading !== null}
            className="w-full border-zinc-700 text-white hover:bg-zinc-800 flex items-center gap-2"
          >
            {loading === 'email' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Continuar con Email
          </Button>
        </form>

        {message && (
          <p className="text-sm text-center mt-3 text-[#CCFF90]">{message}</p>
        )}

        <p className="text-center text-xs text-zinc-500 mt-4">
          Ya tengo cuenta →{' '}
          <a
            href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-[#CCFF90] hover:underline"
          >
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
