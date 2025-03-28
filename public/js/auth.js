// Регистрация
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const user = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        orders: []
    };

    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    if (users.some(u => u.email === user.email)) {
        alert('Пользователь с таким email уже существует!');
        return;
    }

    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(user));
    window.location.href = '/account.html';
});

// Вход
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        alert('Неверный email или пароль!');
        return;
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    window.location.href = '/account.html';
});