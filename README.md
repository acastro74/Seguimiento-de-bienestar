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
npm install
npm run dev
```

> Si aparece `npm error Missing script: "dev"`, la Terminal no está dentro de la carpeta del proyecto. Entra con `cd Seguimiento-de-bienestar` y vuelve a intentarlo. Si ya habías clonado el repositorio, actualízalo con `git pull`.

Abre http://localhost:5173. Sin configurar Supabase, la app funciona en **modo demo**: los datos se guardan solo en ese navegador. Puedes cargar 60 días de datos de ejemplo para ver el dashboard lleno.

**Limitaciones del modo demo**

- Los datos viven solo en ese navegador y en esa dirección: `localhost:5173` y `localhost:5174` son "sitios" distintos.
- Borrar los datos de navegación también borra la bitácora.
- Para no perder nada, usa **Ajustes → Tus datos → Descargar respaldo**.

## Ponerla en línea con cuentas (Supabase + Vercel)

Cada persona crea su cuenta con **correo y contraseña** y solo ve sus propios datos.

### 1. Supabase: base de datos y cuentas (gratis)

1. Crea una cuenta en https://supabase.com y luego un proyecto con **New project**:
   - **Nombre:** por ejemplo `bitacora-bienestar`.
   - **Contraseña de la base de datos:** genera una y guárdala.
   - **Región:** la más cercana, por ejemplo *South America (São Paulo)*.
2. **Crear las tablas.** En el menú lateral entra a **SQL Editor → New query**. Pega todo el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) y presiona **Run**. Debe decir *Success. No rows returned*. Esto crea las tablas y la seguridad por fila, que hace que cada persona vea solo sus propios datos.
3. **Permitir entrar sin confirmar el correo.** Entra a **Authentication → Sign In / Providers**:
   - Deja activado **Allow new users to sign up**. Así tus amigos pueden crear su cuenta.
   - Desactiva **Confirm email** y presiona **Save**.

   Es necesario porque el envío de correos gratuito de Supabase solo llega a los miembros de tu equipo en Supabase, así que tus amigos nunca recibirían el correo de confirmación.
4. **Copiar las llaves.** En **Project Settings → API Keys** (o **Connect**) copia:
   - la **Project URL**, que se ve como `https://xxxx.supabase.co`;
   - la llave pública **anon** o **publishable**.

   ⚠️ **Nunca uses la llave `service_role` ni la `secret`.**
5. Haz el paso 6 después de publicar en Vercel, cuando ya tengas la URL de tu app.
6. **URL de la app.** En **Authentication → URL Configuration**:
   - **Site URL:** la URL de Vercel, por ejemplo `https://bitacora-bienestar.vercel.app`.
   - **Redirect URLs:** agrega `https://bitacora-bienestar.vercel.app/**` y `http://localhost:5173/**`.

**Opcional: correo propio para "¿Olvidaste tu contraseña?".** Sin esto, el correo de recuperación solo llega a los miembros de tu equipo en Supabase. Para que llegue a cualquiera:

1. Crea una cuenta gratuita en un servicio de correo, por ejemplo [Resend](https://resend.com).
2. Configúrala en **Project Settings → Authentication → SMTP Settings**.

Mientras tanto, si un amigo olvida su contraseña, puedes borrar su usuario en **Authentication → Users** para que se registre de nuevo. Ojo: así pierde sus datos, así que primero debería descargar su respaldo si puede entrar.

**Opcional: entrar con Google.** Configura **Authentication → Sign In / Providers → Google** con credenciales de Google Cloud. Después agrega la variable `VITE_ENABLE_GOOGLE=true` en Vercel.

Para usar Supabase también en tu computador, copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### 2. Vercel: publicar la app (gratis)

1. Entra a https://vercel.com con **Continue with GitHub**.
2. Elige **Add New… → Project**, busca `Seguimiento-de-bienestar` y presiona **Import**. Si no aparece, usa **Adjust GitHub App Permissions** para darle acceso al repositorio.
3. En la pantalla de configuración:
   - **Framework Preset:** debe decir **Vite** (lo detecta solo).
   - **Build Command:** `npm run build` (por defecto).
   - **Output Directory:** `dist` (por defecto).
   - Abre **Environment Variables** y agrega dos:
     - `VITE_SUPABASE_URL` = tu Project URL
     - `VITE_SUPABASE_ANON_KEY` = tu llave anon o publishable
4. Presiona **Deploy**. En 1 o 2 minutos tendrás una URL como `https://seguimiento-de-bienestar.vercel.app`.
5. Vuelve a Supabase y completa el paso 6 (URL Configuration) con esa URL.
6. Cada vez que se fusione un cambio en `main`, Vercel publica la versión nueva sola.

> Si cambias las variables de entorno en Vercel, ve a **Deployments → ⋯ → Redeploy** para que se apliquen.

### 3. Invitar a tus amigos

1. Envíales la URL de Vercel.
2. Cada persona toca **Crear cuenta**, escribe su correo y una contraseña (mínimo 8 caracteres), y completa el onboarding.
3. En Supabase, **Authentication → Users**, puedes ver quién se registró y borrar cuentas.
4. Los datos de cada persona están aislados por la seguridad por fila: nadie ve los de otro.

### 4. Pasar tus datos del modo demo a tu cuenta

1. En la app local (modo demo): **Ajustes → Tus datos → Descargar respaldo**. Se baja un archivo `.json`.
2. En la app publicada, con tu cuenta: **Ajustes → Tus datos → Importar respaldo** y elige ese archivo.

Los hábitos y medicamentos con el mismo nombre se fusionan, y los días que ya tengas registrados se reemplazan por los del respaldo.

### 5. Instalarla en el celular

Abre la URL en el celular:

- **iPhone (Safari):** toca **Compartir → Agregar a inicio**.
- **Android (Chrome):** toca **⋮ → Instalar app**.

## Desarrollo

```bash
npm run dev        # servidor de desarrollo
npm run typecheck  # TypeScript estricto
npm test           # pruebas unitarias (sueño, hallazgos, CSV)
npm run e2e        # pruebas end-to-end con Playwright (modo demo y modo nube con Supabase simulado)
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
- **Respaldo** (`src/lib/backup.ts`): un JSON con perfil, hábitos, medicamentos y días. Al importar, los IDs se traducen a los de la cuenta destino.

## Próximos pasos posibles

Recordatorios push, vista para el profesional de salud (con permiso de la persona), resumen semanal con IA, fotos de comidas, integración con Apple Health o Google Fit, y app nativa.
