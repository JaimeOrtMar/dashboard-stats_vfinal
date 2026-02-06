/**
 * Tab navigation module.
 * Handles dashboard tab switches and high-level actions.
 *
 * @file TabsModule.js
 */

var TabsModule = (function () {
    'use strict';

    /** @type {boolean} */
    var hasInitialized = false;

    function initialize() {
        if (hasInitialized) {
            return;
        }

        hasInitialized = true;

        var sidebarNav = document.querySelector('.sidebar nav');
        if (sidebarNav !== null) {
            sidebarNav.addEventListener('click', handleSidebarNavigationClick);
        }

        document.addEventListener('click', handleGlobalActionClick);
    }

    /**
     * @param {MouseEvent} event
     */
    function handleSidebarNavigationClick(event) {
        var target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        var navigationLink = target.closest('.nav-link[data-tab]');
        if (navigationLink === null) {
            return;
        }

        event.preventDefault();

        var tabName = navigationLink.getAttribute('data-tab');
        if (!tabName) {
            return;
        }

        switchTab(tabName, /** @type {HTMLElement} */ (navigationLink));
    }

    /**
     * @param {MouseEvent} event
     */
    function handleGlobalActionClick(event) {
        var target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        var actionElement = target.closest('[data-action]');
        if (actionElement === null) {
            return;
        }

        var actionName = actionElement.getAttribute('data-action');
        if (!actionName) {
            return;
        }

        if (actionName === 'logout') {
            event.preventDefault();
            AuthModule.logout();
            return;
        }

        if (actionName === 'refresh-dashboard') {
            event.preventDefault();
            DashboardModule.loadDashboardData();
        }
    }

    /**
     * @param {string} tabName
     * @param {HTMLElement} clickedElement
     */
    function switchTab(tabName, clickedElement) {
        var allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(function (tab) {
            tab.classList.remove('active');
        });

        var allNavLinks = document.querySelectorAll('.sidebar nav .nav-link');
        allNavLinks.forEach(function (link) {
            link.classList.remove('active');
        });

        var selectedTab = document.getElementById('tab-' + tabName);
        if (selectedTab !== null) {
            selectedTab.classList.add('active');
        }

        if (clickedElement !== null) {
            clickedElement.classList.add('active');
        }

        if (tabName === 'llamadas') {
            CallsModule.loadCallHistory();
        }
    }

    return {
        initialize: initialize,
        switchTab: switchTab
    };
})();
