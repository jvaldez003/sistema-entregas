# 📦 Sistema de Entregas — Recursos Tecnológicos

Sistema web para registrar la entrega de recursos tecnológicos en multicampus universitario.

---

## 🚀 GUÍA DE INSTALACIÓN PASO A PASO (sin conocimientos previos)

---

### PASO 1 — Crear cuenta en Supabase (base de datos gratis)

1. Ve a **https://supabase.com** → clic en **"Start your project"**
2. Inicia sesión con tu cuenta de **GitHub**
3. Clic en **"New project"**
4. Rellena:
   - **Name:** `sistema-entregas` (o el que quieras)
   - **Database Password:** escribe una contraseña segura (guárdala)
   - **Region:** elige `South America (São Paulo)` para menor latencia
5. Espera ~2 minutos mientras se crea el proyecto

---

### PASO 2 — Crear la base de datos (tabla de registros)

1. En tu proyecto de Supabase ve a **SQL Editor** (ícono de terminal en la barra izquierda)
2. Clic en **"New query"**
3. Copia **todo el contenido** del archivo `supabase_schema.sql` y pégalo
4. Clic en **"Run"** (botón verde)
5. Verás "Success" — ¡la base de datos está lista!

---

### PASO 3 — Obtener las claves de Supabase

1. En tu proyecto de Supabase ve a **Settings** → **API**
2. Copia estos dos valores:
   - **Project URL** → algo como `https://abcxyz.supabase.co`
   - **anon / public key** → una cadena larga que empieza con `eyJ...`
3. Guárdalos, los necesitarás en el Paso 5

---

### PASO 4 — Subir el código a GitHub

1. Ve a **https://github.com** → clic en **"+"** → **"New repository"**
2. Nombre: `sistema-entregas` → clic en **"Create repository"**
3. En tu computador, abre una terminal en la carpeta del proyecto y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "primer commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/sistema-entregas.git
   git push -u origin main
   ```
   *(Reemplaza `TU_USUARIO` con tu usuario de GitHub)*

> **Alternativa sin terminal:** En GitHub, usa el botón **"uploading an existing file"** y arrastra toda la carpeta del proyecto.

---

### PASO 5 — Desplegar en Vercel (hosting gratis)

1. Ve a **https://vercel.com** → **"Sign up"** → inicia sesión con **GitHub**
2. Clic en **"Add New Project"**
3. Selecciona el repositorio `sistema-entregas`
4. En la sección **"Environment Variables"** agrega:
   | Nombre                  | Valor                          |
   |-------------------------|--------------------------------|
   | `VITE_SUPABASE_URL`     | tu Project URL de Supabase     |
   | `VITE_SUPABASE_ANON_KEY`| tu anon key de Supabase        |
5. Clic en **"Deploy"**
6. En ~2 minutos tendrás una URL pública como `sistema-entregas.vercel.app`

---

### PASO 6 — Agregar el logo para el reporte de impresión

1. Copia el archivo del logo institucional y renómbralo **`logo_candelaria.png`**
2. Colócalo en la carpeta **`public/`** del proyecto
3. Haz commit y push a GitHub — Vercel se actualizará automáticamente

---

### PASO 7 — Crear usuarios para tus compañeros

1. En Supabase ve a **Authentication** → **Users**
2. Clic en **"Add user"** → **"Create new user"**
3. Ingresa el correo y contraseña de cada compañero
4. Comparte las credenciales con cada uno
5. Ellos ingresan en `tu-url.vercel.app` con usuario y contraseña

---

## 💰 Costos (todo GRATIS)

| Servicio | Plan gratuito incluye          |
|----------|-------------------------------|
| Supabase | 500MB BD, 50k usuarios, 2GB storage |
| Vercel   | Hosting ilimitado, deploys ilimitados |
| GitHub   | Repositorios privados gratis  |

Para el volumen de este sistema (registros de texto, 6-20 usuarios) **nunca pagarás nada**.

---

## 📁 Estructura del proyecto

```
sistema-entregas/
├── public/
│   └── logo_candelaria.png   ← pon aquí el logo
├── src/
│   ├── components/
│   │   ├── Layout.jsx         ← barra lateral + navegación
│   │   └── Layout.module.css
│   ├── lib/
│   │   └── supabase.js        ← conexión a la BD
│   ├── pages/
│   │   ├── LoginPage.jsx      ← inicio de sesión
│   │   ├── DashboardPage.jsx  ← resumen y estadísticas
│   │   ├── NuevaEntregaPage.jsx ← registrar entrega
│   │   ├── RegistrosPage.jsx  ← ver / buscar / eliminar
│   │   ├── ReportePage.jsx    ← generar reporte imprimible
│   │   └── AdminPage.jsx      ← gestión de usuarios
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql        ← ejecutar en Supabase
├── .env.example               ← plantilla de variables de entorno
└── package.json
```

---

## 🖨️ Cómo generar el reporte mensual

1. Entra al sistema → sección **"Reporte"**
2. Selecciona el mes y año
3. Clic en **"Buscar registros"**
4. Escribe observaciones generales si aplica
5. Clic en **"⎙ Imprimir / Guardar PDF"**
6. Se abre el formato exacto con encabezado institucional, tabla, observaciones y firma
7. En el diálogo de impresión elige **"Guardar como PDF"** para guardar digitalmente

---

## ❓ Preguntas frecuentes

**¿Los datos se pueden perder?**
No. Supabase hace backups automáticos diarios en el plan gratuito.

**¿Qué pasa si alguien se equivoca en un registro?**
Puede eliminarlo desde la sección "Registros" y volver a registrarlo.

**¿Puedo acceder desde el celular?**
Sí, el sistema es responsive y funciona en cualquier navegador.

**¿Cómo actualizo el sistema con mejoras?**
Solo haces cambios en el código y un `git push`. Vercel actualiza automáticamente en 2 minutos.
