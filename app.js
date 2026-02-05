/**
 * Aplicación principal del Dashboard.
 * Este archivo orquesta los módulos de la aplicación.
 * 
 * @file app.js
 * @description Punto de entrada que inicializa la aplicación.
 * 
 * Dependencias (cargar en este orden en index.html):
 *   1. types.js
 *   2. config/constants.js
 *   3. services/ApiClient.js
 *   4. services/SessionManager.js
 *   5. services/AuthenticationService.js
 *   6. utils/InputValidator.js
 *   7. utils/RateLimiter.js
 *   8. utils/DomHelper.js
 *   9. modules/TranscriptFormatter.js
 *  10. modules/DashboardModule.js
 *  11. modules/CallsModule.js
 *  12. modules/ConversationsModule.js
 *  13. modules/TabsModule.js
 *  14. modules/AuthModule.js
 *  15. app.js (este archivo)
 */

(function () {
    'use strict';

    /**
     * Inicializa la aplicación.
     */
    function initializeApplication() {
        // Inicializar el módulo de autenticación
        // que se encarga de verificar sesión y mostrar la vista apropiada
        AuthModule.initialize();

        // Log de inicialización
        if (AppConfig.DEV_MODE && AppConfig.DEV_MODE.BYPASS_LOGIN) {
            console.log('🚀 Dashboard inicializado en modo desarrollo');
        } else {
            console.log('🚀 Dashboard inicializado');
        }
    }

    // =========================================================================
    // PUNTO DE ENTRADA
    // =========================================================================

    // Inicializar la aplicación cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApplication);
    } else {
        initializeApplication();
    }

})();