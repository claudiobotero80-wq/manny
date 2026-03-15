'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Chrome, Mail, Loader2 } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<'google' | 'email' | null>(null)
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = searchParams.get('redirectTo') ?? '/'

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 bg-[#CCFF90] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-zinc-900" />
          </div>
          <span className="font-bold text-lg tracking-tight">Manny</span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">Bienvenido</h1>
        <p className="text-zinc-400 text-center text-sm mb-8">
          Entrá para guardar y descargar tus piezas
        </p>

        {/* Google */}
        <Button
          onClick={handleGoogle}
          disabled={loading !== null}
          className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-semibold mb-4 flex items-center gap-2"
        >
          {loading === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Chrome className="w-4 h-4" />
          )}
          Continuar con Google
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-500">o con email</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Email magic link */}
        <form onSubmit={handleEmail} className="space-y-3">
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
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
          <p className="text-sm text-center mt-4 text-[#CCFF90]">{message}</p>
        )}

        <p className="text-center text-sm text-zinc-500 mt-6">
          ¿No tenés cuenta?{' '}
          <Link href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-[#CCFF90] hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
