# Manny — Dev Log

Registro cronológico de bugs, fixes, decisiones técnicas y deploys.
**Arqui:** leer este archivo al inicio de cada sesión. Actualizar al cerrar.

---

## 2026-03-14

### Fase 0 — Build inicial
**Arqui** — Sesión `13e8f561`

- Build completo desde cero: Next.js 14, Satori+Resvg, Groq, BFL Flux 2 Klein
- Deploy live: https://manny-v2.vercel.app
- Template base: `promo-restaurante` (JSX/Satori) — funcional

---

### Bug fixes críticos post-deploy
**Arqui** — Sesión `737f313d`

**BUG-001** — `/api/generate-copy`: modelo Groq decommissioned
- Error: `llama-3.1-70b-versatile` no existe en Groq
- Fix: migrar a `llama-3.3-70b-versatile`
- Archivo: `src/app/api/generate-copy/route.ts`

**BUG-002** — `/api/generate-image`: FAL_KEY placeholder + polling URL incorrecto
- Error: `FAL_KEY="placeholder_replace_with_real_key"` + `api.bfl.ai` daba error regional
- Fix: reemplazar FAL por BFL API directo; usar `polling_url` de la respuesta (regional: `api.eu2.bfl.ai`)
- Archivo: `src/app/api/generate-image/route.ts`
- **⚠️ Nota importante:** La `polling_url` que devuelve BFL es regional. Usarla SIEMPRE directamente, nunca hardcodear `api.bfl.ai`.

**BUG-003** — `/api/upload`: Supabase service key stale + bucket `logos` inexistente
- Error: key expirada + bucket no existía
- Fix: actualizar key + crear bucket `logos` como público en Supabase
- Archivo: `src/app/api/upload/route.ts`

---

### Sistema de templates SVG
**Arqui** — Sesión `78028054`

**Nuevos archivos:**
- `src/lib/svg/parser.ts` — detecta campos `manny-text-*`, `manny-multiline-*`, `manny-img-*`, `manny-logo-*`
- `src/lib/svg/renderer.ts` — reemplaza tokens de color + valores de campos en SVG
- `src/app/api/template-fields/route.ts` — introspección: GET ?svgUrl=... → devuelve campos
- `src/app/api/render-svg/route.ts` — SVG → PNG vía `@resvg/resvg-wasm`
- `src/app/admin/templates/page.tsx` — admin: upload SVG, auto-detecta campos, preview, guarda en Supabase

**Convención de capas Figma → SVG:**
- `manny-text-[nombre]` → texto corto (input)
- `manny-multiline-[nombre]` → texto largo (textarea)
- `manny-img-[nombre]` → imagen con AI
- `manny-logo-[nombre]` → solo upload, sin AI

**Tokens de color en Figma:**
- `#FF0099` → primary
- `#00FF99` → secondary
- `#FFFF00` → background
- `#FF6600` → text

**Supabase:**
- Tabla: `manny_templates` (RLS: public read, service insert)
- Bucket: `templates` (público)

---

### Sistema de generación de texto (rewrite completo)
**Arqui** — Sesión `bc3d32da`

**BUG-004** — ColorPicker: botón "Elegir colores" no avanzaba
- Error: `nextStep()` usaba `Math.min(currentStep + 1, fields.length - 1)` — el paso de colores está en `fields.length`
- Fix: cambiar cap a `fields.length`
- Archivo: `src/stores/wizardStore.ts`

**Feature:** Rewrite completo de generación de texto
- Flujo: campo vacío → "Generar con AI" → mini-input inline → genera con contexto
- Prompts de vertical: `src/lib/ai/prompts/gastronomia.ts`
- Contexto stack: userInput + brandProfile (si existe) + wizardContext + systemPrompt
- Botón siempre visible en todos los campos de texto
- Archivo: `src/components/wizard/TextInput.tsx`

---

## 2026-03-15

### Fase A — Auth + Mercado Pago + Descarga gate
**Arqui** — Sesión `3ee3f95b`

