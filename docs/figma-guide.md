# Manny — Guía de Figma

Cómo preparar un template en Figma para que funcione con el wizard de Manny.

---

## El sistema de capas

Manny lee tu SVG y detecta los campos dinámicos por el nombre de las capas. La convención es simple:

| Prefijo | Tipo | Qué hace |
|---|---|---|
| `manny-text-[id]` | Texto | El usuario escribe su propio texto |
| `manny-img-[id]` | Imagen | El usuario sube su foto/logo |
| `manny-color-[id]` | Color | El usuario elige el color con un picker |

El `[id]` puede ser cualquier nombre descriptivo: `titulo`, `foto`, `acento`, `fondo`, etc.

---

## Cómo nombrar capas en Figma

En Figma, los nombres de capa son los IDs del SVG exportado. Para renombrar una capa:

1. Seleccioná la capa en el panel izquierdo
2. Doble click en el nombre → escribí el nuevo nombre
3. Enter

**Importante:** el nombre debe ser exactamente `manny-text-titulo`, `manny-img-foto`, etc. Sin espacios, sin mayúsculas extra.

---

## manny-text-[id] — Campos de texto

**Cuándo usarlo:** cualquier texto que el usuario va a personalizar (título, subtítulo, descripción, nombre del negocio, etc.)

**Cómo configurarlo en Figma:**
1. Creá un elemento de texto con el contenido de ejemplo (ej: "Nombre del restaurante")
2. Renombrá esa capa como `manny-text-titulo`
3. El texto de ejemplo aparece como placeholder en el wizard

**Limitación:** el texto de reemplazo va en una sola línea. Si el original tiene dos `<tspan>` (salto de línea), el wizard usa el primero y descarta los siguientes.

**Ejemplo de estructura en SVG exportado:**
```xml
<text id="manny-text-titulo" fill="#FF6600" font-size="48" ...>
  <tspan x="115" y="778">Nombre del restaurante</tspan>
</text>
```

---

## manny-img-[id] — Campos de imagen

**Cuándo usarlo:** fotos del plato, logo del negocio, imagen de producto, cualquier elemento visual que el usuario va a reemplazar.

**Cómo configurarlo en Figma:**
1. Colocá una imagen de placeholder en el diseño (puede ser cualquier foto de referencia)
2. Aplicá un `rx` (border radius) si querés bordes redondeados
3. Renombrá esa capa como `manny-img-foto`
4. **Agrupala** si no es ya un grupo: seleccioná el elemento → Cmd+G → renombrá el grupo como `manny-img-foto`

**Importante:** Figma exporta imágenes dentro de grupos como `<g id="manny-img-foto">`. Manny detecta el grupo, extrae las dimensiones del `<rect>` interno, e inyecta la imagen del usuario manteniendo el tamaño y el border radius original.

**Estructura típica exportada:**
```xml
<g id="manny-img-foto">
  <rect x="80" y="98" width="1040" height="590" rx="16" fill="#D9D9D9"/>
  <rect x="80" y="98" width="1040" height="590" rx="16" fill="url(#pattern...)"/>
</g>
```

---

## manny-multiline-[id] — Texto multilínea con word wrap automático

**Cuándo usarlo:** descripciones, taglines largas, bloques de texto donde el contenido puede variar en longitud.

**Diferencia con `manny-text-[id]`:**
- `manny-text-titulo` → una sola línea (el usuario escribe y el texto se mantiene en la misma línea)
- `manny-multiline-descripcion` → el texto se distribuye automáticamente en múltiples líneas según el ancho de la columna

**Cómo configurarlo en Figma — paso a paso:**

1. Creá un elemento de texto con contenido de ejemplo **que ocupe al menos 2 líneas** (esto es crítico)
   - Ejemplo: "Milanesa napolitana con papas fritas" en dos líneas, no en una sola
   - El sistema usa ese texto para calcular el ancho disponible de la columna
2. Asegurate de que el texto de ejemplo **llene el ancho que querés** — si el texto de ejemplo es corto, el sistema va a calcular una columna angosta
3. Renombrá la capa: `manny-multiline-descripcion`

**Por qué necesita 2 líneas de ejemplo:**
Cuando exportás el SVG, Figma genera un `<tspan>` por línea, cada uno con su propia coordenada Y. El sistema lee el delta entre el Y de la primera y segunda línea para saber el `line-height`. Sin ese delta, usa un fallback de `fontSize × 1.25` que puede no coincidir con tu diseño.

```
Ejemplo correcto (2 tspans → el sistema puede calcular line-height):
  <tspan x="115" y="778">Milanesa napolitana</tspan>       ← Y = 778
  <tspan x="115" y="838">con papas fritas</tspan>          ← Y = 838 → delta = 60px

Ejemplo incorrecto (1 solo tspan → sin delta, usa fallback):
  <tspan x="115" y="778">Milanesa napolitana con papas fritas</tspan>
```

**En el wizard:** aparece como un `<textarea>` donde el usuario escribe libremente. El texto se distribuye automáticamente en las líneas necesarias respetando el ancho del diseño.

