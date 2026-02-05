/**
 * Módulo del Dashboard.
 * Gestiona la carga y actualización de estadísticas y grabaciones.
 * 
 * @file DashboardModule.js
 * @requires ApiClient
 * @requires DomHelper
 * @requires AppConfig
 */

var DashboardModule = (function () {
    'use strict';

    /**
     * Carga los datos del dashboard desde la API.
     */
    async function loadDashboardData() {
        var statsEndpoint = AppConfig.API_ENDPOINTS.TWILIO_STATS;
        var retellEndpoint = AppConfig.API_ENDPOINTS.RETELL_CALLS;

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
            updateRecordingsList(retellData);
        } else {
            console.error('loadDashboardData: No se pudieron cargar las grabaciones.');
            var recordingsContainer = document.getElementById('recordings-list');
            if (recordingsContainer) {
                recordingsContainer.innerHTML = '<p class="empty">Error al cargar grabaciones.</p>';
            }
        }
    }

    /**
     * Formatea minutos decimales a formato legible.
     * 
     * @param {number|string} totalMinutes - Minutos a formatear.
     * @returns {string} Tiempo formateado.
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
     * Actualiza los indicadores de estadísticas en el dashboard.
     * 
     * @param {Object} data - Datos recibidos de la API.
     */
    function updateStatisticsDisplay(data) {
        var whatsappCount = String(data.whatsappConversaciones || '0');
        DomHelper.setTextContent('val-wa', whatsappCount);

        var callsData = data.calls || { inbound: 0, outbound: 0, minutes: 0 };
        DomHelper.setTextContent('val-in', String(callsData.inbound || '0'));
        DomHelper.setTextContent('val-out', String(callsData.outbound || '0'));

        var formattedTime = formatMinutesToReadable(callsData.minutes);
        DomHelper.setTextContent('val-mins', formattedTime);
    }

    /**
     * Actualiza la lista de grabaciones en el dashboard.
     * 
     * @param {Object} data - Datos recibidos de la API.
     */
    function updateRecordingsList(data) {
        var recordingsContainer = document.getElementById('recordings-list');

        if (recordingsContainer === null) {
            return;
        }

        var recordings = data.data;
        var hasRecordings = recordings && recordings.length > 0;

        if (!hasRecordings) {
            recordingsContainer.innerHTML = '<p class="empty">No hay grabaciones o transcripciones disponibles.</p>';
            return;
        }

        var recordingsHtmlArray = recordings.map(function (recordingItem) {
            return buildRecordingItemHtml(recordingItem);
        });

        recordingsContainer.innerHTML = recordingsHtmlArray.join('');
    }

    /**
     * Construye el HTML para un item de grabación individual.
     * 
     * @param {Object} recordingItem - Datos de la grabación.
     * @returns {string} HTML del item.
     */
    function buildRecordingItemHtml(recordingItem) {
        var formattedDate = new Date(recordingItem.date).toLocaleString();
        var audioUrl = recordingItem.audioUrl || '';
        var transcriptionText = recordingItem.transcription || 'Sin transcripcion disponible.';

        return [
            '<div class="log-item">',
            '  <p><strong>Fecha:</strong> ' + formattedDate + '</p>',
            '  <audio controls src="' + audioUrl + '" style="height:35px; width:100%; max-width:350px;"></audio>',
            '  <p style="background:#f8fafc; padding:10px; border-radius:6px; font-size:0.9rem;">',
            '    <strong>Transcripcion:</strong> ' + transcriptionText,
            '  </p>',
            '</div>'
        ].join('');
    }

    // API pública
    return {
        loadDashboardData: loadDashboardData,
        formatMinutesToReadable: formatMinutesToReadable
    };

})();
