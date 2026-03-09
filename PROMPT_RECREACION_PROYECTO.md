# Prompt para Recrear Dashboard Stats

## Descripción General del Proyecto

Crea un **Dashboard de Métricas** completo con sistema de autenticación, visualización de estadísticas de llamadas y mensajes de WhatsApp, historial de llamadas con transcripciones, sistema de planes/pricing, y flujo de recuperación de contraseña.

**Tecnología**: HTML5, CSS3 y JavaScript vanilla (sin frameworks). Arquitectura modular usando el patrón IIFE (Immediately Invoked Function Expression).

---

## Estructura de Archivos a Crear

```
/
├── index.html                    # Página principal (login + dashboard)
├── reset-password.html           # Página de restablecimiento de contraseña
├── style.css                     # Estilos globales (TÚ LO DISEÑAS)
├── app.js                        # Punto de entrada de la aplicación
├── types.js                      # Definiciones de tipos JSDoc
├── config/
│   └── constants.js              # Configuración centralizada
├── services/
│   ├── ApiClient.js              # Cliente HTTP para APIs
│   ├── AuthenticationService.js  # Servicio de autenticación
│   └── SessionManager.js         # Gestor de sesiones
├── utils/
│   ├── DomHelper.js              # Utilidades de manipulación DOM
│   ├── InputValidator.js         # Validación de formularios
│   └── RateLimiter.js            # Limitación de intentos de login
└── modules/
    ├── AuthModule.js             # Módulo de autenticación y vistas
    ├── DashboardModule.js        # Módulo de métricas y grabaciones
    ├── CallsModule.js            # Módulo de historial de llamadas
    ├── TabsModule.js             # Módulo de navegación por tabs
    ├── PricingModule.js          # Módulo de planes y upgrade
    └── TranscriptFormatter.js    # Formateador de transcripciones
```

---

## Vistas Principales

### 1. Vista de Login (`#login-view`)

**Elementos requeridos:**
- Formulario de login con campos:
  - `#username` - Input de texto para usuario
  - `#password` - Input de password
  - `#btn-submit` - Botón de envío
- Enlace "¿Olvidaste tu contraseña?" (`#forgot-password-link`)
- Contenedor de errores (`#login-error`)

**Funcionalidades:**
- Validación de credenciales antes de enviar
- Sanitización de inputs (eliminar espacios)
- Sistema de rate limiting: máximo 5 intentos, bloqueo de 15 minutos
- Mostrar intentos restantes al fallar
- Bypass de login configurable para modo desarrollo

---

### 2. Modal de Recuperación de Contraseña (`#forgot-password-modal`)

**Elementos requeridos:**
- Formulario `#forgot-password-form` con:
  - `#recovery-username` - Input para nombre de usuario
  - Botón para enviar email
  - Botón para cancelar (`#cancel-recovery`)
- Contenedor de mensajes (`#recovery-message`)

**Funcionalidades:**
- Enviar solicitud POST al endpoint de recuperación
- Construir URL base para reset: `window.location.origin + /reset-password.html`
- Payload: `{ username: string, resetBaseUrl: string }`
- Mostrar mensaje de éxito/error
- Cerrar modal automáticamente tras 5 segundos si es exitoso

---

### 3. Vista de Dashboard (`#dashboard-view`)

#### 3.1 Sidebar de Navegación

**Elementos:**
- Logo "AA" con texto "AlemanAlonso"
- Links de navegación con iconos:
  - "Resumen General" (`data-tab="resumen"`) - activo por defecto
  - "Historial de Llamadas" (`data-tab="llamadas"`)
- Botón de logout (`data-action="logout"`)

#### 3.2 Header Principal

**Elementos:**
- Título dinámico `#welcome-user` que muestre "Panel de [username]"
- Badge del plan actual (`#current-plan-badge`)
- Botón "Mejorar Plan" (`data-action="open-pricing-modal"`)
- Botón "Refrescar" (`data-action="refresh-dashboard"`)

#### 3.3 Popup de Uso/Upgrade (`#usage-upgrade-popup`)

**Funcionalidades:**
- Se muestra cuando el uso de minutos supera umbrales:
  - 80-89%: nivel "warning"
  - 90-99%: nivel "critical"  
  - 100%+: nivel "over"
- Mensaje dinámico con porcentaje y minutos restantes
- Botón para abrir modal de pricing
- Botón para cerrar (dismiss)
- Guardar nivel dismissado en sessionStorage para no mostrar dos veces

---

### 4. Tab Resumen General (`#tab-resumen`)

#### 4.1 Grid de Estadísticas (4 tarjetas)

