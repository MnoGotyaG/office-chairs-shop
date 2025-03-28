document.addEventListener('DOMContentLoaded', () => {
    const orderIdElement = document.getElementById('orderId');
    const orderTotalElement = document.getElementById('orderTotal');
    const orderProductsElement = document.getElementById('orderProducts');
    
    // Получение данных из localStorage
    const orderData = JSON.parse(localStorage.getItem('lastOrder')) || null;

    if (!orderData) {
        window.location.href = '/';
        return;
    }

    // Заполнение данных
    orderIdElement.textContent = `#${Date.now()}`;
    orderTotalElement.textContent = `${orderData.total.toLocaleString()} ₽`;
    
    // Отображение товаров
    orderProductsElement.innerHTML = orderData.items.map(item => `
        <div>
            <span>${item.name} (×${item.quantity})</span>
            <span>${(item.price * item.quantity).toLocaleString()} ₽</span>
        </div>
    `).join('');

    // Очистка данных заказа
    localStorage.removeItem('lastOrder');
});