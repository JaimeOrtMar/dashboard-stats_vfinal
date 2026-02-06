/**
 * Main Dashboard application entrypoint.
 *
 * @file app.js
 */

(function () {
    'use strict';

    function initializeApplication() {
        AuthModule.initialize();

        if (AppConfig.DEV_MODE && AppConfig.DEV_MODE.BYPASS_LOGIN) {
            console.log('Dashboard initialized in development mode');
        } else {
            console.log('Dashboard initialized');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApplication);
    } else {
        initializeApplication();
    }
})();
