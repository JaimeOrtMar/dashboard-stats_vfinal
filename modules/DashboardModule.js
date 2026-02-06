/**
 * Dashboard module.
 * Loads metrics and recordings list.
 *
 * @file DashboardModule.js
 */

var DashboardModule = (function () {
    'use strict';

    async function loadDashboardData() {
        var statsEndpoint = AppConfig.API_ENDPOINTS.TWILIO_STATS;
        var callsEndpoint = AppConfig.API_ENDPOINTS.RETELL_CALLS;

        var responses = await Promise.all([
            ApiClient.get(statsEndpoint),
            ApiClient.get(callsEndpoint)
        ]);

        var statsResponse = responses[0];
        var recordingsResponse = responses[1];

        if (statsResponse !== null) {
            updateStatisticsDisplay(statsResponse);
        } else {
            console.error('DashboardModule.loadDashboardData: failed to load stats.');
        }

        if (recordingsResponse !== null) {
            updateRecordingsList(recordingsResponse);
        } else {
            renderRecordingsError();
        }
    }

    /**
     * @param {number|string} totalMinutes
     * @returns {string}
     */
    function formatMinutesToReadable(totalMinutes) {
        var minutes = parseFloat(String(totalMinutes));
        if (isNaN(minutes) || minutes <= 0) {
            return '0min';
        }

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
        if (secs > 0 && hours === 0) {
            parts.push(secs + 'seg');
        }

        return parts.length > 0 ? parts.join(' ') : '0min';
    }

    /**
     * @param {{ whatsappConversaciones?: number|string, calls?: { inbound?: number|string, outbound?: number|string, minutes?: number|string } }} dashboardData
     */
    function updateStatisticsDisplay(dashboardData) {
        DomHelper.setTextContent('val-wa', String(dashboardData.whatsappConversaciones || '0'));

        var callsData = dashboardData.calls || { inbound: 0, outbound: 0, minutes: 0 };
        DomHelper.setTextContent('val-in', String(callsData.inbound || '0'));
        DomHelper.setTextContent('val-out', String(callsData.outbound || '0'));
        DomHelper.setTextContent('val-mins', formatMinutesToReadable(callsData.minutes || 0));
    }

    /**
     * @param {{ data?: Array<{ date?: string, audioUrl?: string, transcription?: string }> }} recordingsPayload
     */
    function updateRecordingsList(recordingsPayload) {
        var recordingsContainer = document.getElementById('recordings-list');
        if (recordingsContainer === null) {
            return;
        }

        clearContainer(recordingsContainer);

        var recordings = recordingsPayload && Array.isArray(recordingsPayload.data)
            ? recordingsPayload.data
            : [];

        if (recordings.length === 0) {
            appendEmptyMessage(recordingsContainer, 'No hay grabaciones o transcripciones disponibles.');
            return;
        }

        recordings.forEach(function (recordingItem) {
            recordingsContainer.appendChild(buildRecordingItem(recordingItem));
        });
    }

    function renderRecordingsError() {
        var recordingsContainer = document.getElementById('recordings-list');
        if (recordingsContainer === null) {
            return;
        }

        clearContainer(recordingsContainer);
        appendEmptyMessage(recordingsContainer, 'Error al cargar grabaciones.');
    }

    /**
     * @param {{ date?: string, audioUrl?: string, transcription?: string }} recordingItem
     * @returns {HTMLElement}
     */
    function buildRecordingItem(recordingItem) {
        var wrapper = document.createElement('div');
        wrapper.className = 'log-item';

        var dateParagraph = document.createElement('p');
        var dateLabel = document.createElement('strong');
        dateLabel.textContent = 'Fecha:';
        dateParagraph.appendChild(dateLabel);
        dateParagraph.appendChild(document.createTextNode(' ' + formatDate(recordingItem.date)));
        wrapper.appendChild(dateParagraph);

        var audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;
        audioPlayer.style.height = '35px';
        audioPlayer.style.width = '100%';
        audioPlayer.style.maxWidth = '350px';
        if (recordingItem.audioUrl) {
            audioPlayer.src = recordingItem.audioUrl;
        }
        wrapper.appendChild(audioPlayer);

        var transcriptionBlock = document.createElement('p');
        transcriptionBlock.style.background = '#f8fafc';
        transcriptionBlock.style.padding = '10px';
        transcriptionBlock.style.borderRadius = '6px';
        transcriptionBlock.style.fontSize = '0.9rem';

        var transcriptionLabel = document.createElement('strong');
        transcriptionLabel.textContent = 'Transcripcion:';
        transcriptionBlock.appendChild(transcriptionLabel);
        transcriptionBlock.appendChild(
            document.createTextNode(' ' + (recordingItem.transcription || 'Sin transcripcion disponible.'))
        );

        wrapper.appendChild(transcriptionBlock);

        return wrapper;
    }

    /**
     * @param {string|undefined} dateValue
     * @returns {string}
     */
    function formatDate(dateValue) {
        if (!dateValue) {
            return new Date().toLocaleString('es-ES');
        }

        var parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
            return new Date().toLocaleString('es-ES');
        }

        return parsedDate.toLocaleString('es-ES');
    }

    /**
     * @param {HTMLElement} element
     */
    function clearContainer(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * @param {HTMLElement} container
     * @param {string} text
     */
    function appendEmptyMessage(container, text) {
        var paragraph = document.createElement('p');
        paragraph.className = 'empty';
        paragraph.textContent = text;
        container.appendChild(paragraph);
    }

    return {
        loadDashboardData: loadDashboardData,
        formatMinutesToReadable: formatMinutesToReadable
    };
})();
