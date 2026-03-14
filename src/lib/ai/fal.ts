import { fal } from '@fal-ai/client'

export { fal }

export function configureFal() {
  fal.config({ credentials: process.env.FAL_KEY })
  return fal
}
