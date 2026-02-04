/**
 * Limitador de tasa de intentos de login.
 * Protege contra ataques de fuerza bruta bloqueando temporalmente
 * tras demasiados intentos fallidos.
 * 
 * @file RateLimiter.js
 * @description Implementa logica de rate limiting para el proceso de login.
 */

var RateLimiter = (function () {
    'use strict';

    /**
     * Obtiene el estado actual de intentos de login desde localStorage.
     * 
     * @returns {AttemptState} Estado de intentos con count y lockoutUntil.
     */
    function getAttemptState() {
        var storageKey = AppConfig.STORAGE_KEYS.LOGIN_ATTEMPTS;
        var rawData = localStorage.getItem(storageKey);

        if (rawData === null) {
            return {
                count: 0,
                lockoutUntil: null
            };
        }

        try {
            var parsedState = JSON.parse(rawData);
            return parsedState;
        } catch (parseError) {
            console.error('RateLimiter.getAttemptState: Error al parsear estado', parseError);
            return {
                count: 0,
                lockoutUntil: null
            };
        }
    }

    /**
     * Guarda el estado de intentos en localStorage.
     * 
     * @param {AttemptState} attemptState - Estado a guardar.
     * @returns {void}
     */
    function saveAttemptState(attemptState) {
        var storageKey = AppConfig.STORAGE_KEYS.LOGIN_ATTEMPTS;
        var serializedState = JSON.stringify(attemptState);
        localStorage.setItem(storageKey, serializedState);
    }

    /**
     * Verifica si el usuario esta actualmente bloqueado.
     * Si el bloqueo ha expirado, reinicia automaticamente el estado.
     * 
     * @returns {LockoutStatus} Estado del bloqueo.
     */
    function checkLockoutStatus() {
        var attemptState = getAttemptState();

        // Si no hay timestamp de bloqueo, el usuario no esta bloqueado
        if (attemptState.lockoutUntil === null) {
            return {
                isLocked: false,
                remainingMinutes: 0
            };
        }

        var currentTimestamp = Date.now();

        // Verificar si el bloqueo sigue activo
        if (currentTimestamp < attemptState.lockoutUntil) {
            var remainingMilliseconds = attemptState.lockoutUntil - currentTimestamp;
            var remainingMinutes = Math.ceil(remainingMilliseconds / 60000);

            return {
                isLocked: true,
                remainingMinutes: remainingMinutes
            };
        }

        // El bloqueo ha expirado, reiniciar estado
        resetAttempts();

        return {
            isLocked: false,
            remainingMinutes: 0
        };
    }

    /**
     * Registra un intento de login fallido.
     * Si se alcanza el limite, establece el timestamp de bloqueo.
     */
    function recordFailedAttempt() {
        var attemptState = getAttemptState();
        attemptState.count = attemptState.count + 1;

        var maxAttempts = AppConfig.SECURITY.MAX_LOGIN_ATTEMPTS;

        // Verificar si se alcanzo el limite de intentos
        if (attemptState.count >= maxAttempts) {
            var lockoutDurationMinutes = AppConfig.SECURITY.LOCKOUT_DURATION_MINUTES;
            var lockoutDurationMs = lockoutDurationMinutes * 60 * 1000;
            attemptState.lockoutUntil = Date.now() + lockoutDurationMs;
        }

        saveAttemptState(attemptState);
    }

    /**
     * Reinicia el contador de intentos.
     * Se debe llamar tras un login exitoso.
     */
    function resetAttempts() {
        var storageKey = AppConfig.STORAGE_KEYS.LOGIN_ATTEMPTS;
        localStorage.removeItem(storageKey);
    }

    /**
     * Obtiene el numero de intentos restantes antes del bloqueo.
     * 
     * @returns {number} Numero de intentos disponibles.
     */
    function getRemainingAttempts() {
        var attemptState = getAttemptState();
        var maxAttempts = AppConfig.SECURITY.MAX_LOGIN_ATTEMPTS;
        var remainingAttempts = maxAttempts - attemptState.count;

        return Math.max(0, remainingAttempts);
    }

    // API publica del modulo
    return {
        checkLockoutStatus: checkLockoutStatus,
        recordFailedAttempt: recordFailedAttempt,
        resetAttempts: resetAttempts,
        getRemainingAttempts: getRemainingAttempts
    };

})();
