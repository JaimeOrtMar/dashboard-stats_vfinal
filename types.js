/**
 * Definiciones de tipos para el Dashboard.
 * Este archivo define las estructuras de datos usadas en toda la aplicaciÃ³n.
 *
 * @file types.js
 */

// =============================================================================
// CONFIGURACIÃ“N
// =============================================================================

/**
 * @typedef {Object} ApiEndpoints
 * @property {string} AUTHENTICATION - URL del webhook de autenticaciÃ³n
 * @property {string} TWILIO_STATS - URL de estadÃ­sticas de Twilio
 * @property {string} TWILIO_CONVERSATIONS - URL de conversaciones de WhatsApp
 * @property {string} RETELL_CALLS - URL de grabaciones y transcripciones de Retell AI
 * @property {string} REQUEST_PASSWORD_RESET - URL del webhook para solicitar recuperaciÃ³n de contraseÃ±a
 * @property {string} CONFIRM_PASSWORD_RESET - URL del webhook para confirmar nueva contraseÃ±a
 */

/**
 * @typedef {Object} SecurityConfig
 * @property {number} MAX_LOGIN_ATTEMPTS - MÃ¡ximo de intentos de login
 * @property {number} LOCKOUT_DURATION_MINUTES - DuraciÃ³n del bloqueo en minutos
 * @property {number} SESSION_DURATION_MINUTES - DuraciÃ³n de la sesiÃ³n en minutos
 */

/**
 * @typedef {Object} ValidationConfig
 * @property {number} USERNAME_MIN_LENGTH - Longitud mÃ­nima del usuario
 * @property {number} USERNAME_MAX_LENGTH - Longitud mÃ¡xima del usuario
 * @property {number} PASSWORD_MIN_LENGTH - Longitud mÃ­nima de la contraseÃ±a
 */

/**
 * @typedef {Object} StorageKeys
 * @property {string} SESSION - Clave para datos de sesiÃ³n
 * @property {string} LOGIN_ATTEMPTS - Clave para intentos de login
 */

/**
 * @typedef {Object} DevModeConfig
 * @property {boolean} BYPASS_LOGIN - Bypass del login (permite acceso sin credenciales vÃ¡lidas)
 * @property {boolean} BYPASS_VALIDATION - Bypass de validaciÃ³n de credenciales
 */
/**
 * @typedef {'starter'|'professional'|'business'|'enterprise'} PlanKey
 */

/**
 * @typedef {Object} PlanDefinition
 * @property {PlanKey} key - Identificador del plan
 * @property {string} displayName - Nombre visible del plan
 * @property {string} priceLabel - Precio del plan (ej: 1.495€)
 * @property {string} periodLabel - Periodo de cobro (ej: /mes)
 * @property {number} minutesIncluded - Minutos incluidos en el plan
 * @property {string[]} features - Lista de beneficios del plan
 */

/**
 * @typedef {Object} BillingConfig
 * @property {PlanKey} CURRENT_PLAN_KEY - Plan actual configurado
 * @property {PlanKey} RECOMMENDED_PLAN_KEY - Plan recomendado para upgrade
 * @property {string} WHATSAPP_BASE_URL - URL base de WhatsApp
 * @property {string} WHATSAPP_NUMBER - Numero de WhatsApp comercial
 * @property {PlanDefinition[]} PLANS - Catalogo de planes
 */

/**
 * @typedef {Object} AppConfiguration
 * @property {ApiEndpoints} API_ENDPOINTS - Endpoints de APIs
 * @property {string} RETELL_AGENT_ID - ID del agente de Retell AI
 * @property {SecurityConfig} SECURITY - ConfiguraciÃ³n de seguridad
 * @property {ValidationConfig} VALIDATION - Reglas de validaciÃ³n
 * @property {StorageKeys} STORAGE_KEYS - Claves de almacenamiento
 * @property {BillingConfig} BILLING - Configuracion comercial de planes y upgrade
 * @property {DevModeConfig} [DEV_MODE] - ConfiguraciÃ³n de modo desarrollo (opcional)
 */

// =============================================================================
// AUTENTICACIÃ“N Y SESIÃ“N
// =============================================================================

/**
 * @typedef {Object} UserData
 * @property {string} username - Nombre de usuario
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Si la autenticaciÃ³n fue exitosa
 * @property {string} message - Mensaje descriptivo
 * @property {UserData} [userData] - Datos del usuario (solo si success=true)
 */

/**
 * @typedef {Object} SessionData
 * @property {UserData} user - Datos del usuario
 * @property {number} createdAt - Timestamp de creaciÃ³n
 * @property {number} expiresAt - Timestamp de expiraciÃ³n
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Si las credenciales son vÃ¡lidas
 * @property {string[]} errors - Array de mensajes de error
 * @property {string} sanitizedUsername - Usuario saneado
 * @property {string} sanitizedPassword - ContraseÃ±a saneada
 */

/**
 * @typedef {Object} LockoutStatus
 * @property {boolean} isLocked - Si el usuario estÃ¡ bloqueado
 * @property {number} remainingMinutes - Minutos restantes de bloqueo
 */

/**
 * @typedef {Object} AttemptState
 * @property {number} count - NÃºmero de intentos fallidos
 * @property {number|null} lockoutUntil - Timestamp de fin de bloqueo
 */

// =============================================================================
// TWILIO / WHATSAPP
// =============================================================================

/**
 * @typedef {Object} WhatsAppMessage
 * @property {string} sid - ID Ãºnico del mensaje en Twilio
 * @property {'inbound'|'outbound'} direction - DirecciÃ³n del mensaje
 * @property {string} body - Contenido del mensaje
 * @property {string} date - Fecha ISO del mensaje
 * @property {string} status - Estado del mensaje (received, delivered, read, etc.)
 */

/**
 * @typedef {Object} Conversation
 * @property {string} phoneNumber - NÃºmero de telÃ©fono del contacto
 * @property {string} lastMessageDate - Fecha del Ãºltimo mensaje
 * @property {WhatsAppMessage[]} messages - Array de mensajes
 */

/**
 * @typedef {Object} ConversationsResponse
 * @property {boolean} success - Si la peticiÃ³n fue exitosa
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
 * @property {string} date - Fecha de la grabaciÃ³n
 * @property {string} [audioUrl] - URL del audio
 * @property {string} [transcription] - TranscripciÃ³n del audio
 */

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * @typedef {Object} ApiErrorResponse
 * @property {'error'} status - Estado de error
 * @property {string} message - Mensaje de error
 */

// Exportar vacÃ­o para que el archivo sea tratado como mÃ³dulo
// (necesario para que los tipos sean globales)

