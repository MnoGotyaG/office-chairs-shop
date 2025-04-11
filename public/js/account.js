document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    // Объявляем переменную здесь, чтобы она была доступна в блоке catch
    const ordersList = document.getElementById('ordersList');

    // Заполнение профиля
    document.getElementById('updateName').value = currentUser.name;
    document.getElementById('updateEmail').value = currentUser.email;
    document.getElementById('updatePhone').value = currentUser.phone || '';

    // Загрузка заказов
    // Загрузка заказов
try {
    const response = await fetch(`/api/orders?userId=${currentUser.id}`);
    const orders = await response.json();
    
    const ordersList = document.getElementById('ordersList');
    
    // Создаем HTML для всех заказов асинхронно
    const ordersHTML = await Promise.all(orders.map(async (order) => {
        // Запрашиваем товары для каждого заказа
        const itemsResponse = await fetch(`/api/orders/${order.id}/items`);
        const items = await itemsResponse.json();

        // Генерируем HTML для товаров
        const itemsHTML = items.map(item => `
            <div class="order-product">
                <span class="product-name">${item.name}</span>
                <span class="product-price">
                    ${item.quantity} × ${item.price.toLocaleString('ru-RU')} ₽
                </span>
            </div>
        `).join('');

        return `
            <div class="order-item">
                <div class="order-header">
                    <h3>Заказ #${order.id}</h3>
                    <span class="order-status">${order.status}</span>
                </div>
                <div class="order-details">
                    <p>Дата: ${new Date(order.date).toLocaleDateString('ru-RU')}</p>
                    <div class="order-products">
                        ${itemsHTML}
                    </div>
                    <div class="order-total">
                        Итого: ${order.total.toLocaleString('ru-RU')} ₽
                    </div>
                </div>
            </div>
        `;
    }));
    
    ordersList.innerHTML = ordersHTML.join('');

} catch (error) {
    console.error('Ошибка:', error);
    ordersList.innerHTML = '<p>Ошибка загрузки заказов</p>';
}
    

    // Обновление профиля
    document.getElementById('updateProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedUser = {
            ...currentUser,
            name: document.getElementById('updateName').value,
            email: document.getElementById('updateEmail').value,
            phone: document.getElementById('updatePhone').value || null
        };

        try {
            const response = await fetch('/api/users', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify(updatedUser)
            });
            
            if (!response.ok) throw new Error('Ошибка обновления');
            
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            showMessage('Профиль обновлен', 'success');
            
        } catch (error) {
            showMessage('Ошибка: ' + error.message, 'error');
        }
    });

    // Смена пароля
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showMessage('Пароли не совпадают', 'error');
            return;
        }

        try {
            const response = await fetch('/api/users/password', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            
            if (!response.ok) throw new Error('Неверный текущий пароль');
            
            showMessage('Пароль изменен', 'success');
            document.getElementById('changePasswordForm').reset();
            
        } catch (error) {
            showMessage('Ошибка: ' + error.message, 'error');
        }
    });

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });

    function showMessage(text, type = 'info') {
        const message = document.createElement('div');
        message.className = `message ${type}-message`;
        message.textContent = text;
        document.body.prepend(message);
        setTimeout(() => message.remove(), 3000);
    }
});