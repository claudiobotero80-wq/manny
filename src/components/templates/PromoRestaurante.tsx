import { ColorScheme } from '@/types'

interface PromoRestauranteProps {
  titulo?: string
  descripcion?: string
  imagen?: string
  cta?: string
  colorScheme: ColorScheme
  width?: number
  height?: number
}

// This component is designed to work with Satori (inline styles only)
export function PromoRestauranteTemplate({
  titulo = 'Tu plato especial',
  descripcion = '',
  imagen,
  cta = 'Reservá ya',
  colorScheme,
  width = 1080,
  height = 1080,
}: PromoRestauranteProps) {
  const scale = width / 1080

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: colorScheme.background,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background image layer */}
      {imagen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
          }}
        >
          <img
            src={imagen}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.4,
            }}
            alt=""
          />
        </div>
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '65%',
          background: `linear-gradient(to top, ${colorScheme.background}FF 0%, ${colorScheme.background}CC 50%, ${colorScheme.background}00 100%)`,
          display: 'flex',
        }}
      />

      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Math.round(6 * scale),
          backgroundColor: colorScheme.secondary,
          display: 'flex',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: Math.round(72 * scale),
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(24 * scale),
        }}
      >
        {/* Category label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: Math.round(12 * scale),
          }}
        >
          <div
            style={{
              width: Math.round(40 * scale),
              height: Math.round(3 * scale),
              backgroundColor: colorScheme.secondary,
              display: 'flex',
            }}
          />
          <span
            style={{
              color: colorScheme.secondary,
              fontSize: Math.round(20 * scale),
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            ESPECIAL
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            color: colorScheme.text,
            fontSize: Math.round(86 * scale),
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            maxWidth: Math.round(900 * scale),
          }}
        >
          {titulo}
        </div>

        {/* Description */}
        {descripcion && (
          <div
            style={{
              color: colorScheme.text,
              fontSize: Math.round(28 * scale),
              fontWeight: 400,
              lineHeight: 1.5,
              opacity: 0.75,
              maxWidth: Math.round(700 * scale),
            }}
          >
            {descripcion}
          </div>
        )}

        {/* CTA */}
        {cta && (
          <div
            style={{
              display: 'flex',
              marginTop: Math.round(8 * scale),
            }}
          >
            <div
              style={{
                backgroundColor: colorScheme.secondary,
                color: colorScheme.primary,
                padding: `${Math.round(18 * scale)}px ${Math.round(40 * scale)}px`,
                fontSize: Math.round(24 * scale),
                fontWeight: 700,
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {cta}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
