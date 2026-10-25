# Asistente 24 h (Engrana)

- Página del chat: `https://engranaia.com/asistente/?c=<cliente>` (lee `clientes/<cliente>.json`).
- Motor: proyecto de Apps Script **«Engrana asistentes»** (cuenta sergiocarrovadillo, script.google.com/u/1),
  id `1haHazN9sDWRUGHn1UPr7pWXxGDEptL_lGrKuydVSeetj3pSVLPbNSgBf`, código = `apps-script.gs`.
  Hoja **«Engrana · Asistentes»**: pestañas `clientes` (alta y límites), `conversaciones` y `solicitudes`.
- IA: Gemini, plan gratuito (clave `GEMINI_API_KEY` en Propiedades del script; nunca en el repo).
  Ojo: en el plan gratuito Google puede usar los textos para mejorar sus modelos. Por eso nombre y
  teléfono van por formulario y nunca llegan a Gemini, y se borran teléfonos y correos del chat.
  Con un cliente de pago, pasar a clave de pago (céntimos al mes).

## Alta de un cliente
1. `clientes/<id>.json` con `nombre`, `tipo`, `ciudad`, `ui` (color, iniciales, bienvenida, chips, tratamientos)
   e `info` (todo lo que puede contar el asistente: precios, horario, normas…). Push.
2. Fila en la pestaña `clientes`: `id | correo donde le llegan las solicitudes | si | 300`.
3. Enlace para Instagram, Google y la respuesta automática de WhatsApp Business:
   `https://engranaia.com/asistente/?c=<id>`.

## Cambiar el código del motor
Editor → pegar → guardar → Implementar → Gestionar implementaciones → editar → Versión nueva
(la URL /exec no cambia).
