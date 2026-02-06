/**
 * Calls history module.
 * Loads and renders calls table and transcript modal.
 *
 * @file CallsModule.js
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
    /** @type {Array<string>} */
    var formattedTranscripts = [];
    /** @type {boolean} */
    var eventsAttached = false;

    attachGlobalEvents();

    function attachGlobalEvents() {
        if (eventsAttached) {
            return;
        }

        eventsAttached = true;

        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            var transcriptButton = target.closest('.transcript-toggle[data-call-index]');
            if (transcriptButton !== null) {
                var index = parseInt(transcriptButton.getAttribute('data-call-index') || '-1', 10);
                if (index >= 0) {
                    openTranscriptModal(index);
                }
                return;
            }

            var closeButton = target.closest('[data-action="close-transcript-modal"]');
            if (closeButton !== null) {
                closeTranscriptModal();
                return;
            }

            var modal = document.getElementById('transcript-modal');
            if (modal !== null && target === modal) {
                closeTranscriptModal();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeTranscriptModal();
            }
        });
    }

    function loadCallHistory() {
        var tableBody = document.getElementById('calls-table-body');
        if (tableBody === null) {
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7" class="calls-loading">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>' +
            'Cargando llamadas...</td></tr>';

        ApiClient.get(AppConfig.API_ENDPOINTS.RETELL_CALLS)
            .then(function (response) {
                var parsedResponse = response;
                if (typeof parsedResponse === 'string') {
                    try {
                        parsedResponse = JSON.parse(parsedResponse);
                    } catch (parseError) {
                        renderCallsTable([]);
                        return;
                    }
                }

                /** @type {CallData[]} */
                var allCalls = [];
                if (parsedResponse && Array.isArray(parsedResponse.data)) {
                    allCalls = parsedResponse.data;
                } else if (Array.isArray(parsedResponse)) {
                    allCalls = parsedResponse;
                }

                if (AppConfig.RETELL_AGENT_ID) {
                    loadedCalls = allCalls.filter(function (
                        /** @type {CallData} */ call
                    ) {
                        return call.agent_id === AppConfig.RETELL_AGENT_ID;
                    });
                } else {
                    loadedCalls = allCalls;
                }

                renderCallsTable(loadedCalls);
            })
            .catch(function (error) {
                console.error('Error cargando historial de llamadas:', error);
                if (tableBody === null) {
                    return;
                }
                tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                    'stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle>' +
                    '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' +
                    '<p>Error al cargar las llamadas. Intenta de nuevo.</p></td></tr>';
            });
    }

    /**
     * @param {CallData[]} calls
     */
    function renderCallsTable(calls) {
        var tableBody = document.getElementById('calls-table-body');
        if (tableBody === null) {
            return;
        }

        formattedTranscripts = [];

        if (!calls || calls.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="calls-table-empty">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" ' +
                'stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"></path></svg>' +
                '<p>No hay llamadas registradas.</p></td></tr>';
            return;
        }

        var rows = calls.map(function (call, index) {
            var callDate = resolveCallDate(call);
            var dateText = callDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            var timeText = callDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            var phone = call.phone || call.from_number || call.to_number || call.caller_number || '-';
            var callDuration = resolveCallDuration(call);

            var status = call.status || call.call_status || 'completed';
            var statusClass = getCallStatusClass(status);
            var statusLabel = TranscriptFormatter.escapeHtml(getCallStatusLabel(status));

            var audioUrl = call.recording_url || '';
            var recordingHtml = audioUrl
                ? '<audio controls class="call-audio"><source src="' + TranscriptFormatter.escapeHtml(audioUrl) + '" type="audio/wav"></audio>'
                : '<span class="text-muted">-</span>';

            var transcript = call.transcript || '';
            var hasTranscript = transcript && transcript !== 'Sin transcripcion';
            if (hasTranscript) {
                formattedTranscripts[index] = TranscriptFormatter.format(transcript);
            }

            var transcriptHtml = hasTranscript
                ? '<button class="transcript-toggle" type="button" data-call-index="' + index + '">Ver</button>'
                : '<span class="text-muted">-</span>';

            return '<tr>' +
                '<td>' + dateText + '</td>' +
                '<td>' + timeText + '</td>' +
                '<td class="call-phone">' + TranscriptFormatter.escapeHtml(phone) + '</td>' +
                '<td class="call-duration">' + callDuration + '</td>' +
                '<td><span class="call-status ' + statusClass + '">' + statusLabel + '</span></td>' +
                '<td class="hide-mobile">' + recordingHtml + '</td>' +
                '<td class="hide-mobile">' + transcriptHtml + '</td>' +
                '</tr>';
        });

        tableBody.innerHTML = rows.join('');
    }

    /**
     * @param {CallData} call
     * @returns {Date}
     */
    function resolveCallDate(call) {
        var possibleDate = call.date || call.created_at || '';

        if (call.start_timestamp) {
            var timestampDate = new Date(call.start_timestamp);
            if (!isNaN(timestampDate.getTime())) {
                return timestampDate;
            }
        }

        var parsedDate = new Date(possibleDate);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }

        return new Date();
    }

    /**
     * @param {CallData} call
     * @returns {string}
     */
    function resolveCallDuration(call) {
        if (call.duration_ms) {
            return formatCallDuration(call.duration_ms);
        }

        if (call.duration) {
            return formatCallDuration(call.duration * 1000);
        }

        if (call.call_duration) {
            return formatCallDuration(call.call_duration * 1000);
        }

        return '0:00';
    }

    /**
     * @param {number} durationMs
     * @returns {string}
     */
    function formatCallDuration(durationMs) {
        if (!durationMs || durationMs <= 0) {
            return '0:00';
        }

        var totalSeconds = Math.floor(durationMs / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    /**
     * @param {string} status
     * @returns {string}
     */
    function getCallStatusClass(status) {
        /** @type {{ [key: string]: string }} */
        var statusMap = {
            completed: 'completed',
            ended: 'completed',
            answered: 'completed',
            missed: 'missed',
            'no-answer': 'missed',
            failed: 'failed',
            busy: 'failed',
            'in-progress': 'in-progress',
            ringing: 'in-progress'
        };

        return statusMap[status] || 'completed';
    }

    /**
     * @param {string} status
     * @returns {string}
     */
    function getCallStatusLabel(status) {
        /** @type {{ [key: string]: string }} */
        var labelMap = {
            completed: 'Completada',
            ended: 'Terminada',
            answered: 'Contestada',
            missed: 'Perdida',
            'no-answer': 'Sin respuesta',
            failed: 'Fallida',
            busy: 'Ocupado',
            'in-progress': 'En curso',
            ringing: 'Sonando'
        };

        return labelMap[status] || status;
    }

    /**
     * @param {number} index
     */
    function openTranscriptModal(index) {
        var modal = document.getElementById('transcript-modal');
        var modalBody = document.getElementById('transcript-modal-body');

        if (modal === null || modalBody === null || !formattedTranscripts[index]) {
            return;
        }

        modalBody.innerHTML = formattedTranscripts[index];
        modal.classList.remove('is-hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeTranscriptModal() {
        var modal = document.getElementById('transcript-modal');
        if (modal === null) {
            return;
        }

        modal.classList.add('is-hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    return {
        loadCallHistory: loadCallHistory,
        openTranscriptModal: openTranscriptModal,
        closeTranscriptModal: closeTranscriptModal
    };
})();
