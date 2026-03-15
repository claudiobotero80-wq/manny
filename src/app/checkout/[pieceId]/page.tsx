import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckoutClient } from './CheckoutClient'

interface PageProps {
  params: Promise<{ pieceId: string }>
}

export default async function CheckoutPage({ params }: PageProps) {
  const { pieceId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirectTo=/checkout/${pieceId}`)
  }

  const { data: piece, error } = await supabase
    .from('manny_pieces')
    .select('*')
    .eq('id', pieceId)
    .eq('user_id', user.id)
    .single()

  if (error || !piece) {
    redirect('/catalog')
  }

  if (piece.status === 'paid') {
    redirect(`/checkout/success?pieceId=${pieceId}`)
  }

  return <CheckoutClient piece={piece} />
}