| ID | Etiqueta | Tipo |
|----|----------|------|
| `#val-wa` | Mensajes Totales | Conversaciones WhatsApp |
| `#val-in` | Llamadas Entrantes | Número |
| `#val-out` | Llamadas Salientes | Número |
| `#val-mins` | Tiempo de Llamadas | Formato: "Xh Ymin Zseg" |

**Formato de tiempo de llamadas:**
- Convertir minutos decimales a horas/minutos/segundos
- Ejemplo: 125.5 minutos → "2h 5min 30seg"
- Si hay horas, no mostrar segundos
- Si el valor es 0, mostrar "0min"

#### 4.2 Sección de Grabaciones Recientes (`#recordings-list`)

**Para cada grabación mostrar:**
- Fecha formateada en español (dd/mm/yyyy, hh:mm)
- Reproductor de audio HTML5 con controles
- Transcripción del audio

---

### 5. Tab Historial de Llamadas (`#tab-llamadas`)

**Tabla `#calls-table` con columnas:**
| Columna | Campo | Notas |
|---------|-------|-------|
| Fecha | `date` o `start_timestamp` o `created_at` | Formato: dd/mm/yyyy |
| Hora | (misma fuente) | Formato: hh:mm |
| Teléfono | `phone` o `from_number` o `to_number` | - |
| Duración | `duration_ms` | Formato: m:ss |
| Estado | `status` o `call_status` | Badge con colores |
| Grabación | `recording_url` | Reproductor audio |
| Transcripción | `transcript` | Botón "Ver" si existe |

**Estados de llamada y sus labels:**
```
completed/ended/answered → "Completada/Terminada/Contestada" (verde)
missed/no-answer → "Perdida/Sin respuesta" (naranja)
failed/busy → "Fallida/Ocupado" (rojo)
in-progress/ringing → "En curso/Sonando" (azul)
```

**Formato de duración:**
- Convertir milisegundos a formato `m:ss`
- Ejemplo: 125000ms → "2:05"

---

### 6. Modal de Transcripción (`#transcript-modal`)

**Elementos:**
- Header con título y botón cerrar (`data-action="close-transcript-modal"`)
- Cuerpo `#transcript-modal-body` con la transcripción formateada

**Cierre:**
- Click en botón X
- Click fuera del modal
- Tecla Escape

---

### 7. Modal de Pricing (`#pricing-modal`)

**Elementos:**
- Header con título "Mejora tu plan"
- Banner CTA `#upgrade-cta-banner` mostrando diferencia de minutos
- Grid de tarjetas de planes `#plans-grid`

**Para cada plan mostrar:**
- Nombre del plan (ej: "Starter", "Professional")
- Badge "Recomendado" si aplica
- Precio con período (ej: "595€/mes")
- Comparación con plan actual (ej: "+2000 min vs tu plan actual")
- Lista de features/beneficios con checkmarks
- CTA button:
  - Si es plan actual: botón deshabilitado "Plan actual"
  - Si no: enlace a WhatsApp con mensaje pre-rellenado

**Mensaje de WhatsApp para upgrade:**
```
Hola, quiero mejorar mi plan del Dashboard.
Usuario: [username]
Plan actual: [plan_actual]
Plan objetivo: [plan_objetivo]
Me interesa activar el upgrade cuanto antes.
```

---

### 8. Página Reset Password (`reset-password.html`)

**Parámetros URL requeridos:**
- `token` o `reset_token` - Token de validación
- `user` o `username` - Nombre de usuario

**Estados de la página:**
1. **Formulario** (si hay token y username válidos):
   - Input nueva contraseña con toggle show/hide
   - Indicador de fortaleza de contraseña (weak/medium/strong)
   - Input confirmar contraseña con toggle
   - Botón submit

2. **Error** (si falta token o username, o token inválido):
   - Icono de error
   - Mensaje "Enlace Inválido"
   - Link para volver al login

3. **Éxito** (tras resetear correctamente):
   - Icono de success
   - Mensaje "¡Contraseña Actualizada!"
   - Link para ir a iniciar sesión

**Validaciones:**
- Mínimo 4 caracteres
- Ambas contraseñas deben coincidir

**Fortaleza de contraseña:**
- Débil: < 2 puntos
- Media: 2-3 puntos
- Fuerte: > 3 puntos

Criterios (+1 punto cada uno):
- Longitud >= 4
- Longitud >= 8
- Mayúsculas Y minúsculas
- Números
- Caracteres especiales

---

## Configuración (`config/constants.js`)

