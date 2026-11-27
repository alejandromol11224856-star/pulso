# Pulso · Finanzas

App de finanzas personales para el celular (Android) y la compu. Está hecha para ser **lo más simple y automática posible**: cuentas, gastos, ingresos, pagos fijos, cuotas, pagos en dólares, plan de ahorro y un espacio aparte para tu negocio.

**Publicada:** https://pulso-finanzas-three.vercel.app · **App Android:** [Pulso.apk](https://pulso-finanzas-three.vercel.app/Pulso.apk) (código en el repo `pulso-android`)

## Qué hace

- **Inicio simple:** cuánto tenés, cuánto queda libre después de pagar lo del mes, y un botón **“Poner al día mis saldos”**. Escribís el saldo real y la diferencia se anota como “Gastos sin anotar”.
- **Cargar pagos solos (Android):** lee los avisos de Brubank, Mercado Pago, Ualá y otros bancos, y anota cada gasto o ingreso solo (⚡ en Movimientos). Las promos se ignoran. Solo mira esas apps y todo queda en el celular.
- **Pendientes:** pagos fijos, **pagos en dólares** (Duolingo US$ 12: estima los pesos con el dólar tarjeta y te pregunta cuánto te cobraron), sueldo y compras en cuotas. Te avisa el día antes.
- **Espacios aparte:** Personal y Mi negocio (o los que quieras). Cada uno tiene sus cuentas, sus categorías (Ventas, Mercadería, Publicidad…) y su ganancia del mes. Arriba elegís cuál ver, o todo junto.
- **Pagarte un sueldo:** pasás plata del negocio a lo personal. Para el negocio cuenta como “te pagaste”, y para vos como ingreso.
- **Plan de ahorro:** elegís apartar 10, 20 o 30% de lo que entra. Cuando cobrás te propone apartarlo. Las metas con fecha te dicen cuánto ahorrar por mes.
- **Resumen del mes:** cuánto entró, cuánto gastaste, cuánto apartaste, en qué se fue, cómo le fue al negocio y un consejo para el mes que viene.
- **Sincronización celular ↔ compu:** cifrada en el dispositivo (AES-256-GCM con clave de un código secreto). Se guarda en Vercel Blob privado y se combinan los cambios de los dos lados.
- **Reloj:** `reloj.html` simula una Xiaomi Smart Band 10 Pro con los mismos datos.

## Estructura

```
index.html            estructura de la app
styles.css            diseño (claro/oscuro, celular/escritorio)
app.js                toda la lógica (datos, cálculos, pantallas, sincronización)
api/sync.js           guarda el archivo cifrado en Vercel Blob
reloj.html/.css/.js   simulación de la pulsera
sw.js                 funciona sin internet
img/                  íconos 3D (Fluent Emoji, MIT) y logos
```

Hecha con HTML, CSS y JavaScript, sin frameworks. Los montos se guardan en centavos, y los datos van en `localStorage` (`pulso.v1`).

## Correrla en la compu

```
npx serve . -l 5210
```

Y entrá a http://localhost:5210.

## Publicar

```
npx vercel deploy --prod
```

El token de Vercel queda en `.env.local`, que **nunca** se sube al repo.
