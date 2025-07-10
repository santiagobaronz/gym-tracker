# TrackGym

TrackGym es una aplicación PWA mobile-first para registrar y analizar entrenamientos de gimnasio. Diseñada para dos usuarios fijos (Vanessa y Santiago), permite registrar sesiones de entrenamiento, consultar resúmenes diarios, semanales, mensuales y anuales, y establecer objetivos de entrenamiento.

## Características

- Registro de sesiones de entrenamiento con ejercicios, series, repeticiones y peso
- Historial de sesiones con opción de editar o borrar
- Resúmenes estadísticos semanales, mensuales y anuales
- Seguimiento de peso corporal y proyecciones
- Establecimiento de objetivos de peso y frecuencia
- Resumen compartido para ambos usuarios
- Funcionalidad offline (PWA)
- Tema oscuro/claro

## Stack Tecnológico

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL (Neon)
- next-pwa para funcionalidad offline
- react-chartjs-2 para gráficas
- Vercel para deploy y cron jobs

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/track-gym.git
cd track-gym
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env.local` con la URL de conexión a la base de datos:

```
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/nombre-db"
```

4. Ejecuta las migraciones de Prisma:

```bash
npm run prisma:migrate
```

5. Ejecuta el seed para crear los usuarios y ejercicios iniciales:

```bash
npm run seed
```

6. Inicia el servidor de desarrollo:

```bash
npm run dev
```

## Estructura del Proyecto

La aplicación sigue la estructura del App Router de Next.js:

```
/src
  /app
    /api - Endpoints de la API
    /(user)/[userId] - Rutas específicas de usuario
      /sesiones - Gestión de sesiones
      /resumen - Resúmenes estadísticos
      /objetivos - Gestión de objetivos
    /resumen/compartido - Resumen compartido
  /components - Componentes reutilizables
  /contexts - Contextos de React
  /hooks - Hooks personalizados
  /lib - Utilidades y funciones auxiliares
  /types - Tipos TypeScript
/prisma - Esquema y migraciones de Prisma
/public - Archivos estáticos y PWA
```

## Cómo Activar Notificaciones Push

Para activar las notificaciones push en el futuro, sigue estos pasos:

1. Genera las claves VAPID:

```bash
npx web-push generate-vapid-keys
```

2. Añade las claves al archivo `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="tu-clave-publica"
VAPID_PRIVATE_KEY="tu-clave-privada"
VAPID_SUBJECT="mailto:tu-email@ejemplo.com"
```

3. Implementa el servicio de suscripción en el cliente:

```typescript
// src/hooks/useNotifications.ts
export function useNotifications() {
  const subscribe = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });
    
    // Enviar la suscripción al servidor
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  };
  
  return { subscribe };
}
```

4. Implementa el endpoint para guardar suscripciones:

```typescript
// src/app/api/notifications/subscribe/route.ts
export async function POST(request: Request) {
  const subscription = await request.json();
  
  // Guardar la suscripción en la base de datos
  await prisma.pushSubscription.create({
    data: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userId: // obtener el userId del contexto o de la solicitud
    }
  });
  
  return NextResponse.json({ success: true });
}
```

5. Implementa el endpoint para enviar notificaciones:

```typescript
// src/app/api/notifications/send/route.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const { userId, title, body } = await request.json();
  
  // Obtener suscripciones del usuario
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId }
  });
  
  // Enviar notificación a cada suscripción
  await Promise.all(subscriptions.map(sub => {
    return webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      },
      JSON.stringify({ title, body })
    );
  }));
  
  return NextResponse.json({ success: true });
}
```

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.