**Nuevos archivos:**
- `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` — Supabase SSR con `@supabase/ssr`
- `middleware.ts` — protege `/checkout`, `/dashboard`, `/history`, `/profile`
- `src/app/login/page.tsx`, `src/app/register/page.tsx` — Google OAuth + Magic Link
- `src/app/auth/callback/route.ts` — OAuth code exchange
- `src/app/api/pieces/save/route.ts` — guarda wizard state en `manny_pieces`
- `src/app/api/checkout/create/route.ts` — crea preferencia Mercado Pago
- `src/app/api/webhooks/mercadopago/route.ts` — pago aprobado → genera PNG → sube a Storage
- `src/app/api/download/[pieceId]/route.ts` — descarga gateada (auth + status=paid)
- `src/app/checkout/[pieceId]/page.tsx` — página de checkout split-view
- `src/app/checkout/success/page.tsx`, `failure/page.tsx`, `pending/page.tsx`
- `src/lib/pricing.ts` — precio hardcodeado: 1500 ARS (editar aquí para cambiar)

**Supabase:**
- Tabla: `manny_pieces` (user_id, template_id, fields_json, colors_json, status, image_url, mp_preference_id, mp_payment_id)
- Bucket: `pieces` (público)

**Pendiente activar (Juan):**
1. Google OAuth → Supabase Dashboard → Auth → Providers → Google → Client ID + Secret + redirect `https://manny-v2.vercel.app/auth/callback`
2. `MERCADOPAGO_ACCESS_TOKEN` → Vercel Dashboard → Settings → Env Vars

---

### Bug fix — Admin template save (403 RLS)
**Claudio** — Fix directo

**BUG-005** — `/admin/templates`: "guardar template" daba 403 Unauthorized
- Causa: página es `'use client'` → `SUPABASE_SERVICE_ROLE_KEY` sin `NEXT_PUBLIC_` = `undefined` en browser → insert usaba anon key → RLS bloqueaba
- Fix: crear `/api/admin/save-template/route.ts` (server-side) que recibe los datos y usa service role key
- Admin page actualizado para llamar a `/api/admin/save-template` en lugar de Supabase directo
- **Regla general:** nunca hacer inserts/updates sensibles desde el cliente. Siempre route server-side con service role.
- Archivos: `src/app/api/admin/save-template/route.ts`, `src/app/admin/templates/page.tsx`
- Commit: `6e502f5`

---

## Decisiones de arquitectura

| Decisión | Resolución | Razón |
|----------|------------|-------|
| Render engine | Satori + Resvg + BFL API directo | FAL descartado por complejidad; BFL es más directo |
| Templates | SVG (Figma export) como fuente de verdad | Sin definición manual de campos; las capas son los IDs |
| Modelos | Groq llama-3.3-70b (copy), BFL Flux 2 Klein (imágenes) | Groq: velocidad + precio; BFL: calidad controlada |
| Auth | Supabase Auth con `@supabase/ssr` | Integrado con el resto de Supabase; OAuth + magic link |
| Pagos | Mercado Pago Checkout Pro | Mercado LATAM; redirect flow, no iframe |
| Storage | Supabase Storage | Buckets `logos`, `templates`, `pieces` — todo en un lugar |
| Admin | Páginas `/admin/*` sin auth guard (MVP) | Interno, no expuesto en producción |

---

## Variables de entorno requeridas

| Variable | Descripción | Dónde |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Vercel + .env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública | Vercel + .env |
| `SUPABASE_SERVICE_KEY` | Service role key (server-side) | Vercel |
| `GROQ_API_KEY` | Groq API key | Vercel + .env |
| `BFL_API_KEY` | Black Forest Labs API key | Vercel + .env |
| `MERCADOPAGO_ACCESS_TOKEN` | MP token (sandbox o prod) | Vercel — **pendiente** |

---

---

## 2026-03-15 — BUG-006 + BUG-007: SVG renderer fixes
**Arqui** — Sesión `89905427`

