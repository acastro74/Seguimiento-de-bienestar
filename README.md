# 🌈 Bitácora de Bienestar

App web (PWA, instalable en el celular) para registrar día a día **cómo duermes, comes, te mueves y te sientes**, y ver con gráficos e indicadores **qué hábitos se relacionan con sentirte mejor o peor**.

Digitaliza dos hojas en papel: **Seguimiento de Bienestar** (sueño, ejercicio, cuidados personales, nutrición, ánimo y agua) y el **Diario del Sueño** (Consensus Sleep Diary, Carney et al., 2012).

## Qué incluye el MVP

| Pantalla | Qué hace |
|---|---|
| **Hoy** (check-in) | Tarjetas que se completan con toques y se guardan solas: 🌙 diario del sueño completo (calcula horas en cama, horas dormidas y **eficiencia del sueño** en vivo), 😊 ánimo, energía y estrés (1–10), 💧 vasos de agua, 🍽️ comidas con grupos P/C/V/F/L y texto opcional, 🏃 ejercicio (tipo, minutos e intensidad), ✨ cuidados personales, ☕🍷 cafeína y alcohol con hora, 💊 medicamentos y suplementos, ⚖️ peso y 🌸 ciclo (opcionales), 📝 nota. Un anillo muestra cuánto falta completar. |
| **Dashboard** | Indicadores con comparación contra el período anterior, **hallazgos automáticos** (p. ej. *"Los días que dormiste 7 h o más, tu ánimo promedio fue 6,5 vs 5"*), tendencias de ánimo, energía y estrés, sueño y eficiencia, calendario de ánimo, ejercicio semanal por tipo, balance del plato, cuidados personales, agua y peso. Períodos de 7, 30 y 90 días. |
| **Historial** | Calendario mensual coloreado por ánimo; al tocar un día se edita. |
| **Reportes** | Vista imprimible o en **PDF** con el formato de las hojas en papel (resumen, hoja de bienestar y diario del sueño) y exportación a **CSV/Excel**. |
| **Ajustes** | Metas editables, hábitos y medicamentos propios, peso y ciclo opcionales, tema claro u oscuro, cerrar sesión. |

Los **hallazgos** comparan el promedio de un resultado entre los días en que cumpliste un hábito y los días en que no. Solo se muestran si hay al menos 5 días en cada grupo y la diferencia es relevante. La cafeína, el alcohol y el ejercicio se comparan contra el sueño **de esa misma noche**, que queda registrado en el día siguiente. Son correlaciones, no necesariamente causas.

## Probarla en tu computador (modo demo)

Requiere [Node.js](https://nodejs.org) 20 o superior y git. En la Terminal:

```bash
git clone https://github.com/acastro74/Seguimiento-de-bienestar.git
cd Seguimiento-de-bienestar
git checkout claude/eloquent-bohr-m4lcdf   # solo mientras el código no esté en main
npm install
npm run dev
```

> Si aparece `npm error Missing script: "dev"`, la Terminal no está dentro de la carpeta del proyecto. Entra con `cd Seguimiento-de-bienestar` y vuelve a intentarlo. Si ya habías clonado el repositorio antes, entra a su carpeta y ejecuta `git fetch` antes del `git checkout`.

Abre http://localhost:5173. Sin configurar Supabase, la app funciona en **modo demo**: los datos se guardan solo en ese navegador. Puedes cargar 60 días de datos de ejemplo para ver el dashboard lleno.

## Ponerla en línea con cuentas (Supabase + Vercel)

### 1. Base de datos y login: Supabase (gratis)

1. Crea una cuenta en https://supabase.com y luego un proyecto nuevo. Elige la región más cercana, por ejemplo *South America (São Paulo)*.
2. Abre **SQL Editor → New query**, pega el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y presiona **Run**. Esto crea las tablas y la seguridad por fila: cada persona solo ve sus propios datos.
3. En **Project Settings → API**, copia la **Project URL** y la **anon public key**.
4. En **Authentication → URL Configuration**:
   - **Site URL**: la URL de tu app en Vercel, por ejemplo `https://bitacora-bienestar.vercel.app`.
   - **Redirect URLs**: agrega esa misma URL y `http://localhost:5173`.
5. El login con enlace por correo funciona sin más configuración. Para habilitar **Google**, ve a *Authentication → Providers → Google* y sigue la guía de Supabase para crear las credenciales en Google Cloud.

Para usar Supabase también en tu computador, copia `.env.example` como `.env.local` y completa los dos valores.

### 2. Publicar: Vercel (gratis)

1. Entra a https://vercel.com con tu cuenta de GitHub y elige **Add New → Project → importar este repositorio**.
2. Vercel detecta Vite solo. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Presiona **Deploy**. Cada push a la rama principal vuelve a publicar la app.

### 3. Instalarla en el celular

Abre la URL en el celular. En iPhone (Safari) toca **Compartir → Agregar a inicio**. En Android (Chrome) toca **⋮ → Instalar app**.

## Desarrollo

```bash
npm run dev        # servidor de desarrollo
npm run typecheck  # TypeScript estricto
npm test           # pruebas unitarias (sueño, hallazgos, CSV)
npm run e2e        # pruebas end-to-end con Playwright (modo demo, viewport de celular)
npm run build      # build de producción (incluye el service worker de la PWA)
```

**Stack:** Vite, React 19, TypeScript, Tailwind CSS 4, TanStack Query, React Router, Recharts, date-fns, Supabase y vite-plugin-pwa.

```
src/
  data/        tipos, valores por defecto, acceso a datos (Supabase / localStorage), datos demo, hooks
  lib/         lógica pura y testeada: sleep.ts, stats.ts, insights.ts, csv.ts, dates.ts
  components/  UI base (tarjetas, escalas 1–10, vasos de agua, anillos, navegación)
  features/    pantallas: checkin, dashboard, history, reports, settings, onboarding, auth
supabase/migrations/   esquema SQL con Row Level Security
e2e/                   pruebas de Playwright
```

### Modelo de datos

- Hay un registro por persona y día (`day_logs`). El **sueño guardado en un día corresponde a la noche anterior**, igual que en el diario del sueño.
- Comidas, sesiones de ejercicio, consumos (cafeína, alcohol, medicamentos) y hábitos cumplidos se guardan como listas JSON dentro del mismo registro diario. Así, cada autoguardado es un solo `upsert`.
- `habits` y `medications` son los catálogos personales de cada persona.

## Próximos pasos posibles

Recordatorios push, vista para el profesional de salud (con permiso de la persona), resumen semanal con IA, fotos de comidas, integración con Apple Health o Google Fit, y app nativa.
