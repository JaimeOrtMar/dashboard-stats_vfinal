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

    BILLING: {
        CURRENT_PLAN_KEY: 'starter',
        RECOMMENDED_PLAN_KEY: 'professional',
        WHATSAPP_BASE_URL: 'https://wa.me/',
        // Use country code + number, no plus sign. Example: 34600111222
        WHATSAPP_NUMBER: '34600111222',
        /** @type {PlanDefinition[]} */
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
        // Local development helper. Disable in production.
        BYPASS_LOGIN: true,
        BYPASS_VALIDATION: true
    }
};
