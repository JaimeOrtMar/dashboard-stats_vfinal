/**
 * Módulo de historial de llamadas.
 * Gestiona la carga y renderizado del historial de llamadas.
 * 
 * @file CallsModule.js
 * @requires TranscriptFormatter
 * @requires ApiClient
 * @requires AppConfig
 */

/**
 * @typedef {Object} CallData
 * @property {string} [agent_id]
 * @property {string} [date]
 * @property {number} [start_timestamp]
 * @property {string} [created_at]
 * @property {string} [phone]
 * @property {string} [from_number]
 * @property {string} [to_number]
 * @property {string} [caller_number]
 * @property {number} [duration_ms]
 * @property {number} [duration]
 * @property {number} [call_duration]
 * @property {string} [status]
 * @property {string} [call_status]
 * @property {string} [recording_url]
 * @property {string} [transcript]
 */

var CallsModule = (function () {
    'use strict';

    /** @type {CallData[]} */
    var loadedCalls = [];

    /** @type {Array<string>} Almacena las transcripciones formateadas para el modal */
    var formattedTranscripts = [];

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
                var parsedResponse = response;
                if (typeof response === 'string') {
                    try {
                        parsedResponse = JSON.parse(response);
                    } catch (parseError) {
                        renderCallsTable([]);
                        return;
                    }
                }

                var allCalls = [];
                if (parsedResponse && parsedResponse.data && Array.isArray(parsedResponse.data)) {
                    allCalls = parsedResponse.data;
                } else if (parsedResponse && Array.isArray(parsedResponse)) {
                    allCalls = parsedResponse;
                }

                var agentId = AppConfig.RETELL_AGENT_ID;
                if (agentId) {
                    loadedCalls = allCalls.filter(/** @param {CallData} call */ function (call) {
                        return call.agent_id === agentId;
                    });
                } else {
                    loadedCalls = allCalls;
                }

                renderCallsTable(loadedCalls);
            })
            .catch(function (error) {
                console.error('Error cargando historial de llamadas:', error);
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                    'stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle>' +
                    '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                    '<p>Error al cargar las llamadas. Intenta de nuevo.</p></td></tr>';
            });
    }

    /**
     * Renderiza la tabla de historial de llamadas.
     * 
     * @param {CallData[]} calls - Lista de llamadas.
     */
    function renderCallsTable(calls) {
        var tableBody = document.getElementById('calls-table-body');
        if (!tableBody) return;

        if (!calls || calls.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                'stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"></path></svg>' +
                '<p>No hay llamadas registradas.</p></td></tr>';
            return;
        }

        try {
            var rows = calls.map(function (call, index) {
                var date = new Date(call.date || call.start_timestamp || call.created_at || new Date());
                var dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                var timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                var phone = call.phone || call.from_number || call.to_number || call.caller_number || '-';

                var duration = '0:00';
                if (call.duration_ms) {
                    duration = formatCallDuration(call.duration_ms);
                } else if (call.duration) {
                    duration = formatCallDuration(call.duration * 1000);
                } else if (call.call_duration) {
                    duration = formatCallDuration(call.call_duration * 1000);
                }

                var status = call.status || call.call_status || 'completed';
                var statusClass = getCallStatusClass(status);
                var statusLabel = getCallStatusLabel(status);

                var audioUrl = call.recording_url || '';
                var recordingHtml = audioUrl
                    ? '<audio controls class="call-audio"><source src="' + audioUrl + '" type="audio/wav"></audio>'
                    : '<span class="text-muted">-</span>';

                var transcript = call.transcript || '';
                var hasTranscript = transcript && transcript !== 'Sin transcripción';

                if (hasTranscript) {
                    formattedTranscripts[index] = TranscriptFormatter.format(transcript);
                }

                var transcriptHtml = hasTranscript
                    ? '<button class="transcript-toggle" onclick="CallsModule.openTranscriptModal(' + index + ')">Ver</button>'
                    : '<span class="text-muted">-</span>';

                return '<tr>' +
                    '<td>' + dateStr + '</td>' +
                    '<td>' + timeStr + '</td>' +
                    '<td class="call-phone">' + TranscriptFormatter.escapeHtml(phone) + '</td>' +
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
        /** @type {{[key: string]: string}} */
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
        /** @type {{[key: string]: string}} */
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
     * Abre el modal de transcripción.
     * 
     * @param {number} index - Índice de la llamada.
     */
    function openTranscriptModal(index) {
        var modal = document.getElementById('transcript-modal');
        var modalBody = document.getElementById('transcript-modal-body');

        if (modal && modalBody && formattedTranscripts[index]) {
            modalBody.innerHTML = formattedTranscripts[index];
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Cierra el modal de transcripción.
     */
    function closeTranscriptModal() {
        var modal = document.getElementById('transcript-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Event listeners para el modal
    document.addEventListener('click', function (event) {
        var modal = document.getElementById('transcript-modal');
        if (event.target === modal) {
            closeTranscriptModal();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeTranscriptModal();
        }
    });

    // API pública
    return {
        loadCallHistory: loadCallHistory,
        openTranscriptModal: openTranscriptModal,
        closeTranscriptModal: closeTranscriptModal
    };

})();

// Exponer para uso en HTML onclick
// @ts-ignore
window.openTranscriptModal = CallsModule.openTranscriptModal;
// @ts-ignore
window.closeTranscriptModal = CallsModule.closeTranscriptModal;
