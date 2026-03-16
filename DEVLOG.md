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

---

## 2026-03-16 — Feature: eliminar template desde admin + botón "Cambiar template" en wizard
**Arqui** — Sesión `457dda79`

### Feature 1 — Eliminar template desde admin
**Archivos:**
- `src/app/api/admin/delete-template/route.ts` (nuevo) — POST `{ templateId }`, usa service role key
  1. DELETE de `manny_templates` donde `id = templateId`
  2. DELETE del archivo `{templateId}.svg` del bucket `templates` (404 aceptado)
  3. Response: `{ success: true }` o error con status apropiado
- `src/app/admin/templates/page.tsx` — actualizado:
  - Al montar: carga lista de templates desde Supabase (anon key, public read)
  - Sección "Templates existentes" con cards: nombre, ID, categoría + botón "Eliminar" (rojo, Trash2 icon)
  - `window.confirm()` antes de ejecutar el delete
  - Optimistic remove: filtra el template del estado local sin recargar
  - Después de upload exitoso: refresca la lista

### Feature 2 — Botón "Cambiar template" en wizard
**Archivo:** `src/components/wizard/WizardLayout.tsx`
- Header del wizard: row flex con "Volver al catálogo" (izq) y "← Cambiar template" (der)
- "Cambiar template" navega a `/` (selector de templates)
- Estilo: ghost/link discreto (`text-zinc-400 hover:text-zinc-600`), no compite con CTA principal
- Sin confirmación — el progreso se pierde, es esperado

**Build:** ✅ Sin errores TypeScript ni warnings de build
**Commit:** `13d3e63`

---

## 2026-03-16 — Feature: Color step unificado en el wizard
**Arqui** — Sesión `45046c82`

### Feature: Unified Color Step
Antes: cada campo `manny-color-*` era un step separado en el wizard.
Ahora: todos los color fields se agrupan en UN SOLO paso final.

**Lógica implementada:**
- `nonColorFields = activeFields.filter(f => f.type !== 'color')`
- `colorFields = activeFields.filter(f => f.type === 'color')`
- `totalSteps = nonColorFields.length + (colorFields.length > 0 ? 1 : 0)`
- `isUnifiedColorStep`: true cuando `currentStep === nonColorFields.length` y hay color fields
- El step unificado renderiza todos los color pickers en una sola pantalla (label + input type color)
- Finalizar aparece correctamente en el último step real (unified color step o último field step si no hay colores)
- Backward-compatible: JSX templates con `colorSchemes` siguen usando el picker legacy de paletas
- `wizardStore.ts`: `nextStep()` cap actualizado para respetar la nueva lógica de totalSteps

**Archivos modificados:**
- `src/components/wizard/WizardLayout.tsx`
- `src/stores/wizardStore.ts`

**Build:** ✅ Sin errores TypeScript ni warnings
**Commit:** `79843a3`

---

## 2026-03-16 — BUG-009: Fix Finalizar DEV_MODE (SVG templates)
**Author:** Claudio (direct fix — 1 archivo, causa obvia)

### BUG-009 — Botón "Finalizar" no descargaba el PNG
**Causa:** `WizardLayout.tsx` en DEV_MODE mandaba `{ templateId, fields, colorScheme }` al endpoint `/api/render-svg`, pero ese endpoint espera `{ svgUrl, values, colorScheme }`. Params mal nombrados + falta `svgUrl`.

**Fix:** Para SVG templates, DEV_MODE ahora envía:
```ts
{ svgUrl: (template as SvgTemplate).svgUrl, values, colorScheme }
```
Para JSX templates sigue igual (`{ templateId, fields, colorScheme }`).

**Archivo:** `src/components/wizard/WizardLayout.tsx`
**Commit:** `ba393e8`

---

## 2026-03-16 — Feature: manny-color-* en elementos sueltos (no solo grupos)
**Author:** Claudio (direct fix)

**Cambio:** Antes, `manny-color-*` solo detectaba grupos `<g>`. Ahora también funciona en elementos sueltos (`<rect>`, `<path>`, `<circle>`, etc.).

- `src/lib/svg/parser.ts`: detecta `manny-color-*` en cualquier elemento
- `src/components/wizard/LivePreview.tsx`: `replaceColorInSvg()` maneja ambos casos:
  - Grupo `<g>`: reemplaza fill/stroke de todos los hijos
  - Elemento suelto: reemplaza fill/stroke directamente en el elemento