### BUG-006: Texto invisible en live preview del wizard
- **Causa:** `/api/render-svg` usa `@resvg/resvg-wasm` para SVG→PNG. resvg no carga fuentes externas de Figma → texto renderiza invisible en la preview.
- **Fix Parte A (client-side preview):** `src/components/wizard/LivePreview.tsx`
  - Cuando `svgUrl` está definido, se fetcha el SVG raw una vez al montar (o cuando cambia `svgUrl`)
  - Las sustituciones (color tokens + textos + imágenes) se aplican client-side con string replace
  - La preview se muestra como `<img src="data:image/svg+xml;charset=utf-8,...">` — sin round-trip al server
  - El debounce de 500ms existente se mantiene; el GET a `/api/render-svg` no se elimina (se usa para descarga)
- **Fix Parte B (fallback font en renderer):** `src/lib/svg/renderer.ts`
  - Antes del XML parse, inyecta `<style>text, tspan { font-family: sans-serif; }</style>` al SVG si no tiene ya `font-family: sans-serif`
  - Esto hace que resvg use fuente disponible para el PNG final en la descarga

### BUG-007: Imagen no se actualiza en preview
- **Causa:** Figma exporta imágenes como `<rect id="manny-img-foto" fill="url(#patternXXX)">` con el `<image>` real dentro de `<defs><pattern id="patternXXX">`. El renderer hacía `el['@_href'] = value` sobre el `<rect>` → sin efecto.
- **Fix server-side:** `src/lib/svg/renderer.ts`
  - Nueva función `updatePatternImage(node, patternId, imageUrl)` que busca recursivamente el `<pattern id="patternId">` y actualiza el `@_href` y `@_xlink:href` del primer `<image>` adentro
  - En el bloque `manny-img-*`/`manny-logo-*`, después de `mutateById`, se extrae el `fill="url(#...)"`, se parsea el patternId y se llama a `updatePatternImage`
- **Fix client-side:** `src/components/wizard/LivePreview.tsx`
  - `replaceImageInSvg(svg, fieldId, imageUrl)`: busca el elemento con el id, extrae el patternId del `fill="url(#...)"`, y reemplaza el `href` dentro del `<image>` correspondiente con regex
  - Fallback: si no hay pattern, reemplaza `href`/`xlink:href` directamente en el elemento

**Archivos modificados:**
- `src/lib/svg/renderer.ts`
- `src/components/wizard/LivePreview.tsx`

**Commit:** `1cfa2d0`

---

## Estado actual de deploys

| Fecha | Commit | Descripción | Estado |
|-------|--------|-------------|--------|
| 2026-03-14 | `1a44aa8` | Fase 0 — build inicial | ✅ Live |
| 2026-03-14 | `eaabc73` | Fase A — auth + checkout + download gate | ✅ Live |
| 2026-03-15 | `6e502f5` | Fix admin template save (BUG-005) | ✅ Live |
| 2026-03-15 | `1cfa2d0` | BUG-006 client SVG preview + BUG-007 pattern image | ✅ Live |

---

### BUG-006b + BUG-007b — LivePreview inline SVG + regex attr-order fix
**Date:** 2026-03-15
**Author:** Claudio (direct fix — 1 file, obvious root cause)

**BUG-006b — Preview negro al ingresar texto:**
Root cause: `encodeURIComponent(bigSvgWithBase64)` genera una data URI de cientos de KB → browser descarta el `<img>` silenciosamente.
Fix: cambiar de `<img src="data:image/svg+xml,...">` a inline SVG con `dangerouslySetInnerHTML`. El browser renderiza fuentes + imágenes externas nativamente, sin límite de tamaño.

**BUG-007b — Imagen no se actualizaba (regex de atributos):**
Root cause: regex original asumía `id` ANTES de `fill` en el tag del elemento. Figma exporta `fill="url(#pattern)"` ANTES de `id` → la regex nunca matcheaba → el pattern ID nunca se extraía → imagen no se reemplazaba.
Fix: buscar el tag con `id="manny-img-*"` primero (cualquier orden), luego extraer `fill="url(#...)"` del tag capturado.

**Archivos modificados:** `src/components/wizard/LivePreview.tsx`
