/**
 * Gestor de sesiones de usuario.
 * Utiliza sessionStorage para mantener el estado de autenticacion.
 * La sesion se elimina automaticamente al cerrar el navegador.
 * 
 * @file SessionManager.js
 * @description Maneja la creacion, validacion y destruccion de sesiones de usuario.
 */

var SessionManager = (function () {
    'use strict';

    /**
     * Crea una nueva sesion para el usuario autenticado.
     * Almacena los datos del usuario junto con marcas de tiempo.
     * 
     * @param {UserData} userData - Objeto con los datos del usuario a almacenar.
     * @returns {void}
     */
    function createSession(userData) {
        var sessionDurationMs = AppConfig.SECURITY.SESSION_DURATION_MINUTES * 60 * 1000;
        var currentTimestamp = Date.now();

        /** @type {SessionData} */
        var sessionData = {
            user: userData,
            createdAt: currentTimestamp,
            expiresAt: currentTimestamp + sessionDurationMs
        };

        var serializedData = JSON.stringify(sessionData);
        sessionStorage.setItem(AppConfig.STORAGE_KEYS.SESSION, serializedData);
    }

    /**
     * Verifica si existe una sesion valida y no expirada.
     * 
     * @returns {boolean} True si la sesion es valida, false en caso contrario.
     */
    function isSessionValid() {
        var sessionData = getSession();

        if (sessionData === null) {
            return false;
        }

        var currentTimestamp = Date.now();
        var isNotExpired = currentTimestamp < sessionData.expiresAt;

        return isNotExpired;
    }

    /**
     * Obtiene los datos de la sesion actual.
     * 
     * @returns {SessionData|null} Objeto con los datos de sesion o null si no existe.
     */
    function getSession() {
        var storageKey = AppConfig.STORAGE_KEYS.SESSION;
        var rawData = sessionStorage.getItem(storageKey);

        if (rawData === null) {
            return null;
        }

        try {
            var parsedData = JSON.parse(rawData);
            return parsedData;
        } catch (parseError) {
            console.error('SessionManager.getSession: Error al parsear datos de sesion', parseError);
            return null;
        }
    }

    /**
     * Destruye la sesion actual eliminando los datos del almacenamiento.
     */
    function destroySession() {
        var storageKey = AppConfig.STORAGE_KEYS.SESSION;
        sessionStorage.removeItem(storageKey);
    }

    /**
     * Obtiene el nombre de usuario de la sesion actual.
     * 
     * @returns {string|null} Nombre de usuario o null si no hay sesion.
     */
    function getCurrentUsername() {
        var sessionData = getSession();

        if (sessionData === null || sessionData.user === undefined) {
            return null;
        }

        return sessionData.user.username;
    }

    // API publica del modulo
    return {
        createSession: createSession,
        isSessionValid: isSessionValid,
        getSession: getSession,
        destroySession: destroySession,
        getCurrentUsername: getCurrentUsername
    };

})();
