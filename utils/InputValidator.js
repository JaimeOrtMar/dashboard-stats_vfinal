/**
 * Validador de entradas de formularios.
 * Proporciona funciones para sanear y validar datos de usuario.
 * 
 * @file InputValidator.js
 * @description Contiene funciones de validacion y saneamiento de datos de entrada.
 */

var InputValidator = (function () {
    'use strict';

    /**
     * Sanea una cadena de texto eliminando espacios al inicio y final.
     * Protege contra valores nulos o no string.
     * 
     * @param {*} inputValue - Valor a sanear.
     * @returns {string} Cadena saneada o cadena vacia si el input no es valido.
     */
    function sanitizeString(inputValue) {
        if (typeof inputValue !== 'string') {
            return '';
        }

        var sanitizedValue = inputValue.trim();
        return sanitizedValue;
    }

    /**
     * Valida las credenciales de login segun las reglas configuradas.
     * Retorna un objeto con el resultado de la validacion y errores si los hay.
     * 
     * @param {string} username - Nombre de usuario a validar.
     * @param {string} password - Contraseña a validar.
     * @returns {ValidationResult} Resultado de la validacion.
     */
    function validateLoginCredentials(username, password) {
        // ⚠️ MODO DESARROLLO: Cambiar a false cuando el login de n8n esté listo
        var DEV_MODE_BYPASS_VALIDATION = false;

        if (DEV_MODE_BYPASS_VALIDATION) {
            console.warn('⚠️ DEV MODE: Validación bypass activa - Desactivar en producción');
            return {
                isValid: true,
                errors: [],
                sanitizedUsername: username || 'dev_user',
                sanitizedPassword: password || 'dev_pass'
            };
        }

        var validationErrors = [];
        var validationConfig = AppConfig.VALIDATION;

        var sanitizedUsername = sanitizeString(username);
        var sanitizedPassword = sanitizeString(password);

        // Validar longitud minima del nombre de usuario
        if (sanitizedUsername.length < validationConfig.USERNAME_MIN_LENGTH) {
            var usernameMinError = 'El nombre de usuario debe tener al menos ' +
                validationConfig.USERNAME_MIN_LENGTH + ' caracteres.';
            validationErrors.push(usernameMinError);
        }

        // Validar longitud maxima del nombre de usuario
        if (sanitizedUsername.length > validationConfig.USERNAME_MAX_LENGTH) {
            var usernameMaxError = 'El nombre de usuario no puede exceder ' +
                validationConfig.USERNAME_MAX_LENGTH + ' caracteres.';
            validationErrors.push(usernameMaxError);
        }

        // Validar longitud minima de la contraseena
        if (sanitizedPassword.length < validationConfig.PASSWORD_MIN_LENGTH) {
            var passwordMinError = 'La contraseena debe tener al menos ' +
                validationConfig.PASSWORD_MIN_LENGTH + ' caracteres.';
            validationErrors.push(passwordMinError);
        }

        var isValid = validationErrors.length === 0;

        return {
            isValid: isValid,
            errors: validationErrors,
            sanitizedUsername: sanitizedUsername,
            sanitizedPassword: sanitizedPassword
        };
    }

    // API publica del modulo
    return {
        sanitizeString: sanitizeString,
        validateLoginCredentials: validateLoginCredentials
    };

})();
