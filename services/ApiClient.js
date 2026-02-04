/**
 * Cliente HTTP para comunicacion con APIs externas.
 * Centraliza la logica de peticiones y manejo de errores.
 * 
 * @file ApiClient.js
 * @description Proporciona metodos para realizar peticiones HTTP de forma consistente.
 */

var ApiClient = (function () {
    'use strict';

    /**
     * Realiza una peticion HTTP POST.
     * 
     * @template T
     * @param {string} url - URL del endpoint destino.
     * @param {Object} data - Objeto con los datos a enviar en el cuerpo de la peticion.
     * @returns {Promise<T|ApiErrorResponse>} Respuesta parseada como JSON o objeto de error.
     */
    async function post(url, data) {
        try {
            var response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                console.error('ApiClient.post: Error HTTP', response.status, response.statusText);
                return {
                    status: 'error',
                    message: 'Error en la comunicacion con el servidor. Codigo: ' + response.status
                };
            }

            var jsonResponse = await response.json();
            return jsonResponse;

        } catch (networkError) {
            console.error('ApiClient.post: Error de red', networkError);
            return {
                status: 'error',
                message: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.'
            };
        }
    }

    /**
     * Realiza una peticion HTTP GET.
     * 
     * @template T
     * @param {string} url - URL del endpoint destino.
     * @returns {Promise<T|null>} Respuesta parseada como JSON o null si hay error.
     */
    async function get(url) {
        try {
            var response = await fetch(url);

            if (!response.ok) {
                console.error('ApiClient.get: Error HTTP', response.status, response.statusText);
                return null;
            }

            var jsonResponse = await response.json();
            return jsonResponse;

        } catch (networkError) {
            console.error('ApiClient.get: Error de red', networkError);
            return null;
        }
    }

    // API publica del modulo
    return {
        post: post,
        get: get
    };

})();