```javascript
var AppConfig = {
    API_ENDPOINTS: {
        AUTHENTICATION: 'https://server.ewallia.com/webhook/e6404c0e-35be-4e26-889a-e7281879a213',
        TWILIO_STATS: 'https://dashboard-api-4813.twil.io/get-stats',
        TWILIO_CONVERSATIONS: 'https://dashboard-api-4813.twil.io/get-conversations',
        RETELL_CALLS: 'https://dashboard-api-4813.twil.io/get-retell-calls',
        REQUEST_PASSWORD_RESET: '',  // Configurar URL del webhook
        CONFIRM_PASSWORD_RESET: ''   // Configurar URL del webhook
    },

    RETELL_AGENT_ID: 'agent_1c27d89a3b88972d6ef93738f1',

    SECURITY: {
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION_MINUTES: 15,
        SESSION_DURATION_MINUTES: 60
    },

    VALIDATION: {
        USERNAME_MIN_LENGTH: 3,
        USERNAME_MAX_LENGTH: 50,
        PASSWORD_MIN_LENGTH: 4
    },

    STORAGE_KEYS: {
        SESSION: 'dashboard_session',
        LOGIN_ATTEMPTS: 'login_attempts'
    },

    BILLING: {
        CURRENT_PLAN_KEY: 'starter',
        RECOMMENDED_PLAN_KEY: 'professional',
        WHATSAPP_BASE_URL: 'https://wa.me/',
        WHATSAPP_NUMBER: '34600111222',
        PLANS: [
            {
                key: 'starter',
                displayName: 'Starter',
                priceLabel: '595€',
                periodLabel: '/mes',
                minutesIncluded: 1000,
                features: [
                    '1.000 min incluidos',
                    '1 Agente',
                    'Mantenimiento',
                    'Soporte email'
                ]
            },
            {
                key: 'professional',
                displayName: 'Professional',
                priceLabel: '1.495€',
                periodLabel: '/mes',
                minutesIncluded: 3000,
                features: [
                    '3.000 min incluidos',
                    '2 Agentes',
                    'Agenda integrada',
                    'Soporte prioritario'
                ]
            },
            {
                key: 'business',
                displayName: 'Business',
                priceLabel: '2.495€',
                periodLabel: '/mes',
                minutesIncluded: 5000,
                features: [
                    '5.000 min incluidos',
                    'CRM + WhatsApp',
                    'Flujos avanzados',
                    'Soporte directo'
                ]
            },
            {
                key: 'enterprise',
                displayName: 'Enterprise',
                priceLabel: '4.500€',
                periodLabel: '/mes',
                minutesIncluded: 10000,
                features: [
                    '10.000 min incluidos',
                    'Agentes ilimitados',
                    'API / Custom',
                    'Account Manager'
                ]
            }
        ]
    },

    DEV_MODE: {
        BYPASS_LOGIN: true,        // Cambiar a false en producción
        BYPASS_VALIDATION: true    // Cambiar a false en producción
    }
};
```

---

## APIs y Respuestas Esperadas

### 1. Autenticación (POST)

**Request:**
```json
{
    "usuario": "string",
    "clave": "string"
}
```

**Response exitosa:**
```json
{
    "status": "success"
}
```

**Response error:**
```json
{
    "status": "error",
    "message": "Credenciales incorrectas"
}
```

---

### 2. Estadísticas de Dashboard (GET)

**Response:**
```json
{
    "whatsappConversaciones": 150,
    "calls": {
        "inbound": 45,
        "outbound": 32,
        "minutes": 125.5
    }
}
```

---

### 3. Llamadas con Grabaciones (GET)

**Response:**
```json
{
    "data": [
        {
            "agent_id": "agent_1c27d89a3b88972d6ef93738f1",
            "date": "2024-01-15T10:30:00Z",
            "start_timestamp": 1705311000000,
            "phone": "+34612345678",
            "from_number": "+34612345678",
            "duration_ms": 125000,
            "status": "completed",
            "recording_url": "https://example.com/audio.wav",
            "transcript": "[{\"role\":\"agent\",\"content\":\"Hola, ¿en qué puedo ayudarle?\"},{\"role\":\"user\",\"content\":\"Quiero información\"}]"
        }
    ]
}
```

**Filtrado:** Solo mostrar llamadas cuyo `agent_id` coincida con `AppConfig.RETELL_AGENT_ID`.

---

### 4. Solicitar Reset Password (POST)

**Request:**
```json
{
    "username": "string",
    "resetBaseUrl": "https://example.com/reset-password.html"
}
```

**Response exitosa:**
```json
{
    "success": true
}
```

---

### 5. Confirmar Reset Password (POST)

