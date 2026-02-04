/**
 * Utilidades para manipulacion del DOM.
 * Proporciona funciones auxiliares para operaciones comunes con elementos HTML.
 * 
 * @file DomHelper.js
 * @description Centraliza las operaciones de manipulacion del DOM.
 */

var DomHelper = (function () {
    'use strict';

    /**
     * Muestra un elemento estableciendo su propiedad display.
     * 
     * @param {HTMLElement|null} element - Elemento a mostrar.
     * @param {string} [displayType='block'] - Tipo de display a aplicar.
     * @returns {void}
     */
    function showElement(element, displayType) {
        if (element === null || element === undefined) {
            return;
        }

        var displayValue = displayType || 'block';
        element.style.display = displayValue;
    }

    /**
     * Oculta un elemento estableciendo display: none.
     * 
     * @param {HTMLElement|null} element - Elemento a ocultar.
     * @returns {void}
     */
    function hideElement(element) {
        if (element === null || element === undefined) {
            return;
        }

        element.style.display = 'none';
    }

    /**
     * Muestra un mensaje de error en un contenedor especifico.
     * 
     * @param {HTMLElement|null} containerElement - Contenedor donde mostrar el error.
     * @param {string} errorMessage - Mensaje de error a mostrar.
     */
    function showErrorMessage(containerElement, errorMessage) {
        if (containerElement === null || containerElement === undefined) {
            return;
        }

        containerElement.textContent = errorMessage;
        containerElement.style.display = 'block';
    }

    /**
     * Oculta un contenedor de error.
     * 
     * @param {HTMLElement|null} containerElement - Contenedor a ocultar.
     */
    function hideErrorMessage(containerElement) {
        if (containerElement === null || containerElement === undefined) {
            return;
        }

        containerElement.style.display = 'none';
    }

    /**
     * Obtiene el valor de un campo de formulario por su ID.
     * 
     * @param {string} elementId - ID del elemento input.
     * @returns {string} Valor del campo o cadena vacia si no existe.
     */
    function getInputValue(elementId) {
        /** @type {HTMLInputElement|null} */
        var inputElement = /** @type {HTMLInputElement|null} */ (document.getElementById(elementId));

        if (inputElement === null) {
            return '';
        }

        return inputElement.value;
    }

    /**
     * Establece el contenido de texto de un elemento.
     * 
     * @param {string} elementId - ID del elemento destino.
     * @param {string} textContent - Texto a establecer.
     */
    function setTextContent(elementId, textContent) {
        var targetElement = document.getElementById(elementId);

        if (targetElement === null) {
            return;
        }

        targetElement.textContent = textContent;
    }

    /**
     * Establece el contenido HTML de un elemento.
     * 
     * @param {string} elementId - ID del elemento destino.
     * @param {string} htmlContent - HTML a establecer.
     */
    function setHtmlContent(elementId, htmlContent) {
        var targetElement = document.getElementById(elementId);

        if (targetElement === null) {
            return;
        }

        targetElement.innerHTML = htmlContent;
    }

    // API publica del modulo
    return {
        showElement: showElement,
        hideElement: hideElement,
        showErrorMessage: showErrorMessage,
        hideErrorMessage: hideErrorMessage,
        getInputValue: getInputValue,
        setTextContent: setTextContent,
        setHtmlContent: setHtmlContent
    };

})();
