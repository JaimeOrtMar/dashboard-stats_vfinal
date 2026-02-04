/**
 * Aplicacion principal del Dashboard.
 * Este archivo orquesta los modulos de autenticacion, sesion y datos.
 * 
 * @file app.js
 * @description Punto de entrada principal que inicializa la aplicacion
 *              y coordina la interaccion entre los diferentes modulos.
 * 
 * Dependencias (cargar en este orden en index.html):
 *   1. types.js
 *   2. config/constants.js
 *   3. services/ApiClient.js
 *   4. services/SessionManager.js
 *   5. services/AuthenticationService.js
 *   6. utils/InputValidator.js
 *   7. utils/RateLimiter.js
 *   8. utils/DomHelper.js
 *   9. app.js (este archivo)
 */

(function () {
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

    // Referencias del modal de recuperación de contraseña
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

    // =========================================================================
    // INICIALIZACION DE LA APLICACION
    // =========================================================================

    /**
     * Inicializa la aplicacion.
     * Verifica si existe una sesion valida y restaura el estado correspondiente.
     * Vincula los event listeners necesarios.
     */
    function initializeApplication() {
        // Verificar si hay una sesion valida existente
        if (SessionManager.isSessionValid()) {
            displayDashboardView();
            loadDashboardData();
        } else {
            displayLoginView();
        }

        // Vincular event listeners
        attachEventListeners();
    }

    /**
     * Vincula los event listeners a los elementos del DOM.
     */
    function attachEventListeners() {
        if (loginFormElement !== null) {
            loginFormElement.addEventListener('submit', handleLoginFormSubmit);
        }

        // Event listeners para el modal de recuperación de contraseña
        if (forgotPasswordLink !== null) {
            forgotPasswordLink.addEventListener('click', handleForgotPasswordClick);
        }

        if (forgotPasswordForm !== null) {
            forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
        }

        if (cancelRecoveryButton !== null) {
            cancelRecoveryButton.addEventListener('click', hideRecoveryModal);
        }

        // Cerrar modal al hacer clic fuera del contenido
        if (forgotPasswordModal !== null) {
            forgotPasswordModal.addEventListener('click', function (event) {
                if (event.target === forgotPasswordModal) {
                    hideRecoveryModal();
                }
            });
        }

        // Event listener para el toggle de conversaciones de WhatsApp
        var conversationsToggle = document.getElementById('conversations-toggle');
        if (conversationsToggle !== null) {
            conversationsToggle.addEventListener('click', toggleConversationsPanel);
        }
    }

    /**
     * Alterna la visibilidad del panel de conversaciones de WhatsApp.
     */
    function toggleConversationsPanel() {
        var section = document.getElementById('conversations-section');
        var toggleButton = document.getElementById('conversations-toggle');

        if (section === null || toggleButton === null) {
            return;
        }

        var isCollapsed = section.classList.contains('collapsed');

        if (isCollapsed) {
            section.classList.remove('collapsed');
            toggleButton.setAttribute('aria-expanded', 'true');
        } else {
            section.classList.add('collapsed');
            toggleButton.setAttribute('aria-expanded', 'false');
        }
    }

    // =========================================================================
    // GESTION DEL LOGIN
    // =========================================================================

    /**
     * Maneja el envio del formulario de login.
     * Ejecuta validacion, rate limiting y autenticacion.
     * 
     * @param {Event} submitEvent - Evento de submit del formulario.
     */
    async function handleLoginFormSubmit(submitEvent) {
        submitEvent.preventDefault();

        // Ocultar errores previos
        DomHelper.hideErrorMessage(loginErrorContainer);

        // Paso 1: Verificar si el usuario esta bloqueado por rate limiting
        var lockoutStatus = RateLimiter.checkLockoutStatus();

        if (lockoutStatus.isLocked) {
            var lockoutMessage = 'Demasiados intentos fallidos. Por favor, espera ' +
                lockoutStatus.remainingMinutes + ' minutos antes de intentar de nuevo.';
            DomHelper.showErrorMessage(loginErrorContainer, lockoutMessage);
            return;
        }

        // Paso 2: Obtener y validar las credenciales
        var usernameInput = DomHelper.getInputValue('username');
        var passwordInput = DomHelper.getInputValue('password');

        var validationResult = InputValidator.validateLoginCredentials(usernameInput, passwordInput);

        if (!validationResult.isValid) {
            var validationErrorMessage = validationResult.errors.join(' ');
            DomHelper.showErrorMessage(loginErrorContainer, validationErrorMessage);
            return;
        }

        // Paso 3: Intentar autenticacion con el servidor
        var authenticationResult = await AuthenticationService.authenticate(
            validationResult.sanitizedUsername,
            validationResult.sanitizedPassword
        );

        // Paso 4: Procesar resultado de la autenticacion
        if (authenticationResult.success) {
            handleSuccessfulLogin(authenticationResult);
        } else {
            handleFailedLogin(authenticationResult);
        }
    }

    /**
     * Maneja un login exitoso.
     * Crea la sesion, reinicia el rate limiter y muestra el dashboard.
     * 
     * @param {AuthResult} authResult - Resultado de la autenticacion exitosa.
     * @returns {void}
     */
    function handleSuccessfulLogin(authResult) {
        // Reiniciar contador de intentos fallidos
        RateLimiter.resetAttempts();

        // Crear sesion de usuario
        if (authResult.userData) {
            SessionManager.createSession(authResult.userData);
        }

        // Mostrar dashboard y cargar datos
        displayDashboardView();
        loadDashboardData();
    }

    /**
     * Maneja un login fallido.
     * Registra el intento fallido y muestra mensaje de error apropiado.
     * 
     * @param {AuthResult} authResult - Resultado de la autenticacion fallida.
     * @returns {void}
     */
    function handleFailedLogin(authResult) {
        // Registrar intento fallido para rate limiting
        RateLimiter.recordFailedAttempt();

        // Obtener intentos restantes
        var remainingAttempts = RateLimiter.getRemainingAttempts();

        // Construir mensaje de error
        var errorMessage = authResult.message;

        if (remainingAttempts > 0) {
            errorMessage = errorMessage + ' Intentos restantes: ' + remainingAttempts + '.';
        } else {
            errorMessage = 'Cuenta bloqueada temporalmente por demasiados intentos fallidos.';
        }

        DomHelper.showErrorMessage(loginErrorContainer, errorMessage);
    }

    // =========================================================================
    // GESTION DE VISTAS
    // =========================================================================

    /**
     * Muestra la vista del dashboard y oculta el login.
     * Actualiza el mensaje de bienvenida con el nombre de usuario.
     */
    function displayDashboardView() {
        DomHelper.hideElement(loginViewElement);
        DomHelper.showElement(dashboardViewElement, 'flex');

        // Actualizar mensaje de bienvenida
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

    // =========================================================================
    // CARGA DE DATOS DEL DASHBOARD
    // =========================================================================

    /**
     * Carga los datos del dashboard desde la API de Twilio.
     * Actualiza las estadisticas y la lista de grabaciones.
     */
    async function loadDashboardData() {
        var statsEndpoint = AppConfig.API_ENDPOINTS.TWILIO_STATS;
        var retellEndpoint = AppConfig.API_ENDPOINTS.RETELL_CALLS;

        // Cargar datos en paralelo
        var results = await Promise.all([
            ApiClient.get(statsEndpoint),
            ApiClient.get(retellEndpoint)
        ]);

        var statsData = results[0];
        var retellData = results[1];

        if (statsData !== null) {
            updateStatisticsDisplay(statsData);
        } else {
            console.error('loadDashboardData: No se pudieron cargar las estadísticas.');
        }

        if (retellData !== null) {
            // Asumiendo que el endpoint de Retell devuelve un objeto con la propiedad 'data'
            // O si devuelve directamente el array, ajustamos aquí.
            // Según el endpoint anterior, devolvía todo junto.
            // Si el nuevo endpoint sigue la misma estructura de respuesta { data: [...] } pasamos todo el objeto
            updateRecordingsList(retellData);
        } else {
            console.error('loadDashboardData: No se pudieron cargar las grabaciones.');
            // Mostramos mensaje de error en la lista de grabaciones
            var recordingsContainer = document.getElementById('recordings-list');
            if (recordingsContainer) {
                recordingsContainer.innerHTML = '<p class="empty">Error al cargar grabaciones.</p>';
            }
        }

        // Cargar conversaciones de WhatsApp
        loadConversations();
    }

    /**
     * Formatea minutos decimales a formato legible.
     * Ejemplo: 80.5 -> "1h 20min 30seg"
     *          0.80 -> "48seg"
     *          125  -> "2h 5min"
     * 
     * @param {number|string} totalMinutes - Minutos a formatear.
     * @returns {string} Tiempo formateado en formato legible.
     */
    function formatMinutesToReadable(totalMinutes) {
        var minutes = parseFloat(String(totalMinutes));

        if (isNaN(minutes) || minutes <= 0) {
            return '0min';
        }

        // Convertir minutos totales a segundos para mayor precisión
        var totalSeconds = Math.round(minutes * 60);

        var hours = Math.floor(totalSeconds / 3600);
        var remainingAfterHours = totalSeconds % 3600;
        var mins = Math.floor(remainingAfterHours / 60);
        var secs = remainingAfterHours % 60;

        var parts = [];

        if (hours > 0) {
            parts.push(hours + 'h');
        }

        if (mins > 0) {
            parts.push(mins + 'min');
        }

        // Solo mostrar segundos si no hay horas y hay segundos
        if (secs > 0 && hours === 0) {
            parts.push(secs + 'seg');
        }

        return parts.length > 0 ? parts.join(' ') : '0min';
    }

    /**
     * Actualiza los indicadores de estadisticas en el dashboard.
     * 
     * @param {DashboardData} data - Datos recibidos de la API.
     * @returns {void}
     */
    function updateStatisticsDisplay(data) {
        // Actualizar contador de WhatsApp
        var whatsappCount = String(data.whatsappConversaciones || '0');
        DomHelper.setTextContent('val-wa', whatsappCount);

        // Actualizar contadores de llamadas
        var callsData = data.calls || { inbound: 0, outbound: 0, minutes: 0 };
        DomHelper.setTextContent('val-in', String(callsData.inbound || '0'));
        DomHelper.setTextContent('val-out', String(callsData.outbound || '0'));

        // Formatear minutos a formato legible (ej: "1h 20min" en lugar de "80.5")
        var formattedTime = formatMinutesToReadable(callsData.minutes);
        DomHelper.setTextContent('val-mins', formattedTime);
    }

    /**
     * Actualiza la lista de grabaciones en el dashboard.
     * 
     * @param {DashboardData} data - Datos recibidos de la API.
     * @returns {void}
     */
    function updateRecordingsList(data) {
        var recordingsContainer = document.getElementById('recordings-list');

        if (recordingsContainer === null) {
            return;
        }

        // Verificar si hay grabaciones disponibles
        var recordings = data.data;
        var hasRecordings = recordings && recordings.length > 0;

        if (!hasRecordings) {
            var emptyMessage = '<p class="empty">No hay grabaciones o transcripciones disponibles.</p>';
            recordingsContainer.innerHTML = emptyMessage;
            return;
        }

        // Construir HTML de grabaciones
        if (!recordings) {
            return;
        }
        var recordingsHtmlArray = recordings.map(function (recordingItem) {
            return buildRecordingItemHtml(recordingItem);
        });

        var recordingsHtml = recordingsHtmlArray.join('');
        recordingsContainer.innerHTML = recordingsHtml;
    }

    /**
     * Construye el HTML para un item de grabacion individual.
     * 
     * @param {RecordingItem} recordingItem - Datos de la grabacion.
     * @returns {string} HTML del item de grabacion.
     */
    function buildRecordingItemHtml(recordingItem) {
        var formattedDate = new Date(recordingItem.date).toLocaleString();
        var audioUrl = recordingItem.audioUrl || '';
        var transcriptionText = recordingItem.transcription || 'Sin transcripcion disponible.';

        var htmlParts = [
            '<div class="log-item">',
            '  <p><strong>Fecha:</strong> ' + formattedDate + '</p>',
            '  <audio controls src="' + audioUrl + '" style="height:35px; width:100%; max-width:350px;"></audio>',
            '  <p style="background:#f8fafc; padding:10px; border-radius:6px; font-size:0.9rem;">',
            '    <strong>Transcripcion:</strong> ' + transcriptionText,
            '  </p>',
            '</div>'
        ];

        return htmlParts.join('');
    }

    // =========================================================================
    // GESTION DE CONVERSACIONES DE WHATSAPP
    // =========================================================================

    /** @type {Conversation[]} Variable para almacenar las conversaciones cargadas */
    var loadedConversations = [];

    /**
     * Carga las conversaciones de WhatsApp desde la API de Twilio.
     */
    async function loadConversations() {
        var conversationsEndpoint = AppConfig.API_ENDPOINTS.TWILIO_CONVERSATIONS;

        if (!conversationsEndpoint) {
            console.warn('loadConversations: Endpoint de conversaciones no configurado.');
            return;
        }

        var chatListItems = document.getElementById('chat-list-items');
        if (chatListItems) {
            chatListItems.innerHTML = '<p class="empty">Cargando conversaciones...</p>';
        }

        var response = await ApiClient.get(conversationsEndpoint);

        if (response === null || !response.success) {
            console.error('loadConversations: No se pudieron cargar las conversaciones.');
            if (chatListItems) {
                chatListItems.innerHTML = '<p class="empty">Error al cargar conversaciones.</p>';
            }
            return;
        }

        loadedConversations = response.conversations || [];

        // Actualizar contador
        var countBadge = document.getElementById('conversations-count');
        if (countBadge) {
            countBadge.textContent = String(response.totalConversations || 0);
        }

        renderConversationsList(loadedConversations);

        // Configurar búsqueda
        /** @type {HTMLInputElement|null} */
        var searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('chat-search'));
        if (searchInput) {
            searchInput.addEventListener('input', function (event) {
                /** @type {HTMLInputElement} */
                var inputElement = /** @type {HTMLInputElement} */ (event.currentTarget);
                var query = inputElement.value.toLowerCase();
                var filtered = loadedConversations.filter(function (conv) {
                    return conv.phoneNumber.toLowerCase().includes(query);
                });
                renderConversationsList(filtered);
            });
        }
    }

    /**
     * Renderiza la lista de conversaciones.
     * 
     * @param {Conversation[]} conversations - Lista de conversaciones.
     * @returns {void}
     */
    function renderConversationsList(conversations) {
        var container = document.getElementById('chat-list-items');
        if (!container) return;

        if (!conversations || conversations.length === 0) {
            container.innerHTML = '<p class="empty">No hay conversaciones disponibles.</p>';
            return;
        }

        var htmlParts = conversations.map(function (conv, index) {
            var lastMessage = conv.messages[conv.messages.length - 1];
            var preview = lastMessage ? lastMessage.body : 'Sin mensajes';
            var time = formatConversationTime(conv.lastMessageDate);
            var initials = getInitials(conv.phoneNumber);

            return [
                '<div class="chat-item" data-index="' + index + '">',
                '  <div class="chat-avatar">' + initials + '</div>',
                '  <div class="chat-info">',
                '    <div class="chat-info-header">',
                '      <span class="chat-name">' + conv.phoneNumber + '</span>',
                '      <span class="chat-time">' + time + '</span>',
                '    </div>',
                '    <div class="chat-preview">' + escapeHtml(preview.substring(0, 50)) + (preview.length > 50 ? '...' : '') + '</div>',
                '  </div>',
                '</div>'
            ].join('');
        });

        container.innerHTML = htmlParts.join('');

        // Añadir event listeners a cada item
        var items = container.querySelectorAll('.chat-item');
        items.forEach(function (item) {
            item.addEventListener('click', function () {
                var idx = parseInt(item.getAttribute('data-index') || '0', 10);
                selectConversation(idx, /** @type {HTMLElement} */(item));
            });
        });
    }

    /**
     * Selecciona una conversación y muestra sus mensajes.
     * 
     * @param {number} index - Índice de la conversación.
     * @param {HTMLElement} element - Elemento del DOM clickeado.
     */
    function selectConversation(index, element) {
        // Remover clase active de todos
        var allItems = document.querySelectorAll('.chat-item');
        allItems.forEach(function (item) {
            item.classList.remove('active');
        });

        // Añadir clase active al seleccionado
        if (element) {
            element.classList.add('active');
        }

        var conversation = loadedConversations[index];
        if (!conversation) return;

        // Actualizar header
        var header = document.getElementById('chat-messages-header');
        if (header) {
            header.innerHTML = '<span class="chat-contact-name">' + conversation.phoneNumber + '</span>';
        }

        renderConversationMessages(conversation.messages);
    }

    /**
     * Renderiza los mensajes de una conversación.
     * 
     * @param {WhatsAppMessage[]} messages - Lista de mensajes.
     */
    function renderConversationMessages(messages) {
        var container = document.getElementById('chat-messages-body');
        if (!container) return;

        if (!messages || messages.length === 0) {
            container.innerHTML = '<p class="empty">No hay mensajes en esta conversación.</p>';
            return;
        }

        var htmlParts = messages.map(function (msg) {
            var time = new Date(msg.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            var statusClass = msg.direction === 'outbound' ? 'status-' + msg.status : '';

            return [
                '<div class="message-bubble ' + msg.direction + '">',
                '  <div class="message-body">' + escapeHtml(msg.body) + '</div>',
                '  <div class="message-time">',
                '    ' + time,
                '    <span class="message-status ' + statusClass + '"></span>',
                '  </div>',
                '</div>'
            ].join('');
        });

        container.innerHTML = htmlParts.join('');

        // Scroll al final
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Formatea la fecha de la conversación para mostrar.
     * 
     * @param {string} dateString - Fecha en formato ISO.
     * @returns {string} Fecha formateada.
     */
    function formatConversationTime(dateString) {
        var date = new Date(dateString);
        var now = new Date();
        var diff = now.getTime() - date.getTime();
        var oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < (2 * oneDay)) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        }
    }

    /**
     * Obtiene las iniciales de un número de teléfono.
     * 
     * @param {string} phoneNumber - Número de teléfono.
     * @returns {string} Iniciales.
     */
    function getInitials(phoneNumber) {
        // Usar los últimos 2 dígitos como "iniciales"
        return phoneNumber.slice(-2);
    }

    /**
     * Escapa caracteres HTML para prevenir XSS.
     * 
     * @param {string} text - Texto a escapar.
     * @returns {string} Texto escapado.
     */
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // =========================================================================
    // GESTION DEL MODAL DE RECUPERACION DE CONTRASEÑA
    // =========================================================================

    /**
     * Maneja el clic en el enlace "Olvidé mi contraseña".
     * Muestra el modal de recuperación.
     * 
     * @param {Event} clickEvent - Evento de clic.
     */
    function handleForgotPasswordClick(clickEvent) {
        clickEvent.preventDefault();
        showRecoveryModal();
    }

    /**
     * Maneja el envío del formulario de recuperación de contraseña.
     * Envía el email al webhook configurado en n8n.
     * 
     * @param {Event} submitEvent - Evento de submit del formulario.
     */
    async function handleForgotPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var usernameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-username'));
        /** @type {HTMLInputElement|null} */
        var passwordInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-new-password'));

        if (!usernameInput || !passwordInput) {
            return;
        }

        var username = usernameInput.value.trim();
        var newPassword = passwordInput.value.trim();

        // Validar que los campos no estén vacíos
        if (!username || !newPassword) {
            showRecoveryMessage('Por favor, completa todos los campos.', 'error');
            return;
        }

        // Verificar que el webhook esté configurado
        var webhookUrl = AppConfig.API_ENDPOINTS.FORGOT_PASSWORD;

        if (!webhookUrl) {
            showRecoveryMessage('El servicio de recuperación no está configurado. Contacta al administrador.', 'error');
            return;
        }

        // Deshabilitar el formulario mientras se procesa
        if (!forgotPasswordForm) {
            return;
        }

        /** @type {HTMLButtonElement|null} */
        var submitButton = /** @type {HTMLButtonElement|null} */ (forgotPasswordForm.querySelector('button[type="submit"]'));
        if (!submitButton) {
            return;
        }

        var originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Procesando...';

        try {
            // Payload para n8n: usuario y nueva contraseña
            var payload = {
                username: username,
                "new-password": newPassword
            };

            var response = await ApiClient.post(webhookUrl, payload);

            if (response !== null) {
                // Asumimos éxito si la respuesta es OK, n8n debe manejar la lógica y devolver JSON
                // Si n8n devuelve { success: false }, ApiClient podría no capturarlo como error http,
                // así que verificamos si hay propiedad success en response si es un objeto.

                if (response.success === false) {
                    showRecoveryMessage(response.message || 'No se pudo actualizar la contraseña.', 'error');
                } else {
                    showRecoveryMessage('Contraseña actualizada correctamente.', 'success');
                    usernameInput.value = '';
                    passwordInput.value = '';

                    // Cerrar el modal después de 3 segundos
                    setTimeout(function () {
                        hideRecoveryModal();
                    }, 3000);
                }
            } else {
                showRecoveryMessage('Error de conexión. Intenta de nuevo más tarde.', 'error');
            }
        } catch (error) {
            console.error('Error en cambio de contraseña:', error);
            showRecoveryMessage('Ocurrió un error. Verifica tu usuario e intenta de nuevo.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }

    /**
     * Muestra el modal de recuperación de contraseña.
     */
    function showRecoveryModal() {
        if (forgotPasswordModal !== null) {
            forgotPasswordModal.style.display = 'flex';
            clearRecoveryMessage();

            // Enfocar el campo de usuario
            var usernameInput = document.getElementById('recovery-username');
            if (usernameInput !== null) {
                usernameInput.focus();
            }
        }
    }

    /**
     * Oculta el modal de recuperación de contraseña.
     */
    function hideRecoveryModal() {
        if (forgotPasswordModal !== null) {
            forgotPasswordModal.style.display = 'none';
            clearRecoveryMessage();

            // Limpiar el formulario
            if (forgotPasswordForm !== null) {
                forgotPasswordForm.reset();
            }
        }
    }

    /**
     * Muestra un mensaje en el modal de recuperación.
     * 
     * @param {string} message - Mensaje a mostrar.
     * @param {string} type - Tipo de mensaje: 'success' o 'error'.
     */
    function showRecoveryMessage(message, type) {
        if (recoveryMessageContainer !== null) {
            recoveryMessageContainer.textContent = message;
            recoveryMessageContainer.className = type;
            recoveryMessageContainer.style.display = 'block';
        }
    }

    /**
     * Limpia el mensaje del modal de recuperación.
     */
    function clearRecoveryMessage() {
        if (recoveryMessageContainer !== null) {
            recoveryMessageContainer.textContent = '';
            recoveryMessageContainer.className = '';
            recoveryMessageContainer.style.display = 'none';
        }
    }

    // =========================================================================
    // FUNCIONES GLOBALES (EXPUESTAS PARA USO EN HTML)
    // =========================================================================

    /**
     * Cierra la sesion del usuario actual.
     * Destruye la sesion y recarga la pagina.
     */
    // @ts-ignore - Expuesta para uso en HTML onclick
    window.logout = function () {
        SessionManager.destroySession();
        window.location.reload();
    };

    /**
     * Recarga los datos del dashboard.
     * Expuesta para el boton de refrescar en la interfaz.
     */
    // @ts-ignore - Expuesta para uso en HTML onclick
    window.loadData = loadDashboardData;

    // =========================================================================
    // PUNTO DE ENTRADA
    // =========================================================================

    // Inicializar la aplicacion cuando el DOM este listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApplication);
    } else {
        initializeApplication();
    }

})();