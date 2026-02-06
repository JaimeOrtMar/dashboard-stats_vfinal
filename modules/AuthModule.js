/**
 * Authentication and view flow module.
 * Handles login, logout, and password recovery request modal.
 *
 * @file AuthModule.js
 */

var AuthModule = (function () {
    'use strict';

    /** @type {HTMLFormElement|null} */
    var loginFormElement = /** @type {HTMLFormElement|null} */ (document.getElementById('login-form'));
    /** @type {HTMLElement|null} */
    var loginErrorContainer = document.getElementById('login-error');
    /** @type {HTMLElement|null} */
    var loginViewElement = document.getElementById('login-view');
    /** @type {HTMLElement|null} */
    var dashboardViewElement = document.getElementById('dashboard-view');

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

    /** @type {boolean} */
    var eventsAttached = false;

    function initialize() {
        attachEventListeners();

        if (typeof TabsModule !== 'undefined' && typeof TabsModule.initialize === 'function') {
            TabsModule.initialize();
        }

        if (SessionManager.isSessionValid()) {
            displayDashboardView();
            DashboardModule.loadDashboardData();
            return;
        }

        displayLoginView();
    }

    function attachEventListeners() {
        if (eventsAttached) {
            return;
        }

        eventsAttached = true;

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
    }

    /**
     * @param {Event} submitEvent
     */
    async function handleLoginFormSubmit(submitEvent) {
        submitEvent.preventDefault();

        DomHelper.hideErrorMessage(loginErrorContainer);

        var lockoutStatus = RateLimiter.checkLockoutStatus();
        if (lockoutStatus.isLocked) {
            DomHelper.showErrorMessage(
                loginErrorContainer,
                'Demasiados intentos fallidos. Espera ' + lockoutStatus.remainingMinutes + ' minutos antes de intentar de nuevo.'
            );
            return;
        }

        var usernameInput = DomHelper.getInputValue('username');
        var passwordInput = DomHelper.getInputValue('password');
        var validationResult = InputValidator.validateLoginCredentials(usernameInput, passwordInput);

        if (!validationResult.isValid) {
            DomHelper.showErrorMessage(loginErrorContainer, validationResult.errors.join(' '));
            return;
        }

        var authResult = await AuthenticationService.authenticate(
            validationResult.sanitizedUsername,
            validationResult.sanitizedPassword
        );

        if (authResult.success) {
            handleSuccessfulLogin(authResult);
            return;
        }

        handleFailedLogin(authResult);
    }

    /**
     * @param {{ success: boolean, userData?: UserData }} authResult
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
     * @param {{ success: boolean, message?: string }} authResult
     */
    function handleFailedLogin(authResult) {
        RateLimiter.recordFailedAttempt();

        var remainingAttempts = RateLimiter.getRemainingAttempts();
        var errorMessage = authResult.message || 'Credenciales incorrectas.';

        if (remainingAttempts > 0) {
            errorMessage += ' Intentos restantes: ' + remainingAttempts + '.';
        } else {
            errorMessage = 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.';
        }

        DomHelper.showErrorMessage(loginErrorContainer, errorMessage);
    }

    function displayDashboardView() {
        if (dashboardViewElement !== null) {
            dashboardViewElement.classList.remove('is-hidden');
        }
        DomHelper.hideElement(loginViewElement);
        DomHelper.showElement(dashboardViewElement, 'flex');

        var currentUsername = SessionManager.getCurrentUsername();
        DomHelper.setTextContent('welcome-user', 'Panel de ' + (currentUsername || 'Usuario'));
    }

    function displayLoginView() {
        if (dashboardViewElement !== null) {
            dashboardViewElement.classList.add('is-hidden');
        }
        DomHelper.hideElement(dashboardViewElement);
        DomHelper.showElement(loginViewElement, 'flex');
        hideRecoveryModal();
    }

    function logout() {
        SessionManager.destroySession();
        window.location.reload();
    }

    /**
     * @param {Event} clickEvent
     */
    function handleForgotPasswordClick(clickEvent) {
        clickEvent.preventDefault();
        showRecoveryModal();
    }

    /**
     * @param {Event} submitEvent
     */
    async function handleForgotPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var usernameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-username'));
        if (usernameInput === null) {
            return;
        }

        var username = usernameInput.value.trim();
        if (!username) {
            showRecoveryMessage('Por favor, ingresa tu nombre de usuario.', 'error');
            return;
        }

        var requestEndpoint = AppConfig.API_ENDPOINTS.REQUEST_PASSWORD_RESET;
        if (!requestEndpoint) {
            showRecoveryMessage('El servicio de recuperacion no esta configurado. Contacta al administrador.', 'error');
            return;
        }

        if (forgotPasswordForm === null) {
            return;
        }

        /** @type {HTMLButtonElement|null} */
        var submitButton = /** @type {HTMLButtonElement|null} */ (forgotPasswordForm.querySelector('button[type="submit"]'));
        if (submitButton === null) {
            return;
        }

        var originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Enviando...';

        try {
            var response = await ApiClient.post(requestEndpoint, {
                username: username,
                resetBaseUrl: buildResetBaseUrl()
            });

            if (isSuccessfulResponse(response)) {
                showRecoveryMessage(
                    'Se envio un email con instrucciones para restablecer tu contrasena. Revisa tu bandeja de entrada.',
                    'success'
                );
                usernameInput.value = '';
                window.setTimeout(hideRecoveryModal, 5000);
            } else {
                showRecoveryMessage(
                    response && response.message
                        ? response.message
                        : 'No se pudo procesar la solicitud. Verifica el usuario e intenta de nuevo.',
                    'error'
                );
            }
        } catch (error) {
            console.error('Password recovery request failed:', error);
            showRecoveryMessage('Ocurrio un error de red. Intenta de nuevo mas tarde.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHtml;
        }
    }

    function buildResetBaseUrl() {
        var resetPath = window.location.pathname.replace(/[^/]*$/, 'reset-password.html');
        return window.location.origin + resetPath;
    }

    /**
     * @param {any} responseData
     * @returns {boolean}
     */
    function isSuccessfulResponse(responseData) {
        return !!responseData && (responseData.success === true || responseData.status === 'success');
    }

    function showRecoveryModal() {
        if (forgotPasswordModal === null) {
            return;
        }

        forgotPasswordModal.classList.remove('is-hidden');
        forgotPasswordModal.style.display = 'flex';
        clearRecoveryMessage();

        /** @type {HTMLInputElement|null} */
        var usernameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-username'));
        if (usernameInput !== null) {
            usernameInput.focus();
        }
    }

    function hideRecoveryModal() {
        if (forgotPasswordModal === null) {
            return;
        }

        forgotPasswordModal.classList.add('is-hidden');
        forgotPasswordModal.style.display = 'none';
        clearRecoveryMessage();

        if (forgotPasswordForm !== null) {
            forgotPasswordForm.reset();
        }
    }

    /**
     * @param {string} message
     * @param {'success'|'error'} type
     */
    function showRecoveryMessage(message, type) {
        if (recoveryMessageContainer === null) {
            return;
        }

        recoveryMessageContainer.textContent = message;
        recoveryMessageContainer.className = type;
        recoveryMessageContainer.style.display = 'block';
    }

    function clearRecoveryMessage() {
        if (recoveryMessageContainer === null) {
            return;
        }

        recoveryMessageContainer.textContent = '';
        recoveryMessageContainer.className = '';
        recoveryMessageContainer.style.display = 'none';
    }

    return {
        initialize: initialize,
        logout: logout,
        displayDashboardView: displayDashboardView,
        displayLoginView: displayLoginView
    };
})();
