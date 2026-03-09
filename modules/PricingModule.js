/**
 * Pricing CTA module.
 * Renders current plan badge, pricing modal cards, and threshold popup.
 *
 * @file PricingModule.js
 */

var PricingModule = (function () {
    'use strict';

    /** @type {HTMLElement|null} */
    var plansGridElement = document.getElementById('plans-grid');
    /** @type {HTMLElement|null} */
    var ctaBannerElement = document.getElementById('upgrade-cta-banner');
    /** @type {HTMLElement|null} */
    var currentPlanBadgeElement = document.getElementById('current-plan-badge');
    /** @type {HTMLElement|null} */
    var pricingModalElement = document.getElementById('pricing-modal');
    /** @type {HTMLElement|null} */
    var usagePopupElement = document.getElementById('usage-upgrade-popup');
    /** @type {HTMLElement|null} */
    var usagePopupMessageElement = document.getElementById('usage-upgrade-message');

    /** @type {boolean} */
    var hasInitialized = false;
    /** @type {'warning'|'critical'|'over'|null} */
    var currentPopupLevel = null;

    var POPUP_DISMISS_STORAGE_KEY = 'dashboard_upgrade_popup_dismissed_level';

    function initialize() {
        if (hasInitialized) {
            return;
        }

        hasInitialized = true;

        renderPlansCta();
        attachEventListeners();
    }

    function attachEventListeners() {
        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            var actionElement = target.closest('[data-action]');
            if (actionElement !== null) {
                var actionName = actionElement.getAttribute('data-action');

                if (actionName === 'open-pricing-modal') {
                    openPricingModal();
                    return;
                }

                if (actionName === 'close-pricing-modal') {
                    closePricingModal();
                    return;
                }

                if (actionName === 'dismiss-usage-popup') {
                    dismissUsagePopup();
                    return;
                }
            }

            if (pricingModalElement !== null && target === pricingModalElement) {
                closePricingModal();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closePricingModal();
            }
        });
    }

    /**
     * @returns {PlanDefinition|null}
     */
    function getCurrentPlan() {
        return getPlanByKey(AppConfig.BILLING.CURRENT_PLAN_KEY);
    }

    function renderPlansCta() {
        var currentPlan = getCurrentPlan();
        if (currentPlan === null) {
            return;
        }

        var recommendedPlan = getRecommendedPlan() || currentPlan;

        updateCurrentPlanBadge(currentPlan);
        renderUpgradeBanner(currentPlan, recommendedPlan);
        renderPlansGrid(currentPlan, recommendedPlan);
    }

    /**
     * @param {number|string} usedMinutesValue
     */
    function updateUsageStatus(usedMinutesValue) {
        var currentPlan = getCurrentPlan();
        if (currentPlan === null || usagePopupElement === null || usagePopupMessageElement === null) {
            return;
        }

        var usedMinutes = parseFloat(String(usedMinutesValue));
        if (isNaN(usedMinutes) || usedMinutes <= 0) {
            hideUsagePopup();
            return;
        }

        var ratio = usedMinutes / currentPlan.minutesIncluded;
        if (ratio < 0.8) {
            hideUsagePopup();
            return;
        }

        var popupLevel = getPopupLevel(ratio);
        var dismissedLevel = getDismissedPopupLevel();

        if (dismissedLevel === popupLevel) {
            return;
        }

        currentPopupLevel = popupLevel;

        var usedRounded = Math.round(usedMinutes);
        var percentText = Math.round(ratio * 100) + '%';
        var minutesRemaining = Math.max(0, Math.round(currentPlan.minutesIncluded - usedRounded));

        var message = '';
        if (popupLevel === 'warning') {
            message =
                'Ya consumiste ' + percentText + ' de tu plan (' + usedRounded.toLocaleString('es-ES') + ' min). ' +
                'Te quedan ' + minutesRemaining.toLocaleString('es-ES') + ' min. ⬆ Mejorar ahora evita fricciones.';
        } else if (popupLevel === 'critical') {
            message =
                'Atencion: estas al ' + percentText + ' del limite de minutos. ' +
                'Mejora tu plan para mantener la operacion sin cortes.';
        } else {
            message =
                'Superaste los minutos incluidos de tu plan. Mejora hoy para obtener mas capacidad y prioridad de soporte.';
        }

        usagePopupMessageElement.textContent = message;
        usagePopupElement.classList.remove('is-hidden', 'usage-upgrade-popup--warning', 'usage-upgrade-popup--critical', 'usage-upgrade-popup--over');
        usagePopupElement.classList.add('usage-upgrade-popup--' + popupLevel);
    }

    function openPricingModal() {
        if (pricingModalElement === null) {
            return;
        }

        renderPlansCta();
        pricingModalElement.classList.remove('is-hidden');
        pricingModalElement.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closePricingModal() {
        if (pricingModalElement === null) {
            return;
        }

        pricingModalElement.classList.add('is-hidden');
        pricingModalElement.style.display = 'none';
        document.body.style.overflow = '';
    }

    function dismissUsagePopup() {
        if (currentPopupLevel !== null) {
            sessionStorage.setItem(POPUP_DISMISS_STORAGE_KEY, currentPopupLevel);
        }
        hideUsagePopup();
    }

    function hideUsagePopup() {
        if (usagePopupElement === null) {
            return;
        }

        usagePopupElement.classList.add('is-hidden');
        usagePopupElement.classList.remove('usage-upgrade-popup--warning', 'usage-upgrade-popup--critical', 'usage-upgrade-popup--over');
        currentPopupLevel = null;
    }

    /**
     * @param {number} usageRatio
     * @returns {'warning'|'critical'|'over'}
     */
    function getPopupLevel(usageRatio) {
        if (usageRatio >= 1) {
            return 'over';
        }

        if (usageRatio >= 0.9) {
            return 'critical';
        }

        return 'warning';
    }

    /**
     * @returns {string|null}
     */
    function getDismissedPopupLevel() {
        try {
            return sessionStorage.getItem(POPUP_DISMISS_STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    /**
     * @returns {PlanDefinition|null}
     */
    function getRecommendedPlan() {
        return getPlanByKey(AppConfig.BILLING.RECOMMENDED_PLAN_KEY);
    }

    /**
     * @param {PlanKey} planKey
     * @returns {PlanDefinition|null}
     */
    function getPlanByKey(planKey) {
        /** @type {PlanDefinition[]} */
        var plans = Array.isArray(AppConfig.BILLING.PLANS) ? AppConfig.BILLING.PLANS : [];

        for (var i = 0; i < plans.length; i++) {
            if (plans[i].key === planKey) {
                return plans[i];
            }
        }

        return plans.length > 0 ? plans[0] : null;
    }

    /**
     * @param {PlanDefinition} currentPlan
     */
    function updateCurrentPlanBadge(currentPlan) {
        if (currentPlanBadgeElement === null) {
            return;
        }

        currentPlanBadgeElement.textContent = 'Plan actual: ' + currentPlan.displayName;
    }

    /**
     * @param {PlanDefinition} currentPlan
     * @param {PlanDefinition} recommendedPlan
     */
    function renderUpgradeBanner(currentPlan, recommendedPlan) {
        if (ctaBannerElement === null) {
            return;
        }

        var minuteDifference = Math.max(0, recommendedPlan.minutesIncluded - currentPlan.minutesIncluded);
        var formattedDiff = minuteDifference.toLocaleString('es-ES');

        ctaBannerElement.textContent =
            'Estas en ' + currentPlan.displayName + '. Recomendado: ' + recommendedPlan.displayName +
            '. +' + formattedDiff + ' min vs tu plan actual.';
    }

    /**
     * @param {PlanDefinition} currentPlan
     * @param {PlanDefinition} recommendedPlan
     */
    function renderPlansGrid(currentPlan, recommendedPlan) {
        if (plansGridElement === null) {
            return;
        }

        plansGridElement.innerHTML = '';

        /** @type {PlanDefinition[]} */
        var plans = Array.isArray(AppConfig.BILLING.PLANS) ? AppConfig.BILLING.PLANS : [];

        for (var i = 0; i < plans.length; i++) {
            var plan = plans[i];
            plansGridElement.appendChild(createPlanCard(plan, currentPlan, recommendedPlan));
        }
    }

    /**
     * @param {PlanDefinition} plan
     * @param {PlanDefinition} currentPlan
     * @param {PlanDefinition} recommendedPlan
     * @returns {HTMLElement}
     */
    function createPlanCard(plan, currentPlan, recommendedPlan) {
        var isCurrentPlan = plan.key === currentPlan.key;
        var isRecommendedPlan = plan.key === recommendedPlan.key;

        var card = document.createElement('article');
        card.className = 'plan-card' + (isRecommendedPlan ? ' plan-card--recommended' : '');

        if (isRecommendedPlan) {
            var badge = document.createElement('span');
            badge.className = 'plan-badge';
            badge.textContent = 'Recomendado';
            card.appendChild(badge);
        }

        var tierName = document.createElement('p');
        tierName.className = 'plan-tier-name';
        tierName.textContent = plan.displayName;
        card.appendChild(tierName);

        var priceWrapper = document.createElement('div');
        priceWrapper.className = 'plan-price';

        var priceValue = document.createElement('span');
        priceValue.className = 'plan-price-value';
        priceValue.textContent = plan.priceLabel;

        var pricePeriod = document.createElement('span');
        pricePeriod.className = 'plan-price-period';
        pricePeriod.textContent = plan.periodLabel;

        priceWrapper.appendChild(priceValue);
        priceWrapper.appendChild(pricePeriod);
        card.appendChild(priceWrapper);

        if (isRecommendedPlan && !isCurrentPlan) {
            var extraMinutes = Math.max(0, plan.minutesIncluded - currentPlan.minutesIncluded);
            var comparisonTag = document.createElement('p');
            comparisonTag.className = 'plan-comparison';
            comparisonTag.textContent = '+' + extraMinutes.toLocaleString('es-ES') + ' min vs tu plan actual';
            card.appendChild(comparisonTag);
        }

        var featuresList = document.createElement('ul');
        featuresList.className = 'plan-features';

        for (var j = 0; j < plan.features.length; j++) {
            var featureItem = document.createElement('li');
            var checkIcon = document.createElement('span');
            checkIcon.className = 'plan-check';
            checkIcon.setAttribute('aria-hidden', 'true');
            checkIcon.textContent = '✓';

            var featureText = document.createElement('span');
            featureText.textContent = plan.features[j];

            featureItem.appendChild(checkIcon);
            featureItem.appendChild(featureText);
            featuresList.appendChild(featureItem);
        }

        card.appendChild(featuresList);
        card.appendChild(createCtaElement(plan, currentPlan, isCurrentPlan));

        return card;
    }

    /**
     * @param {PlanDefinition} targetPlan
     * @param {PlanDefinition} currentPlan
     * @param {boolean} isCurrentPlan
     * @returns {HTMLElement}
     */
    function createCtaElement(targetPlan, currentPlan, isCurrentPlan) {
        if (isCurrentPlan) {
            var currentButton = document.createElement('button');
            currentButton.type = 'button';
            currentButton.className = 'plan-cta-btn plan-cta-btn--current';
            currentButton.disabled = true;
            currentButton.setAttribute('aria-disabled', 'true');
            currentButton.textContent = 'Plan actual';
            return currentButton;
        }

        var link = document.createElement('a');
        link.className = 'plan-cta-btn';
        link.href = buildWhatsappUpgradeLink(currentPlan, targetPlan);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Mejorar a ' + targetPlan.displayName;
        link.setAttribute(
            'aria-label',
            'Mejorar del plan ' + currentPlan.displayName + ' al plan ' + targetPlan.displayName + ' por WhatsApp'
        );

        return link;
    }

    /**
     * @param {PlanDefinition} currentPlan
     * @param {PlanDefinition} targetPlan
     * @returns {string}
     */
    function buildWhatsappUpgradeLink(currentPlan, targetPlan) {
        var baseUrl = AppConfig.BILLING.WHATSAPP_BASE_URL || 'https://wa.me/';
        var whatsappNumber = AppConfig.BILLING.WHATSAPP_NUMBER || '';
        var username = SessionManager.getCurrentUsername() || 'cliente';

        var message =
            'Hola, quiero mejorar mi plan del Dashboard.\n' +
            'Usuario: ' + username + '\n' +
            'Plan actual: ' + currentPlan.displayName + '\n' +
            'Plan objetivo: ' + targetPlan.displayName + '\n' +
            'Me interesa activar el upgrade cuanto antes.';

        return baseUrl + whatsappNumber + '?text=' + encodeURIComponent(message);
    }

    return {
        initialize: initialize,
        renderPlansCta: renderPlansCta,
        getCurrentPlan: getCurrentPlan,
        updateUsageStatus: updateUsageStatus,
        openPricingModal: openPricingModal,
        closePricingModal: closePricingModal
    };
})();
