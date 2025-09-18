# Relatix: Juego Interactivo de Gramática Inglesa

Este es un proyecto de Next.js creado en Firebase Studio.

## Descripción

Relatix es un juego educativo diseñado para ayudar a los estudiantes a dominar el uso de los pronombres relativos en inglés como "that", "who" y "which" a través de una experiencia interactiva y divertida.

## Características

- **Niveles de Dificultad:** Múltiples niveles (fácil, medio, difícil) para adaptarse a diferentes grados de conocimiento.
- **Tabla de Clasificación Global:** Los puntajes se guardan en la nube usando Firebase Firestore, permitiendo a los jugadores competir globalmente.
- **Panel de Profesor:** Una vista de administrador para revisar el rendimiento y las respuestas de todos los jugadores.
- **Despliegue en Firebase Hosting:** La aplicación está configurada para desplegarse como un sitio estático en el plan gratuito de Firebase.

### Despliegue Manual

Para desplegar una nueva versión, ejecuta los siguientes comandos en tu terminal:

1.  `npm run build` (Esto genera el sitio estático en la carpeta `out`)
2.  `firebase deploy --only hosting` (Esto sube el contenido de `out` a Firebase)

Para empezar, echa un vistazo al componente principal en `src/app/page.tsx`.
