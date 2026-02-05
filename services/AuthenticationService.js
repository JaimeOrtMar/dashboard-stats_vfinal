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
     * Intenta autenticar al usuario con las credenciales proporcionadas.
     * Envia las credenciales al webhook de n8n y procesa la respuesta.
     * 
     * @param {string} username - Nombre de usuario saneado.
     * @param {string} password - Contraseña saneada.
     * @returns {Promise<AuthResult>} Resultado de la autenticacion.
     */
    async function authenticate(username, password) {
        // ⚠️ MODO DESARROLLO: Cambiar a false cuando el login de n8n esté listo
        var DEV_MODE_BYPASS_LOGIN = false;

        if (DEV_MODE_BYPASS_LOGIN) {
            console.warn('⚠️ DEV MODE: Login bypass activo - Desactivar en producción');
            return {
                success: true,
                message: 'Autenticacion exitosa (DEV MODE).',
                userData: {
                    username: username || 'dev_user'
                }
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
