/**
 * Módulo de autenticación y gestión de vistas.
 * Gestiona el flujo de login, logout y recuperación de contraseña.
 * 
 * @file AuthModule.js
 * @requires AuthenticationService
 * @requires SessionManager
 * @requires InputValidator
 * @requires RateLimiter
 * @requires DomHelper
 * @requires DashboardModule
 * @requires AppConfig
 */

var AuthModule = (function () {
    'use strict';

    // =========================================================================
    // REFERENCIAS A ELEMENTOS DEL DOM
    // =========================================================================

    /** @type {HTMLFormElement|null} */
    var loginFormElement = /** @type {HTMLFormElement|null} */ (document.getElementById('login-form'));
    /** @type {HTMLElement|null} */
    var loginErrorContainer = document.getElementById('login-error');
    /** @type {HTMLElement|null} */
    var loginViewElement = document.getElementById('login-view');
    /** @type {HTMLElement|null} */
    var dashboardViewElement = document.getElementById('dashboard-view');

    // Modal de recuperación de contraseña
    /** @type {HTMLAnchorElement|null} */
    var forgotPasswordLink = /** @type {HTMLAnchorElement|null} */ (document.getElementById('forgot-password-link'));
    /** @type {HTMLElement|null} */
    var forgotPasswordModal = document.getElementById('forgot-password-modal');
    /** @type {HTMLFormElement|null} */
    var forgotPasswordForm = /** @type {HTMLFormElement|null} */ (document.getElementById('forgot-password-form'));
    /** @type {HTMLButtonElement|null} */
    var cancelRecoveryButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('cancel-recovery'));
    /** @type {HTMLElement|null} */
    var recoveryMessageContainer = document.getElementById('recovery-message');

    // Vista de reset de contraseña
    /** @type {HTMLElement|null} */
    var resetPasswordView = document.getElementById('reset-password-view');
    /** @type {HTMLElement|null} */
    var resetMessageContainer = document.getElementById('reset-message');

    /** @type {string} Username para el proceso de reset */
    var resetUsernameValue = '';
    /** @type {string|null} Token de reset extraído de la URL */
    var resetToken = null;

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    /**
     * Inicializa el módulo de autenticación.
     * Vincula event listeners y verifica el estado de la sesión.
     */
    function initialize() {
        attachEventListeners();

        if (checkForResetToken()) {
            return;
        }

        if (SessionManager.isSessionValid()) {
            displayDashboardView();
            DashboardModule.loadDashboardData();
        } else {
            displayLoginView();
        }
    }

    /**
     * Vincula los event listeners a los elementos del DOM.
     */
    function attachEventListeners() {
        if (loginFormElement !== null) {
            loginFormElement.addEventListener('submit', handleLoginFormSubmit);
        }

        if (forgotPasswordLink !== null) {
            forgotPasswordLink.addEventListener('click', handleForgotPasswordClick);
        }

        if (forgotPasswordForm !== null) {
            forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
        }

        if (cancelRecoveryButton !== null) {
            cancelRecoveryButton.addEventListener('click', hideRecoveryModal);
        }

        if (forgotPasswordModal !== null) {
            forgotPasswordModal.addEventListener('click', function (event) {
                if (event.target === forgotPasswordModal) {
                    hideRecoveryModal();
                }
            });
        }

        var resetForm = document.getElementById('reset-password-form');
        if (resetForm !== null) {
            resetForm.addEventListener('submit', handleResetPasswordSubmit);
        }

        var backLink = document.getElementById('back-to-login-link');
        if (backLink !== null) {
            backLink.addEventListener('click', function (event) {
                event.preventDefault();
                hideResetPasswordView();
            });
        }

        var conversationsToggle = document.getElementById('conversations-toggle');
        if (conversationsToggle !== null) {
            conversationsToggle.addEventListener('click', TabsModule.toggleConversationsPanel);
        }
    }

    // =========================================================================
    // GESTIÓN DEL LOGIN
    // =========================================================================

    /**
     * Maneja el envío del formulario de login.
     * 
     * @param {Event} submitEvent - Evento de submit.
     */
    async function handleLoginFormSubmit(submitEvent) {
        submitEvent.preventDefault();

        DomHelper.hideErrorMessage(loginErrorContainer);

        var lockoutStatus = RateLimiter.checkLockoutStatus();

        if (lockoutStatus.isLocked) {
            var lockoutMessage = 'Demasiados intentos fallidos. Por favor, espera ' +
                lockoutStatus.remainingMinutes + ' minutos antes de intentar de nuevo.';
            DomHelper.showErrorMessage(loginErrorContainer, lockoutMessage);
            return;
        }

        var usernameInput = DomHelper.getInputValue('username');
        var passwordInput = DomHelper.getInputValue('password');

        var validationResult = InputValidator.validateLoginCredentials(usernameInput, passwordInput);

        if (!validationResult.isValid) {
            var validationErrorMessage = validationResult.errors.join(' ');
            DomHelper.showErrorMessage(loginErrorContainer, validationErrorMessage);
            return;
        }

        var authenticationResult = await AuthenticationService.authenticate(
            validationResult.sanitizedUsername,
            validationResult.sanitizedPassword
        );

        if (authenticationResult.success) {
            handleSuccessfulLogin(authenticationResult);
        } else {
            handleFailedLogin(authenticationResult);
        }
    }

    /**
     * Maneja un login exitoso.
     * 
     * @param {Object} authResult - Resultado de la autenticación.
     */
    function handleSuccessfulLogin(authResult) {
        RateLimiter.resetAttempts();

        if (authResult.userData) {
            SessionManager.createSession(authResult.userData);
        }

        displayDashboardView();
        DashboardModule.loadDashboardData();
    }

    /**
     * Maneja un login fallido.
     * 
     * @param {Object} authResult - Resultado de la autenticación.
     */
    function handleFailedLogin(authResult) {
        RateLimiter.recordFailedAttempt();

        var remainingAttempts = RateLimiter.getRemainingAttempts();
        var errorMessage = authResult.message;

        if (remainingAttempts > 0) {
            errorMessage = errorMessage + ' Intentos restantes: ' + remainingAttempts + '.';
        } else {
            errorMessage = 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.';
        }

        DomHelper.showErrorMessage(loginErrorContainer, errorMessage);
    }

    // =========================================================================
    // GESTIÓN DE VISTAS
    // =========================================================================

    /**
     * Muestra la vista del dashboard y oculta el login.
     */
    function displayDashboardView() {
        DomHelper.hideElement(loginViewElement);
        DomHelper.showElement(dashboardViewElement, 'flex');

        var currentUsername = SessionManager.getCurrentUsername();
        var welcomeText = 'Panel de ' + (currentUsername || 'Usuario');
        DomHelper.setTextContent('welcome-user', welcomeText);
    }

    /**
     * Muestra la vista de login y oculta el dashboard.
     */
    function displayLoginView() {
        DomHelper.hideElement(dashboardViewElement);
        DomHelper.showElement(loginViewElement, 'flex');
    }

    /**
     * Cierra la sesión del usuario.
     */
    function logout() {
        SessionManager.destroySession();
        window.location.reload();
    }

    // =========================================================================
    // RECUPERACIÓN DE CONTRASEÑA
    // =========================================================================

    /**
     * Verifica si hay un token de reset en la URL.
     * 
     * @returns {boolean} True si hay token.
     */
    function checkForResetToken() {
        var urlParams = new URLSearchParams(window.location.search);
        var token = urlParams.get('reset_token');
        var username = urlParams.get('username');

        if (token && username) {
            resetToken = token;
            resetUsernameValue = username;
            showResetPasswordView();
            return true;
        }
        return false;
    }

    /**
     * Maneja el clic en "Olvidé mi contraseña".
     * 
     * @param {Event} clickEvent - Evento de clic.
     */
    function handleForgotPasswordClick(clickEvent) {
        clickEvent.preventDefault();
        showRecoveryModal();
    }

    /**
     * Maneja el envío del formulario de recuperación.
     * 
     * @param {Event} submitEvent - Evento de submit.
     */
    async function handleForgotPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var usernameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-username'));

        if (!usernameInput) return;

        var username = usernameInput.value.trim();

        if (!username) {
            showRecoveryMessage('Por favor, ingresa tu nombre de usuario.', 'error');
            return;
        }

        var webhookUrl = AppConfig.API_ENDPOINTS.REQUEST_PASSWORD_RESET;

        if (!webhookUrl) {
            showRecoveryMessage('El servicio de recuperación no está configurado. Contacta al administrador.', 'error');
            return;
        }

        if (!forgotPasswordForm) return;

        /** @type {HTMLButtonElement|null} */
        var submitButton = /** @type {HTMLButtonElement|null} */ (forgotPasswordForm.querySelector('button[type="submit"]'));
        if (!submitButton) return;

        var originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Enviando...';

        try {
            var payload = {
                username: username,
                resetBaseUrl: window.location.origin + window.location.pathname
            };

            var response = await ApiClient.post(webhookUrl, payload);

            if (response !== null) {
                if (response.success === false) {
                    showRecoveryMessage(response.message || 'No se encontró el usuario. Verifica e intenta de nuevo.', 'error');
                } else {
                    showRecoveryMessage('📧 Se ha enviado un email con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada.', 'success');
                    usernameInput.value = '';
                    setTimeout(function () {
                        hideRecoveryModal();
                    }, 5000);
                }
            } else {
                showRecoveryMessage('Error de conexión. Intenta de nuevo más tarde.', 'error');
            }
        } catch (error) {
            console.error('Error en recuperación de contraseña:', error);
            showRecoveryMessage('Ocurrió un error. Verifica tu usuario e intenta de nuevo.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }

    /**
     * Maneja el envío del formulario de reset de contraseña.
     * 
     * @param {Event} submitEvent - Evento de submit.
     */
    async function handleResetPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var newPasswordInput = /** @type {HTMLInputElement|null} */ (document.getElementById('new-password'));
        /** @type {HTMLInputElement|null} */
        var confirmPasswordInput = /** @type {HTMLInputElement|null} */ (document.getElementById('confirm-password'));

        if (!newPasswordInput || !confirmPasswordInput) return;

        var newPassword = newPasswordInput.value;
        var confirmPassword = confirmPasswordInput.value;

        if (!newPassword || !confirmPassword) {
            showResetMessage('Por favor, completa ambos campos.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showResetMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        if (newPassword.length < AppConfig.VALIDATION.PASSWORD_MIN_LENGTH) {
            showResetMessage('La contraseña debe tener al menos ' + AppConfig.VALIDATION.PASSWORD_MIN_LENGTH + ' caracteres.', 'error');
            return;
        }

        var webhookUrl = AppConfig.API_ENDPOINTS.CONFIRM_PASSWORD_RESET;

        if (!webhookUrl) {
            showResetMessage('El servicio de cambio de contraseña no está configurado. Contacta al administrador.', 'error');
            return;
        }

        if (!resetToken) {
            showResetMessage('Token de reset no válido. Por favor, solicita un nuevo email de recuperación.', 'error');
            return;
        }

        /** @type {HTMLButtonElement|null} */
        var submitButton = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-reset-submit'));
        if (!submitButton) return;

        var originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Procesando...';

        try {
            var payload = {
                token: resetToken,
                username: resetUsernameValue,
                newPassword: newPassword
            };

            var response = await ApiClient.post(webhookUrl, payload);

            if (response !== null) {
                if (response.success === false) {
                    showResetMessage(response.message || 'No se pudo cambiar la contraseña. El token puede haber expirado.', 'error');
                } else {
                    showResetMessage('✅ ¡Contraseña actualizada correctamente! Redirigiendo al login...', 'success');
                    setTimeout(function () {
                        var cleanUrl = window.location.origin + window.location.pathname;
                        window.history.replaceState({}, document.title, cleanUrl);
                        window.location.reload();
                    }, 3000);
                }
            } else {
                showResetMessage('Error de conexión. Intenta de nuevo más tarde.', 'error');
            }
        } catch (error) {
            console.error('Error en cambio de contraseña:', error);
            showResetMessage('Ocurrió un error. Por favor, intenta de nuevo.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }

    // =========================================================================
    // FUNCIONES DE UI PARA MODALES
    // =========================================================================

    function showResetPasswordView() {
        DomHelper.hideElement(loginViewElement);
        DomHelper.hideElement(dashboardViewElement);
        if (resetPasswordView) {
            resetPasswordView.style.display = 'flex';
        }
    }

    function hideResetPasswordView() {
        if (resetPasswordView) {
            resetPasswordView.style.display = 'none';
        }
        var cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        displayLoginView();
    }

    function showRecoveryModal() {
        if (forgotPasswordModal !== null) {
            forgotPasswordModal.style.display = 'flex';
            clearRecoveryMessage();
            var usernameInput = document.getElementById('recovery-username');
            if (usernameInput !== null) {
                usernameInput.focus();
            }
        }
    }

    function hideRecoveryModal() {
        if (forgotPasswordModal !== null) {
            forgotPasswordModal.style.display = 'none';
            clearRecoveryMessage();
            if (forgotPasswordForm !== null) {
                forgotPasswordForm.reset();
            }
        }
    }

    function showRecoveryMessage(message, type) {
        if (recoveryMessageContainer !== null) {
            recoveryMessageContainer.textContent = message;
            recoveryMessageContainer.className = type;
            recoveryMessageContainer.style.display = 'block';
        }
    }

    function clearRecoveryMessage() {
        if (recoveryMessageContainer !== null) {
            recoveryMessageContainer.textContent = '';
            recoveryMessageContainer.className = '';
            recoveryMessageContainer.style.display = 'none';
        }
    }

    function showResetMessage(message, type) {
        if (resetMessageContainer !== null) {
            resetMessageContainer.textContent = message;
            resetMessageContainer.className = 'alert-' + type;
            resetMessageContainer.style.display = 'block';
        }
    }

    // API pública
    return {
        initialize: initialize,
        logout: logout,
        displayDashboardView: displayDashboardView,
        displayLoginView: displayLoginView
    };

})();

// Exponer logout globalmente para uso en HTML
window.logout = AuthModule.logout;
window.loadData = function () {
    DashboardModule.loadDashboardData();
};
