/**
 * Centralized application configuration.
 *
 * @file constants.js
 */

/** @type {AppConfiguration} */
var AppConfig = {
    API_ENDPOINTS: {
        AUTHENTICATION: 'https://server.ewallia.com/webhook/e6404c0e-35be-4e26-889a-e7281879a213',
        TWILIO_STATS: 'https://dashboard-api-4813.twil.io/get-stats',
        TWILIO_CONVERSATIONS: 'https://dashboard-api-4813.twil.io/get-conversations',
        RETELL_CALLS: 'https://dashboard-api-4813.twil.io/get-retell-calls',
        REQUEST_PASSWORD_RESET: '',
        CONFIRM_PASSWORD_RESET: ''
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

    DEV_MODE: {
        // Keep disabled by default. Enable only for local debugging.
        BYPASS_LOGIN: true,
        BYPASS_VALIDATION: true
    }
};
