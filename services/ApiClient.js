/**
 * HTTP client for external APIs.
 *
 * @file ApiClient.js
 */

var ApiClient = (function () {
    'use strict';

    /**
     * @template T
     * @param {string} url
     * @param {Object} data
     * @returns {Promise<T|ApiErrorResponse>}
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

            var parsedBody = await parseResponseBody(response);

            if (!response.ok) {
                return {
                    status: 'error',
                    message: extractErrorMessage(parsedBody, response.status)
                };
            }

            return /** @type {T} */ (parsedBody || {});
        } catch (networkError) {
            console.error('ApiClient.post: network error', networkError);
            return {
                status: 'error',
                message: 'No se pudo conectar con el servidor. Verifica tu conexion a internet.'
            };
        }
    }

    /**
     * @template T
     * @param {string} url
     * @returns {Promise<T|null>}
     */
    async function get(url) {
        try {
            var response = await fetch(url);
            var parsedBody = await parseResponseBody(response);

            if (!response.ok) {
                console.error('ApiClient.get: HTTP error', response.status, response.statusText);
                return null;
            }

            return /** @type {T} */ (parsedBody);
        } catch (networkError) {
            console.error('ApiClient.get: network error', networkError);
            return null;
        }
    }

    /**
     * @param {Response} response
     * @returns {Promise<any>}
     */
    async function parseResponseBody(response) {
        var contentTypeHeader = response.headers.get('content-type') || '';
        var isJson = contentTypeHeader.indexOf('application/json') !== -1;

        if (isJson) {
            try {
                return await response.json();
            } catch (jsonParseError) {
                return null;
            }
        }

        var textBody = await response.text();
        if (!textBody) {
            return null;
        }

        try {
            return JSON.parse(textBody);
        } catch (parseError) {
            return {
                message: textBody
            };
        }
    }

    /**
     * @param {any} responseBody
     * @param {number} statusCode
     * @returns {string}
     */
    function extractErrorMessage(responseBody, statusCode) {
        if (responseBody && typeof responseBody.message === 'string' && responseBody.message.trim() !== '') {
            return responseBody.message;
        }

        return 'Error en la comunicacion con el servidor. Codigo: ' + statusCode;
    }

    return {
        post: post,
        get: get
    };
})();
