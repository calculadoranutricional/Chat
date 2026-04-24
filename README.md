# Gemini Chat Pro - Frosted Glass Edition

Chat de IA fluido y minimalista impulsado por **Google Gemini** y **Firebase**.

## Características
- 🚀 **Autenticación con Google**: Sin contraseñas, usa tu cuenta de Google directamente.
- ❄️ **Diseño Frosted Glass**: Interfaz moderna y elegante con efectos de desenfocado.
- 🧠 **Gemini 3 Flash**: Respuestas rápidas e inteligentes.
- ☁️ **Persistencia en la Nube**: Tus chats se guardan de forma segura en Firestore.
- ⚡ **CI/CD Ready**: Configurado para GitHub Actions.

## Configuración Local

1. Clona el repositorio.
2. Instala dependencias: `npm install`.
3. Crea un archivo `.env` basado en `.env.example` y agrega tu `GEMINI_API_KEY`.
4. Ejecuta en desarrollo: `npm run dev`.

## Despliegue en GitHub Actions
Asegúrate de agregar `GEMINI_API_KEY` en los secretos de tu repositorio de GitHub para que la compilación pase correctamente.
