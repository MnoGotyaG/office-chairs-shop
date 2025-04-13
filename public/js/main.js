
function setupRequestInterceptor() {
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
        const adminData = JSON.parse(sessionStorage.getItem('adminData'));
        
        // Автоматически добавляем заголовки для админских запросов
        if (adminData?.isAdmin) {
            options.headers = {
                ...options.headers,
                'X-User-Data': btoa(unescape(encodeURIComponent(
                    JSON.stringify(adminData)
                )))
            };
        }
        
        return originalFetch(url, options);
    };
}

function scheduleAdminCheck() {
    setInterval(() => {
        const adminData = JSON.parse(sessionStorage.getItem('adminData'));
        if (adminData) {
            fetch(`/api/users/${adminData.id}`)
                .then(response => response.json())
                .then(user => {
                    if (!user.isAdmin) {
                        sessionStorage.removeItem('adminData');
                        window.location.reload();
                    }
                });
        }
    }, 300000); // Проверка каждые 5 минут
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    updateAdminUI();
    setupAuthListeners();
    setupRequestInterceptor(); 
});

function setupAuthListeners() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'currentUser') {
            updateAdminUI();
        }
    });
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.querySelector('.cart-counter');
    
    if (counter) {
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}

function updateAdminUI() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const adminNavItem = document.getElementById('adminNavItem');
    
    try {
        if (!adminNavItem) {
            console.error('Элемент adminNavItem не найден');
            return;
        }
        
        if (currentUser?.isAdmin) {
            adminNavItem.style.display = 'flex'; // Изменено на flex
            console.log('Админ-меню отображено');
        } else {
            adminNavItem.style.display = 'none';
            console.log('Админ-меню скрыто');
        }
    } catch (error) {
        console.error('Ошибка обновления админ-меню:', error);
    }
}
// Делаем функцию глобально доступной
window.updateAdminUI = updateAdminUI;