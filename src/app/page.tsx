import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Zap, Download } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#CCFF90] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-zinc-900" />
          </div>
          <span className="font-bold text-lg tracking-tight">Manny</span>
        </div>
        <Link href="/catalog">
          <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
            Ver templates
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-sm text-zinc-400 mb-8">
          <Zap className="w-3.5 h-3.5 text-[#CCFF90]" />
          Piezas gráficas listas en minutos
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-none mb-6">
          Diseño para tu
          <br />
          <span className="text-[#CCFF90]">negocio.</span>{' '}
          <span className="text-zinc-500">Sin ser diseñador.</span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10">
          Respondé algunas preguntas, dejá que la IA haga el trabajo, y descargá tu pieza lista para publicar.
        </p>

        <Link href="/catalog">
          <Button size="lg" className="bg-[#CCFF90] text-zinc-900 hover:bg-[#b8f070] font-bold text-lg px-8 py-6">
            Crear mi pieza →
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Sparkles className="w-5 h-5 text-[#CCFF90]" />,
              title: 'Copy con IA',
              desc: 'Generá títulos y descripciones optimizados para tu rubro',
            },
            {
              icon: <Zap className="w-5 h-5 text-[#CCFF90]" />,
              title: 'Imágenes AI',
              desc: 'Fotos profesionales generadas en segundos si no tenés las tuyas',
            },
            {
              icon: <Download className="w-5 h-5 text-[#CCFF90]" />,
              title: 'PNG listo',
              desc: 'Descargá en alta resolución, listo para Instagram y WhatsApp',
            },
          ].map((f) => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
