/**
 * Módulo de conversaciones de WhatsApp.
 * Gestiona la carga y visualización de conversaciones.
 * 
 * @file ConversationsModule.js
 * @requires ApiClient
 * @requires AppConfig
 * @requires TranscriptFormatter
 */

var ConversationsModule = (function () {
    'use strict';

    /** @type {Array<any>} Variable para almacenar las conversaciones cargadas */
    var loadedConversations = [];

    /**
     * Carga las conversaciones de WhatsApp desde la API.
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

        var countBadge = document.getElementById('conversations-count');
        if (countBadge) {
            countBadge.textContent = String(response.totalConversations || 0);
        }

        renderConversationsList(loadedConversations);

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
     * @param {Array<any>} conversations - Lista de conversaciones.
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
                '    <div class="chat-preview">' + TranscriptFormatter.escapeHtml(preview.substring(0, 50)) + (preview.length > 50 ? '...' : '') + '</div>',
                '  </div>',
                '</div>'
            ].join('');
        });

        container.innerHTML = htmlParts.join('');

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
        var allItems = document.querySelectorAll('.chat-item');
        allItems.forEach(function (item) {
            item.classList.remove('active');
        });

        if (element) {
            element.classList.add('active');
        }

        var conversation = loadedConversations[index];
        if (!conversation) return;

        var header = document.getElementById('chat-messages-header');
        if (header) {
            header.innerHTML = '<span class="chat-contact-name">' + conversation.phoneNumber + '</span>';
        }

        renderConversationMessages(conversation.messages);
    }

    /**
     * Renderiza los mensajes de una conversación.
     * 
     * @param {Array<any>} messages - Lista de mensajes.
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
                '  <div class="message-body">' + TranscriptFormatter.escapeHtml(msg.body) + '</div>',
                '  <div class="message-time">',
                '    ' + time,
                '    <span class="message-status ' + statusClass + '"></span>',
                '  </div>',
                '</div>'
            ].join('');
        });

        container.innerHTML = htmlParts.join('');
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
        return phoneNumber.slice(-2);
    }

    // API pública
    return {
        loadConversations: loadConversations
    };

})();
