/**
 * Módulo de navegación por pestañas.
 * Gestiona el sistema de tabs del dashboard.
 * 
 * @file TabsModule.js
 * @requires CallsModule
 */

var TabsModule = (function () {
    'use strict';

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
            CallsModule.loadCallHistory();
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

    // API pública
    return {
        switchTab: switchTab,
        toggleConversationsPanel: toggleConversationsPanel
    };

})();

// Exponer switchTab globalmente para onclick en HTML
window.switchTab = TabsModule.switchTab;