**Request:**
```json
{
    "username": "string",
    "usuario": "string",
    "token": "string",
    "newPassword": "string",
    "nueva_clave": "string"
}
```

**Response exitosa:**
```json
{
    "success": true
}
```

---

## Formateador de Transcripciones

Debe soportar múltiples formatos:

### Formato 1: Array JSON de Retell
```json
[
    {"role": "agent", "content": "Hola, ¿en qué puedo ayudarle?"},
    {"role": "user", "content": "Quiero información"}
]
```

### Formato 2: Texto con prefijos
```
Agent: Hola, ¿en qué puedo ayudarle?
User: Quiero información
```

### Formato 3: Palabras individuales
```json
[
    {"role": "agent", "words": [{"word": "Hola"}, {"word": "buenos"}, {"word": "días"}]}
]
```

**Normalización de roles:**
- `agent`, `ai`, `bot`, `asistente`, `chatbot`, `assistant`, `agente` → "Chatbot"
- Todo lo demás → "Cliente"

**Renderizado:**
- Burbujas de chat estilo WhatsApp/iMessage
- `agent` → alineados a la izquierda
- `user` → alineados a la derecha
- Cada burbuja debe tener etiqueta del speaker y el texto

---

## Gestión de Sesiones

**sessionStorage** para datos de sesión:
```javascript
{
    user: { username: "string" },
    createdAt: timestamp,
    expiresAt: timestamp
}
```

**localStorage** para rate limiting:
```javascript
{
    count: number,
    lockoutUntil: timestamp | null
}
```

**Comportamiento:**
- Sesión dura 60 minutos
- Se destruye automáticamente al cerrar navegador (sessionStorage)
- Rate limit persiste en localStorage

---

## Utilidades Requeridas

### DomHelper
- `showElement(element, displayType)` - Mostrar elemento
- `hideElement(element)` - Ocultar elemento
- `showErrorMessage(container, message)` - Mostrar error
- `hideErrorMessage(container)` - Ocultar error
- `getInputValue(elementId)` - Obtener valor de input
- `setTextContent(elementId, text)` - Establecer texto

### InputValidator
- `sanitizeString(input)` - Limpiar espacios
- `validateLoginCredentials(username, password)` - Validar credenciales

### RateLimiter
- `checkLockoutStatus()` - Verificar si está bloqueado
- `recordFailedAttempt()` - Registrar intento fallido
- `resetAttempts()` - Resetear contador
- `getRemainingAttempts()` - Obtener intentos restantes

---

## Orden de Carga de Scripts (index.html)

```html
<!-- Definiciones de tipos -->
<script src="types.js"></script>

<!-- Configuración -->
<script src="config/constants.js"></script>

<!-- Servicios -->
<script src="services/ApiClient.js"></script>
<script src="services/SessionManager.js"></script>
<script src="services/AuthenticationService.js"></script>

<!-- Utilidades -->
<script src="utils/InputValidator.js"></script>
<script src="utils/RateLimiter.js"></script>
<script src="utils/DomHelper.js"></script>

<!-- Módulos -->
<script src="modules/TranscriptFormatter.js"></script>
<script src="modules/DashboardModule.js"></script>
<script src="modules/CallsModule.js"></script>
<script src="modules/PricingModule.js"></script>
<script src="modules/TabsModule.js"></script>
<script src="modules/AuthModule.js"></script>

<!-- App principal -->
<script src="app.js"></script>
```

---

## Notas de Implementación

1. **Patrón de módulos**: Usar IIFE para encapsular, exponer API pública via `return {}`.

2. **Clase `is-hidden`**: Usada para ocultar elementos. Combinar con `style.display` para mayor control.

3. **Navegación por tabs**: La clase `active` controla qué tab se muestra. Al seleccionar tab "llamadas", cargar automáticamente el historial.

4. **XSS Prevention**: La función `escapeHtml()` debe sanitizar todo texto dinámico antes de insertarlo en el DOM.

5. **Responsive**: Las columnas "Grabación" y "Transcripción" deben ocultarse en móvil con clase `hide-mobile`.

6. **Idioma**: Todo el UI en español (es-ES).

7. **Logs de desarrollo**: Usar `console.warn` para advertencias de modo desarrollo.

---

## NOTA IMPORTANTE

**El CSS y HTML visual son libres de diseño.** El diseño estético queda a tu creatividad. Este prompt solo define la estructura funcional, IDs de elementos, y lógica de negocio que debe funcionar igual.

Asegúrate de que:
- Todos los IDs mencionados existan en el HTML
- Todos los `data-*` attributes estén presentes
- La lógica de todos los módulos funcione correctamente
- Las APIs se llamen con los payloads correctos
