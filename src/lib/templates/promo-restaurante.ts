import { Template } from '@/types'

const promoRestaurante: Template = {
  id: 'promo-restaurante',
  name: 'Promo Restaurante',
  description: 'Post para promoción de platos o eventos gastronómicos',
  category: 'gastronomia',
  previewImage: '/templates/promo-restaurante-preview.jpg',
  dimensions: { width: 1080, height: 1080 },
  fields: [
    {
      id: 'titulo',
      type: 'text',
      label: '¿Qué querés promocionar?',
      placeholder: 'Ej: Menú del día, Milanesa especial...',
      required: true,
      config: { maxLength: 50, multiline: false },
      aiPrompt: 'Generá un título atractivo para promoción gastronómica',
    },
    {
      id: 'descripcion',
      type: 'text',
      label: 'Descripción breve',
      placeholder: 'Ingredientes, precio, detalle...',
      required: false,
      config: { maxLength: 120, multiline: true },
      aiPrompt: 'Generá una descripción corta y apetitosa',
    },
    {
      id: 'imagen',
      type: 'image',
      label: 'Imagen del plato',
      required: false,
      config: {
        aspectRatio: '1:1',
        allowUpload: true,
        allowGenerate: true,
        generatePromptBase:
          'foto profesional de plato de comida argentina, iluminación natural, fondo oscuro elegante',
      },
    },
    {
      id: 'cta',
      type: 'text',
      label: 'Call to action',
      placeholder: 'Ej: Reservá ya, Pedí por WhatsApp...',
      required: false,
      config: { maxLength: 30, multiline: false },
      aiPrompt: 'Generá un CTA corto para restaurante argentino',
    },
  ],
  colorSchemes: [
    {
      id: 'dark',
      name: 'Oscuro',
      primary: '#1a1a1a',
      secondary: '#CCFF90',
      background: '#0A0A0A',
      text: '#FFFFFF',
    },
    {
      id: 'warm',
      name: 'Cálido',
      primary: '#8B2500',
      secondary: '#FFB547',
      background: '#FFF8F0',
      text: '#1a1a1a',
    },
    {
      id: 'fresh',
      name: 'Fresco',
      primary: '#1B4332',
      secondary: '#95D5B2',
      background: '#F8FFF9',
      text: '#1a1a1a',
    },
  ],
  component: 'PromoRestaurante',
}

export default promoRestaurante
