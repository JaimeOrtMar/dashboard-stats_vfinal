/**
 * Configuracion centralizada de la aplicacion.
 * Modifica estos valores segun el entorno (desarrollo, produccion).
 * 
 * @file constants.js
 * @description Contiene todas las constantes y configuraciones globales del sistema.
 */

/** @type {AppConfiguration} */
var AppConfig = {

    /**
     * Endpoints de las APIs externas.
     * Modificar segun el entorno de despliegue.
     */
    API_ENDPOINTS: {
        AUTHENTICATION: 'https://server.ewallia.com/webhook/e6404c0e-35be-4e26-889a-e7281879a213',
        TWILIO_STATS: 'https://dashboard-api-4813.twil.io/get-stats',
        /** Endpoint para obtener conversaciones de WhatsApp agrupadas. */
        TWILIO_CONVERSATIONS: 'https://dashboard-api-4813.twil.io/get-conversations',
        /** Endpoint para obtener grabaciones y transcripciones de Retell AI. */
        RETELL_CALLS: 'https://dashboard-api-4813.twil.io/get-retell-calls',
        /** Webhook de n8n para solicitar recuperación de contraseña (envía email). */
        REQUEST_PASSWORD_RESET: '',
        /** Webhook de n8n para confirmar nueva contraseña (desde el link del email). */
        CONFIRM_PASSWORD_RESET: ''
    },

    /**
     * ID del agente de Retell AI para filtrar llamadas.
     */
    RETELL_AGENT_ID: 'agent_1c27d89a3b88972d6ef93738f1',

    /**
     * Configuracion de seguridad del sistema.
     */
    SECURITY: {
        /** Numero maximo de intentos de login antes del bloqueo. */
        MAX_LOGIN_ATTEMPTS: 5,

        /* Duracion del bloqueo en minutos tras superar el limite de intentos. */
        LOCKOUT_DURATION_MINUTES: 15,

        /** Duracion de la sesion en minutos. */
        SESSION_DURATION_MINUTES: 60
    },

    /**
     * Reglas de validacion para los campos de entrada.
     */
    VALIDATION: {
        /** Longitud minima del nombre de usuario. */
        USERNAME_MIN_LENGTH: 3,

        /** Longitud maxima del nombre de usuario. */
        USERNAME_MAX_LENGTH: 50,

        /** Longitud minima de la contraseena. */
        PASSWORD_MIN_LENGTH: 4
    },

    /**
     * Claves utilizadas para almacenamiento local.
     */
    STORAGE_KEYS: {
        SESSION: 'dashboard_session',
        LOGIN_ATTEMPTS: 'login_attempts'
    },

    /**
     * Configuración de modo desarrollo.
     * ⚠️ IMPORTANTE: Cambiar a false en producción.
     */
    DEV_MODE: {
        /** Bypass del login (permite acceso sin credenciales válidas). */
        BYPASS_LOGIN: true,
        /** Bypass de validación de credenciales. */
        BYPASS_VALIDATION: true
    }
};