**Commits:** `b89d181` (fix), `ef7fbce` (docs)

---

## 2026-03-16 — Conocimiento operativo: Figma → SVG (acumulado)

### Convención de capas (vigente)
| ID de capa Figma | Tipo en wizard | Comportamiento |
|---|---|---|
| `manny-text-[nombre]` | texto | input, una línea |
| `manny-multiline-[nombre]` | texto | textarea, word-wrap automático |
| `manny-img-[nombre]` | imagen | upload + AI gen; centrada con xMidYMid slice |
| `manny-logo-[nombre]` | logo | solo upload |
| `manny-color-[nombre]` | color | picker; funciona en `<g>` y en elemento suelto |

### Reglas Figma para export limpio
1. `manny-color-*` → NO usar masks ni clip-path dentro del grupo. Si el layer tiene Frame type → Flatten (Cmd+E) antes de exportar.
2. `manny-multiline-*` → el texto ejemplo debe tener ≥2 líneas (para exportar 2 tspans y calcular lineHeight).
3. Texto con color variable → anidar `manny-text-titulo` dentro de grupo `manny-color-acento`; ambos IDs se procesan independientemente.
4. Imagen → Figma exporta como `<g id="manny-img-foto">` con `<rect fill="url(#pattern)">` interno.
5. Layer con tipo Frame en Figma puede exportar con `<clipPath>` wrapper → Flatten antes.

### Issues conocidos sin fix de código
- **z-order con Figma mask groups:** Si `manny-color-*` contiene un mask (icono de máscara en Figma), el SVG exportado puede tener z-order inesperado. Workaround: no usar masks dentro de grupos `manny-color-*`; usar Flatten o Boolean Operations para shapes complejas.

### Pendiente de producto (Juan analizando flow)
- **Watermark en preview:** Agregar overlay semitransparente con texto "PREVIEW" sobre el LivePreview para desincentivar capturas de pantalla. El PNG final (post-pago) va sin watermark. Pendiente hasta que Juan defina el flujo completo + UI definitiva.
- **Previsualización admin:** Muestra SVG raw de Figma — puede verse desordenado. Esto es esperado; el wizard aplica todos los fixes al renderizar. No requiere cambio.

---

## Estado actual de deploys

| Fecha | Commit | Descripción | Estado |
|-------|--------|-------------|--------|
| 2026-03-14 | `1a44aa8` | Fase 0 — build inicial | ✅ Live |
| 2026-03-14 | `eaabc73` | Fase A — auth + checkout + download gate | ✅ Live |
| 2026-03-15 | `6e502f5` | Fix admin template save (BUG-005) | ✅ Live |
| 2026-03-15 | `1cfa2d0` | BUG-006 client SVG preview + BUG-007 pattern image | ✅ Live |
| 2026-03-16 | `13d3e63` | Admin delete template + wizard back button | ✅ Live |
| 2026-03-16 | `1c841e4` | (push adicional) | ✅ Live |
| 2026-03-16 | `7fcf2b1` | manny-color-* sistema dinámico | ✅ Live |
| 2026-03-16 | `a95e37f` | Auto word-wrap canvas.measureText() | ✅ Live |
| 2026-03-16 | `b89d181` | manny-color-* en elementos sueltos | ✅ Live |
| 2026-03-16 | `79843a3` | Color step unificado en wizard | ✅ Live |
| 2026-03-16 | `ba393e8` | Fix BUG-009: Finalizar DEV_MODE SVG templates | ✅ Live |

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

---

### BUG-006c + BUG-007c — Root cause identified and fixed (16/03)
**Author:** Claudio (direct fix — 1 file, root causes confirmed by inspecting actual SVG)

**BUG-006c - Texto no aparece:**
Root cause: regex usaba `</(?:text|tspan)>` como cierre. Con non-greedy match, capturaba el PRIMER
`</tspan>` interno y producía SVG inválido: `<text ...>value</tspan>`. Browser lo descartaba silenciosamente.
Fix: cambiar closing tag a `</text>` específicamente.

**BUG-007c - Imagen no se actualiza:**
Root cause: `manny-img-foto` es un `<g>` group. Estructura real Figma:
`<g id="manny-img-foto">` → `<rect fill="url(#pattern0_4_2)">` → `<pattern>` → `<use xlink:href="#image0_4_2">` → `<image id="image0_4_2">`
El código anterior buscaba fill="url(#...)" en el elemento con el ID, pero el `<g>` no tiene fill.
Fix: detectar `<g id="manny-img-*">`, extraer dimensiones del rect interno, reemplazar todo el grupo
con `<image href=value clip-path>` + `<clipPath>` para bordes redondeados.

