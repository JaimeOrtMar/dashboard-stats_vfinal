/**
 * Módulo de formateo de transcripciones.
 * Convierte transcripciones en formato de conversación visual.
 * 
 * @file TranscriptFormatter.js
 */

var TranscriptFormatter = (function () {
    'use strict';

    /**
     * Formatea una transcripción como conversación con mensajes intercalados.
     * Soporta múltiples formatos:
     * - JSON array de Retell: [{"role": "agent", "content": "..."}, ...]
     * - Texto con prefijos: "Agent: mensaje\nUser: mensaje"
     * - Texto plano: se muestra como bloque formateado
     * 
     * @param {string|Array|Object} transcript - Transcripción en varios formatos.
     * @returns {string} HTML formateado como conversación.
     */
    function format(transcript) {
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
     * 
     * @param {string} text - Texto de la transcripción.
     * @returns {Array} Array de mensajes parseados.
     */
    function parseTextTranscript(text) {
        var messages = [];
        var speakerRegex = /^(Agent|User|AI|Customer|Bot|Cliente|Asistente|Chatbot|Human|Humano|Assistant|Agente):\s*/i;

        var lines = text.split(/\n/);
        var currentSpeaker = '';
        var currentMessage = '';

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;

            var speakerMatch = line.match(speakerRegex);

            if (speakerMatch) {
                if (currentMessage.trim()) {
                    messages.push({
                        speaker: normalizeRole(currentSpeaker),
                        text: currentMessage.trim()
                    });
                }
                currentSpeaker = speakerMatch[1].toLowerCase();
                currentMessage = line.substring(speakerMatch[0].length);
            } else {
                if (currentMessage) {
                    currentMessage += ' ' + line;
                } else {
                    currentMessage = line;
                }
            }
        }

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

    // API pública
    return {
        format: format,
        escapeHtml: escapeHtml
    };

})();
