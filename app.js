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

    /** @type {string} Username para el proceso de reset */
    var resetUsernameValue = '';

    /**
     * Inicializa la aplicacion.
     * Verifica si existe una sesion valida y restaura el estado correspondiente.
     * Vincula los event listeners necesarios.
     */
    function initializeApplication() {
        // Vincular event listeners primero
        attachEventListeners();

        // Verificar si hay un token de reset en la URL
        if (checkForResetToken()) {
            // Si hay token, ya se muestra la vista de reset
            return;
        }

        // Verificar si hay una sesion valida existente
        if (SessionManager.isSessionValid()) {
            displayDashboardView();
            loadDashboardData();
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

        // Event listeners para el formulario de reset de contraseña
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
    // SISTEMA DE PESTAÑAS (TABS)
    // =========================================================================

    /**
     * Cambia entre pestañas del dashboard.
     * 
     * @param {string} tabName - Nombre del tab a mostrar ('resumen' o 'llamadas').
     * @param {HTMLElement} clickedElement - Elemento de navegación clickeado.
     */
    function switchTab(tabName, clickedElement) {
        // Ocultar todos los tabs
        var allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(function (tab) {
            tab.classList.remove('active');
        });

        // Quitar clase active de todos los enlaces de navegación
        var allNavLinks = document.querySelectorAll('.sidebar nav .nav-link');
        allNavLinks.forEach(function (link) {
            link.classList.remove('active');
        });

        // Mostrar el tab seleccionado
        var selectedTab = document.getElementById('tab-' + tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Marcar enlace como activo
        if (clickedElement) {
            clickedElement.classList.add('active');
        }

        // Si es el tab de llamadas, cargar los datos
        if (tabName === 'llamadas') {
            loadCallHistory();
        }
    }

    // Exponer switchTab globalmente para onclick en HTML
    // @ts-ignore
    window.switchTab = switchTab;

    // =========================================================================
    // HISTORIAL DE LLAMADAS
    // =========================================================================

    /** @type {Array<Object>} */
    var loadedCalls = [];

    /**
     * Carga el historial de llamadas desde la API.
     */
    function loadCallHistory() {
        var tableBody = document.getElementById('calls-table-body');
        if (!tableBody) return;

        // Mostrar loading
        tableBody.innerHTML = '<tr><td colspan="7" class="calls-loading">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>' +
            'Cargando llamadas...</td></tr>';

        ApiClient.get(AppConfig.API_ENDPOINTS.RETELL_CALLS)
            .then(function (response) {
                // Si la respuesta viene como string, parsearla a JSON
                var parsedResponse = response;
                if (typeof response === 'string') {
                    try {
                        parsedResponse = JSON.parse(response);
                    } catch (parseError) {
                        renderCallsTable([]);
                        return;
                    }
                }

                // La API devuelve { success: true, data: [...] }
                var allCalls = [];
                if (parsedResponse && parsedResponse.data && Array.isArray(parsedResponse.data)) {
                    allCalls = parsedResponse.data;
                } else if (parsedResponse && Array.isArray(parsedResponse)) {
                    allCalls = parsedResponse;
                }

                // Filtrar por agent_id configurado
                var agentId = AppConfig.RETELL_AGENT_ID;
                if (agentId) {
                    loadedCalls = allCalls.filter(function (call) {
                        return call.agent_id === agentId;
                    });
                } else {
                    loadedCalls = allCalls;
                }

                renderCallsTable(loadedCalls);
            })
            .catch(function (error) {
                console.error('Error cargando historial de llamadas:', error);
                tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                    'stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle>' +
                    '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                    '<p>Error al cargar las llamadas. Intenta de nuevo.</p></td></tr>';
            });
    }

    /**
     * Renderiza la tabla de historial de llamadas.
     * 
     * @param {Array<Object>} calls - Lista de llamadas.
     */
    function renderCallsTable(calls) {
        var tableBody = document.getElementById('calls-table-body');
        if (!tableBody) {
            return;
        }

        if (!calls || calls.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                'stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"></path></svg>' +
                '<p>No hay llamadas registradas.</p></td></tr>';
            return;
        }

        try {
            var rows = calls.map(function (call, index) {
                // Usar los campos reales de la API
                var date = new Date(call.date || call.start_timestamp || call.created_at || new Date());
                var dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                var timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                // Teléfono - la API de Retell no incluye este campo
                var phone = call.phone || call.from_number || call.to_number || call.caller_number || '-';

                // Duración - puede venir en diferentes formatos
                var duration = '0:00';
                if (call.duration_ms) {
                    duration = formatCallDuration(call.duration_ms);
                } else if (call.duration) {
                    // Si duration está en segundos
                    duration = formatCallDuration(call.duration * 1000);
                } else if (call.call_duration) {
                    duration = formatCallDuration(call.call_duration * 1000);
                }

                // Estado de la llamada
                var status = call.status || call.call_status || 'completed';
                var statusClass = getCallStatusClass(status);
                var statusLabel = getCallStatusLabel(status);

                // Grabación - usar recording_url (campo de la API)
                var audioUrl = call.recording_url || '';
                var recordingHtml = audioUrl
                    ? '<audio controls class="call-audio"><source src="' + audioUrl + '" type="audio/wav"></audio>'
                    : '<span class="text-muted">-</span>';

                // Transcripción - usar transcript (campo de la API)
                var transcript = call.transcript || '';
                var hasTranscript = transcript && transcript !== 'Sin transcripción';
                var transcriptHtml = hasTranscript
                    ? '<button class="transcript-toggle" onclick="toggleTranscript(' + index + ')">Ver</button>' +
                    '<div id="transcript-' + index + '" class="transcript-content">' + formatTranscriptAsConversation(transcript) + '</div>'
                    : '<span class="text-muted">-</span>';

                return '<tr>' +
                    '<td>' + dateStr + '</td>' +
                    '<td>' + timeStr + '</td>' +
                    '<td class="call-phone">' + escapeHtml(phone) + '</td>' +
                    '<td class="call-duration">' + duration + '</td>' +
                    '<td><span class="call-status ' + statusClass + '">' + statusLabel + '</span></td>' +
                    '<td class="hide-mobile">' + recordingHtml + '</td>' +
                    '<td class="hide-mobile">' + transcriptHtml + '</td>' +
                    '</tr>';
            });

            tableBody.innerHTML = rows.join('');
        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                '<p>Error al mostrar las llamadas.</p></td></tr>';
        }
    }

    /**
     * Formatea la duración de una llamada.
     * 
     * @param {number} durationMs - Duración en milisegundos.
     * @returns {string} Duración formateada.
     */
    function formatCallDuration(durationMs) {
        if (!durationMs || durationMs === 0) return '0:00';

        var totalSeconds = Math.floor(durationMs / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    /**
     * Obtiene la clase CSS para el estado de llamada.
     * 
     * @param {string} status - Estado de la llamada.
     * @returns {string} Clase CSS.
     */
    function getCallStatusClass(status) {
        var statusMap = {
            'completed': 'completed',
            'ended': 'completed',
            'answered': 'completed',
            'missed': 'missed',
            'no-answer': 'missed',
            'failed': 'failed',
            'busy': 'failed',
            'in-progress': 'in-progress',
            'ringing': 'in-progress'
        };
        return statusMap[status] || 'completed';
    }

    /**
     * Obtiene la etiqueta legible para el estado de llamada.
     * 
     * @param {string} status - Estado de la llamada.
     * @returns {string} Etiqueta.
     */
    function getCallStatusLabel(status) {
        var labelMap = {
            'completed': 'Completada',
            'ended': 'Terminada',
            'answered': 'Contestada',
            'missed': 'Perdida',
            'no-answer': 'Sin respuesta',
            'failed': 'Fallida',
            'busy': 'Ocupado',
            'in-progress': 'En curso',
            'ringing': 'Sonando'
        };
        return labelMap[status] || status;
    }

    /**
     * Formatea una transcripción como conversación con mensajes intercalados.
     * Soporta múltiples formatos:
     * - JSON array de Retell: [{"role": "agent", "content": "..."}, ...]
     * - Texto con prefijos: "Agent: mensaje\nUser: mensaje"
     * - Texto plano: se divide en oraciones y alterna speakers
     * 
     * @param {string|Array|Object} transcript - Transcripción en varios formatos.
     * @returns {string} HTML formateado como conversación.
     */
    function formatTranscriptAsConversation(transcript) {
        if (!transcript) return '';

        var messages = [];

        // CASO 1: Si es un array de objetos (formato Retell)
        if (Array.isArray(transcript)) {
            messages = parseRetellArray(transcript);
        }
        // CASO 2: Si es un string que parece JSON, intentar parsearlo
        else if (typeof transcript === 'string') {
            var trimmed = transcript.trim();

            // Intentar parsear como JSON
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    var parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        messages = parseRetellArray(parsed);
                    } else if (parsed.transcript && Array.isArray(parsed.transcript)) {
                        messages = parseRetellArray(parsed.transcript);
                    }
                } catch (e) {
                    // No es JSON válido, continuar con parsing de texto
                }
            }

            // Si no se obtuvieron mensajes del JSON, intentar parsing de texto
            if (messages.length === 0) {
                messages = parseTextTranscript(trimmed);
            }
        }

        // Si no se detectaron mensajes, mostrar texto plano formateado
        if (messages.length === 0) {
            var plainText = typeof transcript === 'string' ? transcript : JSON.stringify(transcript);
            return '<div class="transcript-plain">' + escapeHtml(plainText) + '</div>';
        }

        // Generar HTML de conversación
        return generateConversationHtml(messages);
    }

    /**
     * Parsea un array de objetos de Retell.
     * Formatos soportados:
     * - {role: "agent|user", content: "..."}
     * - {speaker: "agent|user", text: "..."}
     * - {type: "agent|user", message: "..."}
     * 
     * @param {Array} transcriptArray - Array de objetos de transcripción.
     * @returns {Array} Array de mensajes parseados.
     */
    function parseRetellArray(transcriptArray) {
        var messages = [];

        for (var i = 0; i < transcriptArray.length; i++) {
            var item = transcriptArray[i];
            var speaker = '';
            var text = '';

            // Detectar el campo del hablante
            if (item.role) {
                speaker = item.role.toLowerCase();
            } else if (item.speaker) {
                speaker = item.speaker.toLowerCase();
            } else if (item.type) {
                speaker = item.type.toLowerCase();
            }

            // Detectar el campo del texto
            if (item.content) {
                text = item.content;
            } else if (item.text) {
                text = item.text;
            } else if (item.message) {
                text = item.message;
            } else if (item.words) {
                // Formato Retell con array de palabras
                text = item.words.map(function (w) { return w.word || w; }).join(' ');
            }

            if (text && text.trim()) {
                messages.push({
                    speaker: normalizeRole(speaker),
                    text: text.trim()
                });
            }
        }

        return messages;
    }

    /**
     * Parsea una transcripción de texto para extraer mensajes.
     * Detecta patrones como "Agent:", "User:", etc.
     * 
     * @param {string} text - Texto de la transcripción.
     * @returns {Array} Array de mensajes parseados.
     */
    function parseTextTranscript(text) {
        var messages = [];

        // Patrones para detectar hablantes en texto
        var speakerRegex = /^(Agent|User|AI|Customer|Bot|Cliente|Asistente|Chatbot|Human|Humano|Assistant|Agente):\s*/i;

        // Dividir por líneas
        var lines = text.split(/\n/);
        var currentSpeaker = '';
        var currentMessage = '';

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            var speakerMatch = line.match(speakerRegex);

            if (speakerMatch) {
                // Guardar mensaje anterior
                if (currentMessage.trim()) {
                    messages.push({
                        speaker: normalizeRole(currentSpeaker),
                        text: currentMessage.trim()
                    });
                }
                // Nuevo hablante
                currentSpeaker = speakerMatch[1].toLowerCase();
                currentMessage = line.substring(speakerMatch[0].length);
            } else {
                // Continuar mensaje actual o iniciar uno nuevo
                if (currentMessage) {
                    currentMessage += ' ' + line;
                } else {
                    currentMessage = line;
                }
            }
        }

        // Agregar último mensaje
        if (currentMessage.trim()) {
            messages.push({
                speaker: normalizeRole(currentSpeaker),
                text: currentMessage.trim()
            });
        }

        return messages;
    }

    /**
     * Normaliza el rol/speaker a 'agent' o 'user'.
     * 
     * @param {string} role - Rol original.
     * @returns {string} 'agent' o 'user'.
     */
    function normalizeRole(role) {
        var agentRoles = ['agent', 'ai', 'bot', 'asistente', 'chatbot', 'assistant', 'agente'];
        return agentRoles.indexOf(role) !== -1 ? 'agent' : 'user';
    }

    /**
     * Genera el HTML de la conversación a partir de los mensajes.
     * 
     * @param {Array} messages - Array de mensajes con speaker y text.
     * @returns {string} HTML de la conversación.
     */
    function generateConversationHtml(messages) {
        var html = '<div class="transcript-conversation">';

        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isAgent = msg.speaker === 'agent';
            var bubbleClass = isAgent ? 'transcript-bubble agent' : 'transcript-bubble user';
            var speakerLabel = isAgent ? 'Chatbot' : 'Cliente';

            html += '<div class="' + bubbleClass + '">';
            html += '<span class="transcript-speaker">' + speakerLabel + '</span>';
            html += '<p class="transcript-text">' + escapeHtml(msg.text) + '</p>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Alterna la visibilidad de una transcripción.
     * 
     * @param {number} index - Índice de la llamada.
     */
    function toggleTranscript(index) {
        var element = document.getElementById('transcript-' + index);
        if (element) {
            element.classList.toggle('show');
        }
    }

    // Exponer toggleTranscript globalmente
    // @ts-ignore
    window.toggleTranscript = toggleTranscript;

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
    // GESTION DEL FLUJO DE RECUPERACION DE CONTRASEÑA
    // =========================================================================

    // Referencias adicionales para el flujo de reset
    /** @type {HTMLElement|null} */
    var resetPasswordView = document.getElementById('reset-password-view');
    /** @type {HTMLFormElement|null} */
    var resetPasswordForm = /** @type {HTMLFormElement|null} */ (document.getElementById('reset-password-form'));
    /** @type {HTMLElement|null} */
    var resetMessageContainer = document.getElementById('reset-message');
    /** @type {HTMLAnchorElement|null} */
    var backToLoginLink = /** @type {HTMLAnchorElement|null} */ (document.getElementById('back-to-login-link'));

    /** @type {string|null} Token de reset extraído de la URL */
    var resetToken = null;

    /**
     * Verifica si hay un token de reset en la URL al cargar la página.
     * Si existe, muestra la vista de reset de contraseña.
     */
    function checkForResetToken() {
        var urlParams = new URLSearchParams(window.location.search);
        var token = urlParams.get('reset_token');
        var username = urlParams.get('username');

        if (token && username) {
            resetToken = token;
            // Guardar el username para usarlo después
            resetUsernameValue = username;
            showResetPasswordView();
            return true;
        }
        return false;
    }

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
     * Envía SOLO el usuario al webhook de n8n para que envíe el email.
     * 
     * @param {Event} submitEvent - Evento de submit del formulario.
     */
    async function handleForgotPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var usernameInput = /** @type {HTMLInputElement|null} */ (document.getElementById('recovery-username'));

        if (!usernameInput) {
            return;
        }

        var username = usernameInput.value.trim();

        // Validar que el campo no esté vacío
        if (!username) {
            showRecoveryMessage('Por favor, ingresa tu nombre de usuario.', 'error');
            return;
        }

        // Verificar que el webhook esté configurado
        var webhookUrl = AppConfig.API_ENDPOINTS.REQUEST_PASSWORD_RESET;

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

        var originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Enviando...';

        try {
            // Payload para n8n: solo el usuario
            // n8n buscará el email asociado y enviará el link de reset
            var payload = {
                username: username,
                // Incluir la URL base para que n8n pueda construir el link de reset
                resetBaseUrl: window.location.origin + window.location.pathname
            };

            var response = await ApiClient.post(webhookUrl, payload);

            if (response !== null) {
                if (response.success === false) {
                    showRecoveryMessage(response.message || 'No se encontró el usuario. Verifica e intenta de nuevo.', 'error');
                } else {
                    // Éxito: mostrar mensaje de que se envió el email
                    showRecoveryMessage('📧 Se ha enviado un email con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada.', 'success');
                    usernameInput.value = '';

                    // Cerrar el modal después de 5 segundos
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
     * Recibe la nueva contraseña y la envía junto con el token a n8n.
     * 
     * @param {Event} submitEvent - Evento de submit del formulario.
     */
    async function handleResetPasswordSubmit(submitEvent) {
        submitEvent.preventDefault();

        /** @type {HTMLInputElement|null} */
        var newPasswordInput = /** @type {HTMLInputElement|null} */ (document.getElementById('new-password'));
        /** @type {HTMLInputElement|null} */
        var confirmPasswordInput = /** @type {HTMLInputElement|null} */ (document.getElementById('confirm-password'));

        if (!newPasswordInput || !confirmPasswordInput) {
            return;
        }

        var newPassword = newPasswordInput.value;
        var confirmPassword = confirmPasswordInput.value;

        // Validar que los campos no estén vacíos
        if (!newPassword || !confirmPassword) {
            showResetMessage('Por favor, completa ambos campos.', 'error');
            return;
        }

        // Validar que las contraseñas coincidan
        if (newPassword !== confirmPassword) {
            showResetMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        // Validar longitud mínima
        if (newPassword.length < AppConfig.VALIDATION.PASSWORD_MIN_LENGTH) {
            showResetMessage('La contraseña debe tener al menos ' + AppConfig.VALIDATION.PASSWORD_MIN_LENGTH + ' caracteres.', 'error');
            return;
        }

        // Verificar que el webhook esté configurado
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
        if (!submitButton) {
            return;
        }

        var originalButtonHtml = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Procesando...';

        try {
            // Payload para n8n: token, username y nueva contraseña
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
                    // Éxito
                    showResetMessage('✅ ¡Contraseña actualizada correctamente! Redirigiendo al login...', 'success');

                    // Limpiar el token de la URL y redirigir al login
                    setTimeout(function () {
                        // Limpiar la URL quitando los parámetros
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

    /**
     * Muestra la vista de reset de contraseña (cuando viene del email).
     */
    function showResetPasswordView() {
        DomHelper.hideElement(loginViewElement);
        DomHelper.hideElement(dashboardViewElement);
        if (resetPasswordView) {
            resetPasswordView.style.display = 'flex';
        }
    }

    /**
     * Oculta la vista de reset y vuelve al login.
     */
    function hideResetPasswordView() {
        if (resetPasswordView) {
            resetPasswordView.style.display = 'none';
        }
        // Limpiar la URL
        var cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        displayLoginView();
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

    /**
     * Muestra un mensaje en la vista de reset.
     * 
     * @param {string} message - Mensaje a mostrar.
     * @param {string} type - Tipo de mensaje: 'success' o 'error'.
     */
    function showResetMessage(message, type) {
        if (resetMessageContainer !== null) {
            resetMessageContainer.textContent = message;
            resetMessageContainer.className = 'alert-' + type;
            resetMessageContainer.style.display = 'block';
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