**Archivo modificado:** `src/components/wizard/LivePreview.tsx`

---

## 2026-03-16 — QA Wizard SVG: BUG-008 encontrado
**Arqui (subagente QA)** — Sesión `a8aaac77`

### QA del wizard SVG completo — template `design-10--3-`

**Flujo testeado:** Imagen upload → Texto → Color picker
**URL:** https://manny-v2.vercel.app/wizard/design-10--3-

**Resultados:**
- ✅ BUG-007c confirmado resuelto: image upload reemplaza la imagen en el SVG preview
- ✅ Color switching (Oscuro/Claro/Cálido): funciona en tiempo real
- ✅ 0 errores de consola en todo el flujo
- ✅ Wizard navigation, template loading, catalog
- ❌ BUG-008 encontrado: texto desaparece del preview al escribir

### BUG-008 — Texto off-screen al reemplazar en SVG preview
**Causa:** `replaceTextInSvg()` en `LivePreview.tsx` reemplaza el innerHTML completo del `<text>` element incluyendo los `<tspan>` hijos que llevan atributos `x` y `y` de posicionamiento. Sin tspan, el texto renderiza en la posición default del `<text>` que queda fuera del viewport visible (DOM bounding box: x=700, y=18 vs correcto y=778 en SVG coords).

**Estructura Figma real:**
```xml
<text id="manny-text-titulo">
  <tspan x="115" y="778.76">texto default</tspan>
  <tspan x="115" y="838.76">segunda línea</tspan>
</text>
```

**Después del fix actual (ROTO):**
```xml
<text id="manny-text-titulo">nuevo texto</text>
← tspanCount=0, posición off-screen
```

**Fix necesario en:** `src/components/wizard/LivePreview.tsx` → `replaceTextInSvg()`
**Estrategia:** Preservar el primer `<tspan>` con sus atributos `x`,`y`. Reemplazar solo el text content dentro del tspan. Eliminar tspans adicionales.
**Afecta:** Todos los campos `manny-text-*` en todos los templates SVG.
**Estimación:** 15 min, 1 función, 1 archivo.

---

### BUG-008 — Texto fuera del área visible en SVG preview (16/03)
**Detectado por:** Arqui (QA post-commit 4bbb12d)
**Fixed by:** Claudio (directo — misma función, causa obvia)

Root cause: BUG-006c fix reemplazaba el innerHTML completo del `<text>` con texto plano,
perdiendo los `<tspan x="..." y="...">` hijos que llevan el posicionamiento.
Sin tspan, el texto se renderiza en las coordenadas default del elemento `<text>`,
que en este template son (700, 18) — fuera del área visible del preview.

Fix: dentro del replace, extraer los atributos del primer `<tspan>` (x, y, etc.),
envolver el nuevo valor en `<tspan [attrs]>value</tspan>`, descartar tspans restantes.

**Archivo:** `src/components/wizard/LivePreview.tsx` — función `replaceTextInSvg`

---

### Feature: sistema de colores dinámicos manny-color-* (16/03)
**Author:** Claudio (directo — Arqui subagent fallaba en <20s sin hacer nada)

**Cambio:** Reemplaza el sistema de "themes" (Oscuro/Claro/Cálido) por color pickers individuales basados en grupos Figma `manny-color-[id]`.

**Archivos modificados:**
- `src/lib/svg/parser.ts` — detecta `manny-color-*` grupos, extrae color default del primer fill válido
- `src/components/wizard/WizardStep.tsx` — agrega case `type: 'color'` → `<input type="color">` con valor default del SVG
- `src/components/wizard/LivePreview.tsx` — agrega `replaceColorInSvg()`, se llama en `applyFieldsToSvg()` para campos `manny-color-*`; `applyColorTokens` queda solo para JSX templates con colorSchemes
- `src/components/wizard/WizardLayout.tsx` — SVG templates saltan el step de ColorPicker; "Finalizar" aparece en el último step directamente

**Backward-compatible:** si el SVG no tiene `manny-color-*`, no aparecen pickers.
**promo-restaurante (JSX):** sin cambios, sigue usando colorSchemes.
