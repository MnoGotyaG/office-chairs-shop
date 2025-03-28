document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    // Заполнение профиля
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;

    // Загрузка заказов
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const userOrders = orders.filter(order => order.userEmail === currentUser.email);
    
    document.getElementById('ordersList').innerHTML = userOrders.map(order => `
        <div class="order-item">
            <div>
                <h3>Заказ #${order.id}</h3>
                <p>${new Date(order.date).toLocaleDateString()}</p>
            </div>
            <div>
                <p>${order.total.toLocaleString()} ₽</p>
                <p>${order.items.length} товаров</p>
            </div>
        </div>
    `).join('');

    // Выход
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });
});