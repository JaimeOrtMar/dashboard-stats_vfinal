/**
 * Servicio de autenticacion.
 * Gestiona la comunicacion con el backend de n8n para validar credenciales.
 * 
 * @file AuthenticationService.js
 * @description Encapsula toda la logica de autenticacion de usuarios.
 */

var AuthenticationService = (function () {
    'use strict';

    /**
     * Autentica al usuario contra el servidor.
     * En modo desarrollo, permite bypass del login.
     * 
     * @param {string} username - Nombre de usuario.
     * @param {string} password - Contraseña.
     * @returns {Promise<AuthResult>} Resultado de la autenticación.
     */
    async function authenticate(username, password) {
        // Usar configuración centralizada de DEV_MODE
        if (AppConfig.DEV_MODE && AppConfig.DEV_MODE.BYPASS_LOGIN) {
            console.warn('⚠️ DEV MODE: Login bypass active - Disable in production');
            return {
                success: true,
                message: 'Authentication successful (DEV MODE).',
                userData: { username: username || 'dev_user' }
            };
        }

        var authenticationEndpoint = AppConfig.API_ENDPOINTS.AUTHENTICATION;

        var requestPayload = {
            usuario: username,
            clave: password
        };

        var serverResponse = await ApiClient.post(authenticationEndpoint, requestPayload);

        if (serverResponse.status === 'success') {
            return {
                success: true,
                message: 'Autenticacion exitosa.',
                userData: {
                    username: username
                }
            };
        }

        // Determinar mensaje de error apropiado
        var errorMessage = 'Credenciales incorrectas.';
        if (serverResponse.message) {
            errorMessage = serverResponse.message;
        }

        return {
            success: false,
            message: errorMessage
        };
    }

    // API publica del modulo
    return {
        authenticate: authenticate
    };

})();
