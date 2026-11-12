This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Solicitudes de alta de negocio

Las solicitudes se guardan en Cloud Firestore. Configura las credenciales privadas de Firebase
Admin en el entorno de despliegue (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`
y `FIREBASE_PRIVATE_KEY`); nunca las expongas al cliente. Habilita Google
Authentication y el proveedor Correo/contraseña. Las cuentas @gmail.com acceden
como usuarios finales mediante Google o correo/contraseña. Para cada destino
aprobado, el administrador debe crear primero en Firebase Authentication una cuenta
@metepec.mx con contraseña y asignarla desde el panel de aprobación. Solo esa cuenta
puede modificar el destino asignado; el solicitante conserva su correo de usuario
final. Al iniciar sesión, la cuenta institucional entra a `/mi-destino`, donde puede
actualizar la información y subir imágenes JPG, JPEG o PNG de hasta 650 KB cada una.
El `overrides` de `package.json` fija `jose@5.10.0` para `jwks-rsa`, que todavía lo
carga con `require`; `jose` 6 es solo ESM y provoca errores al cargar Firebase Admin
en Vercel.
Las altas realizadas desde el panel de destinos se guardan en Firestore y cada
cuenta institucional se asigna a un único destino; el administrador puede cambiar
la asignación desde la lista de destinos dados de alta.
El administrador inicia sesión con la cuenta Firebase `admin@admin.com`.
La respuesta se muestra en el portal del solicitante; no se envía un correo
automático.

## Catálogo de guías

Las altas de guías se administran desde `/admin/guias` y se guardan en la colección
de Cloud Firestore `alta de guias`. La lectura y escritura requieren una sesión del
administrador. Las fotos aceptadas son JPG, PNG o WebP de hasta 650 KB y se guardan
en Cloudinary; Firestore conserva sus URL. El alta de destinos está separada en
`/admin/destinos`.

Los guías pueden solicitar el alta desde `/registro-guia`. Su cuenta de Firebase
Authentication se crea deshabilitada y no puede iniciar sesión mientras la solicitud
está pendiente. Administración revisa la solicitud desde `/admin/guias`; al aprobarla
se activa la cuenta, se asigna el rol de guía y el perfil (nombre, correo, placa,
modelo, año y URL de la foto del vehículo) se guarda en `guideProfiles`. Entonces
puede iniciar sesión en `/guia` para consultar las solicitudes de visita guiada. Si se
rechaza, se elimina la cuenta deshabilitada. Las solicitudes se guardan en
`guideApplications`; las visitas se guardan en `guidedVisitRequests` y sus horarios
se reservan de forma atómica para evitar duplicados.

Los guías aprobados pueden aceptar un viaje pendiente desde su panel; la aceptación
se guarda de forma atómica y registra el nombre y correo del guía. Cada turista
autenticado puede consultar `/mis-viajes` desde el menú de su cuenta para ver sus
solicitudes pendientes, aceptadas y pasadas, junto con los datos del guía que aceptó
cualquier viaje.

Los correos al administrador al recibir una solicitud de guía o negocio, y al
solicitante cuando se aprueba o rechaza su solicitud, usan la API de Resend.
Configura en el servidor `RESEND_API_KEY`, `EMAIL_FROM` (remitente verificado en
Resend) y `GUIDE_APPLICATIONS_EMAIL` (destinatario de administración). Si el correo
falla, la solicitud o decisión queda guardada y la página muestra una advertencia;
el resultado de notificación de las decisiones también queda registrado para mostrar
al solicitante. Configura un remitente verificado en Resend antes de habilitar el
flujo para producción.

Las imágenes que se cargan desde el panel de destinos, el catálogo administrativo
de guías y el registro de guías se suben al servidor y se almacenan en Cloudinary.
Configura `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`
solo en el entorno del servidor. No expongas el secreto con variables
`NEXT_PUBLIC_*`.

El mapa y la validación del punto usan el límite municipal de Metepec de
[geoBoundaries](https://www.geoboundaries.org/), obtenido del conjunto de municipios
de México del World Bank (2012), con licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
