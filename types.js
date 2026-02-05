/**
 * Definiciones de tipos para el Dashboard.
 * Este archivo define las estructuras de datos usadas en toda la aplicación.
 *
 * @file types.js
 */

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/**
 * @typedef {Object} ApiEndpoints
 * @property {string} AUTHENTICATION - URL del webhook de autenticación
 * @property {string} TWILIO_STATS - URL de estadísticas de Twilio
 * @property {string} TWILIO_CONVERSATIONS - URL de conversaciones de WhatsApp
 * @property {string} RETELL_CALLS - URL de grabaciones y transcripciones de Retell AI
 * @property {string} REQUEST_PASSWORD_RESET - URL del webhook para solicitar recuperación de contraseña
 * @property {string} CONFIRM_PASSWORD_RESET - URL del webhook para confirmar nueva contraseña
 */

/**
 * @typedef {Object} SecurityConfig
 * @property {number} MAX_LOGIN_ATTEMPTS - Máximo de intentos de login
 * @property {number} LOCKOUT_DURATION_MINUTES - Duración del bloqueo en minutos
 * @property {number} SESSION_DURATION_MINUTES - Duración de la sesión en minutos
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {number} USERNAME_MIN_LENGTH - Longitud mínima del usuario
 * @property {number} USERNAME_MAX_LENGTH - Longitud máxima del usuario
 * @property {number} PASSWORD_MIN_LENGTH - Longitud mínima de la contraseña
 */

/**
 * @typedef {Object} StorageKeys
 * @property {string} SESSION - Clave para datos de sesión
 * @property {string} LOGIN_ATTEMPTS - Clave para intentos de login
 */

/**
 * @typedef {Object} DevModeConfig
 * @property {boolean} BYPASS_LOGIN - Bypass del login (permite acceso sin credenciales válidas)
 * @property {boolean} BYPASS_VALIDATION - Bypass de validación de credenciales
 */

/**
 * @typedef {Object} AppConfiguration
 * @property {ApiEndpoints} API_ENDPOINTS - Endpoints de APIs
 * @property {string} RETELL_AGENT_ID - ID del agente de Retell AI
 * @property {SecurityConfig} SECURITY - Configuración de seguridad
 * @property {ValidationConfig} VALIDATION - Reglas de validación
 * @property {StorageKeys} STORAGE_KEYS - Claves de almacenamiento
 * @property {DevModeConfig} [DEV_MODE] - Configuración de modo desarrollo (opcional)
 */

// =============================================================================
// AUTENTICACIÓN Y SESIÓN
// =============================================================================

/**
 * @typedef {Object} UserData
 * @property {string} username - Nombre de usuario
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Si la autenticación fue exitosa
 * @property {string} message - Mensaje descriptivo
 * @property {UserData} [userData] - Datos del usuario (solo si success=true)
 */

/**
 * @typedef {Object} SessionData
 * @property {UserData} user - Datos del usuario
 * @property {number} createdAt - Timestamp de creación
 * @property {number} expiresAt - Timestamp de expiración
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Si las credenciales son válidas
 * @property {string[]} errors - Array de mensajes de error
 * @property {string} sanitizedUsername - Usuario saneado
 * @property {string} sanitizedPassword - Contraseña saneada
 */

/**
 * @typedef {Object} LockoutStatus
 * @property {boolean} isLocked - Si el usuario está bloqueado
 * @property {number} remainingMinutes - Minutos restantes de bloqueo
 */

/**
 * @typedef {Object} AttemptState
 * @property {number} count - Número de intentos fallidos
 * @property {number|null} lockoutUntil - Timestamp de fin de bloqueo
 */

// =============================================================================
// TWILIO / WHATSAPP
// =============================================================================

/**
 * @typedef {Object} WhatsAppMessage
 * @property {string} sid - ID único del mensaje en Twilio
 * @property {'inbound'|'outbound'} direction - Dirección del mensaje
 * @property {string} body - Contenido del mensaje
 * @property {string} date - Fecha ISO del mensaje
 * @property {string} status - Estado del mensaje (received, delivered, read, etc.)
 */

/**
 * @typedef {Object} Conversation
 * @property {string} phoneNumber - Número de teléfono del contacto
 * @property {string} lastMessageDate - Fecha del último mensaje
 * @property {WhatsAppMessage[]} messages - Array de mensajes
 */

/**
 * @typedef {Object} ConversationsResponse
 * @property {boolean} success - Si la petición fue exitosa
 * @property {number} totalConversations - Total de conversaciones
 * @property {number} totalMessages - Total de mensajes
 * @property {Conversation[]} conversations - Array de conversaciones
 */

/**
 * @typedef {Object} CallsData
 * @property {number|string} inbound - Llamadas entrantes
 * @property {number|string} outbound - Llamadas salientes
 * @property {number|string} minutes - Minutos totales
 */

/**
 * @typedef {Object} DashboardData
 * @property {number|string} whatsappConversaciones - Total de conversaciones WhatsApp
 * @property {CallsData} calls - Datos de llamadas
 * @property {RecordingItem[]} [data] - Grabaciones (opcional)
 */

/**
 * @typedef {Object} RecordingItem
 * @property {string} date - Fecha de la grabación
 * @property {string} [audioUrl] - URL del audio
 * @property {string} [transcription] - Transcripción del audio
 */

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * @typedef {Object} ApiErrorResponse
 * @property {'error'} status - Estado de error
 * @property {string} message - Mensaje de error
 */

// Exportar vacío para que el archivo sea tratado como módulo
// (necesario para que los tipos sean globales)