---

## manny-color-[id] — Campos de color

**Cuándo usarlo:** cuando querés que el usuario pueda cambiar el color de ciertos elementos (fondo, acento, textos decorativos, bordes, íconos).

**Cómo configurarlo en Figma:**
1. Seleccioná todos los elementos que van a compartir ese color (ej: todos los elementos naranjas)
2. Agrupalos: Cmd+G
3. Renombrá el grupo como `manny-color-acento`
4. Repetí para cada color dinámico que tengas: `manny-color-fondo`, `manny-color-texto`, etc.

**Cómo funciona:** Manny extrae el color original de esa capa (del primer elemento con fill dentro del grupo) y lo muestra como default en el picker. Cuando el usuario elige un nuevo color, se aplica a todos los elementos dentro del grupo.

**Ejemplo:**
```xml
<g id="manny-color-acento">
  <rect fill="#FF6600" .../>
  <circle fill="#FF6600" .../>
  <text fill="#FF6600" ...>...</text>
</g>
```
→ El picker arranca en `#FF6600`. Si el usuario elige `#3B82F6`, todos los elementos del grupo cambian a ese azul.

**Nota:** elementos con `fill="none"` o `fill="url(...)"` dentro del grupo se ignoran (no se rompen transparencias ni patterns).

### Texto con color variable

Si un texto necesita ser editable Y tener color dinámico, usás ambas convenciones a la vez:

1. El text layer se llama `manny-text-titulo` (controla el contenido)
2. Lo agrupás (Cmd+G) y al grupo le ponés `manny-color-acento` (controla el color)

```
Figma layers:
└── manny-color-acento  (grupo — controla color)
    └── manny-text-titulo  (texto — controla contenido)
```

SVG resultante:
```xml
<g id="manny-color-acento">
  <text id="manny-text-titulo" fill="#FF6600" ...>
    <tspan x="115" y="778">Título de ejemplo</tspan>
  </text>
</g>
```

El wizard genera un campo de texto para `manny-text-titulo` y un color picker para `manny-color-acento`. Funcionan de forma independiente — el usuario edita el texto Y elige el color por separado.

---

## Estructura recomendada del diseño

```
Frame principal (1200×675 o el tamaño que uses)
├── manny-img-foto          ← grupo con la imagen principal
├── manny-color-fondo       ← grupo con los rects de fondo
├── manny-color-acento      ← grupo con elementos de acento
├── manny-text-titulo       ← texto del título
├── manny-text-subtitulo    ← texto secundario
└── [otros elementos estáticos, sin prefijo manny-]
```

Los elementos sin prefijo `manny-` son estáticos — Manny no los toca.

---

## Exportar el SVG desde Figma

1. Seleccioná el frame completo (no los elementos individuales)
2. En el panel derecho → **Export**
3. Formato: **SVG**
4. Activá **"Include id attribute"** → esto es crítico para que los IDs de capa aparezcan en el SVG
5. Export → descargá el archivo `.svg`
6. Subí el SVG en https://manny-v2.vercel.app/admin/templates

### Configuración de export recomendada

| Opción | Valor |
|---|---|
| Format | SVG |
| Include "id" attribute | ✅ Activado |
| Outline text | ❌ Desactivado (el texto debe ser texto, no paths) |
| Simplify stroke | A gusto |

**⚠️ "Outline text" desactivado es crítico.** Si activás outline, el texto se convierte en paths y Manny no puede editarlo.

---

## Checklist antes de exportar

- [ ] Todos los campos dinámicos tienen el prefijo `manny-` correcto
- [ ] Los campos de imagen son grupos (`<g>`), no elementos sueltos
- [ ] Los campos de color son grupos con los elementos que comparten color
- [ ] "Include id attribute" está activado en el export
- [ ] "Outline text" está desactivado
- [ ] El diseño tiene al menos un `manny-text-*` o `manny-img-*` (templates sin campos no tienen sentido)

---

## Verificar que el SVG está bien

Después de exportar, podés abrirlo en un editor de texto y buscar:

```bash
grep 'id="manny-' tu-template.svg
```

Deberías ver algo como:
```
id="manny-img-foto"
id="manny-text-titulo"
id="manny-text-subtitulo"
id="manny-color-acento"
```

Si no aparecen, revisá que "Include id attribute" estaba activado.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El texto no se actualiza en el preview | El texto está en outline | Re-exportar sin "Outline text" |
| La imagen no reemplaza el placeholder | La capa de imagen no es un grupo | Agrupar el elemento: Cmd+G → renombrar |
| El campo no aparece en el wizard | Falta el prefijo `manny-` en el nombre | Renombrar la capa en Figma |
| El campo no aparece en el wizard | "Include id attribute" estaba desactivado | Re-exportar con la opción activada |
| Los colores no cambian | Los elementos de color no están en un grupo `manny-color-*` | Agrupar y renombrar |
| El preview se ve negro / vacío | SVG muy pesado (imágenes en base64) | Normal — el preview puede tardar un segundo |
