// auth.js (клиентская часть)
document.addEventListener('DOMContentLoaded', () => {
    // Проверка авторизации при загрузке
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && window.location.pathname === '/login.html') {
        window.location.href = '/account';
    }
});

// Регистрация
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim().toLowerCase(),
        password: document.getElementById('registerPassword').value.trim(),
        phone: document.getElementById('registerPhone')?.value.trim() || null
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка регистрации');
        }

        localStorage.setItem('currentUser', JSON.stringify(data.user));
        window.location.href = '/account';
        
    } catch (error) {
        showError(error.message);
    }
});

// Вход
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value.trim()
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Ошибка авторизации');
        }

        // Сохраняем только базовые данные
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        window.location.href = '/account';
        
    } catch (error) {
        showError(error.message);
    }
});

// Функция показа ошибок
function showError(text) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = text;
    document.body.prepend(errorEl);
    setTimeout(() => errorEl.remove(), 3000);
}