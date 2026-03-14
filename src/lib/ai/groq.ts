import Groq from 'groq-sdk'

export function createGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY })
}
