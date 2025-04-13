// analytics.js
document.addEventListener('DOMContentLoaded', () => {
    const consentBanner = document.getElementById('cookieConsent');
    const acceptBtn = document.getElementById('acceptCookies');
    const rejectBtn = document.getElementById('rejectCookies');

    // Проверка поддержки cookies браузером
    if (!navigator.cookieEnabled) {
        console.warn('Браузер блокирует использование cookies');
        return;
    }

    // Инициализация системы
    initializeCookieConsent();

    // Обработчики событий
    acceptBtn?.addEventListener('click', handleAccept);
    rejectBtn?.addEventListener('click', handleReject);

    // Основные функции
    function initializeCookieConsent() {
        const consent = getCookie('cookie_consent');
        
        if (consent === null) {
            showConsentBanner();
        } else if (consent === 'accepted') {
            initializeAnalytics();
        }
    }

    function showConsentBanner() {
        if (consentBanner) {
            consentBanner.style.display = 'block';
            trackEvent('consent_banner_shown');
        }
    }

    function handleAccept() {
        setCookie('cookie_consent', 'accepted', 365);
        hideConsentBanner();
        initializeAnalytics();
        trackEvent('consent_accepted');
    }

    function handleReject() {
        setCookie('cookie_consent', 'rejected', 365);
        hideConsentBanner();
        clearAnalyticsCookies();
        trackEvent('consent_rejected');
    }

    function hideConsentBanner() {
        if (consentBanner) {
            consentBanner.style.display = 'none';
        }
    }
});

// Основная логика аналитики
function initializeAnalytics() {
    try {
        const visitorId = getOrCreateVisitorId();
        trackPageView(visitorId);
        setupActivityTracking(visitorId);
    } catch (error) {
        console.error('Ошибка инициализации аналитики:', error);
    }
}

function getOrCreateVisitorId() {
    let visitorId = getCookie('visitor_id');
    
    if (!visitorId) {
        visitorId = generateVisitorId();
        setCookie('visitor_id', visitorId, 365);
        trackEvent('new_visitor', { visitorId });
    }
    
    return visitorId;
}

function generateVisitorId() {
    return [
        'vid',
        Date.now().toString(36),
        Math.random().toString(36).substr(2, 9),
        window.screen.width.toString(36)
    ].join('-');
}

// Трекинг событий
function trackPageView(visitorId) {
    const data = {
        type: 'page_view',
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        visitorId,
        screen: `${screen.width}x${screen.height}`,
        language: navigator.language
    };
    
    sendAnalyticsData(data);
}

function trackEvent(eventType, eventData = {}) {
    const data = {
        type: eventType,
        timestamp: new Date().toISOString(),
        ...eventData,
        visitorId: getCookie('visitor_id') || 'unknown'
    };
    
    sendAnalyticsData(data);
}

// Отправка данных
function sendAnalyticsData(data) {
    if (getCookie('cookie_consent') !== 'accepted') return;

    const url = '/api/track';
    const headers = { 'Content-Type': 'application/json' };
    
    try {
        navigator.sendBeacon(url, JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
        fallbackSend(url, data);
    }
}

function fallbackSend(url, data) {
    fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
    });
}

// Отслеживание активности
function setupActivityTracking(visitorId) {
    let lastActivity = Date.now();
    
    window.addEventListener('mousemove', () => updateActivity(visitorId));
    window.addEventListener('scroll', () => updateActivity(visitorId));
    window.addEventListener('click', () => updateActivity(visitorId));

    function updateActivity() {
        const now = Date.now();
        if (now - lastActivity > 30000) { // Каждые 30 секунд
            trackEvent('user_activity', { duration: now - lastActivity });
            lastActivity = now;
        }
    }
}

// Утилиты работы с cookies
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    const cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
    document.cookie = cookie;
}

function getCookie(name) {
    const decoded = decodeURIComponent(document.cookie);
    const cookies = decoded.split('; ');
    return cookies.find(row => row.startsWith(name + '='))?.split('=')[1] || null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function clearAnalyticsCookies() {
    deleteCookie('visitor_id');
    deleteCookie('_ga');
    deleteCookie('_gid');
}

// Экспорт для отладки
if (window.DEBUG_ANALYTICS) {
    window.analytics = {
        setCookie,
        getCookie,
        deleteCookie,
        trackEvent,
        generateVisitorId
    };
}