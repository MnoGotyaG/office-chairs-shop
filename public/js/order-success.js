document.addEventListener('DOMContentLoaded', async () => {
    // Элементы страницы
    const elements = {
        orderId: document.getElementById('orderId'),
        orderTotal: document.getElementById('orderTotal'),
        orderProducts: document.getElementById('orderProducts'),
        errorContainer: document.getElementById('errorContainer')
    };

    // Показать ошибку
    const showError = (message) => {
        elements.errorContainer.innerHTML = `
            <h3>Ошибка загрузки заказа</h3>
            <p>${message}</p>
            <a href="/catalog">Вернуться в каталог</a>
        `;
        elements.orderId.textContent = '—';
        elements.orderTotal.textContent = '0 ₽';
        elements.orderProducts.innerHTML = '';
    };

    try {
        // Получение ID заказа
        const orderId = new URLSearchParams(window.location.search).get('orderId');
        
        // Валидация ID
        if (!orderId || !/^\d+$/.test(orderId)) {
            throw new Error('Некорректный номер заказа');
        }
        console.log(`Запрашиваем заказ с ID: ${orderId}`);

        // Загрузка данных
        const [orderResponse, itemsResponse] = await Promise.all([
            fetch(`/api/orders/${orderId}`),
            fetch(`/api/orders/${orderId}/items`)
        ]);

        console.log(`Ответ от сервера для заказа:`, orderResponse);
        console.log(`Ответ от сервера для товаров:`, itemsResponse);

        // Обработка HTTP ошибок
        if (!orderResponse.ok) {
            const error = await orderResponse.json();
            throw new Error(error.details || 'Ошибка загрузки заказа');
        }

        if (!itemsResponse.ok) {
            const error = await itemsResponse.json();
            throw new Error(error.details || 'Ошибка загрузки товаров');
        }

        // Парсинг данных
        const order = await orderResponse.json();
        const items = await itemsResponse.json();

        // Валидация данных
        const requiredFields = ['id', 'total', 'status'];
        const missingFields = requiredFields.filter(field => !(field in order));
        
        if (missingFields.length > 0) {
            throw new Error(`Отсутствуют данные: ${missingFields.join(', ')}`);
        }

        if (!Array.isArray(items)) {
            throw new Error('Некорректные данные товаров');
        }

        // Отображение данных
        elements.orderId.textContent = `#${order.id}`;
        elements.orderTotal.textContent = `${order.total.toLocaleString('ru-RU')} ₽`;
        
        console.log("Товары для отображения:", items); 
        
        const safeItems = Array.isArray(items) ? items : (items ? [items] : []);
elements.orderProducts.innerHTML = safeItems.length > 0 
    ? safeItems.map(item => `
        <div class="order-item">
            <span>${item.name || 'Товар'} × ${item.quantity}</span>
            <span>${(item.price * item.quantity || 0).toLocaleString('ru-RU')} ₽</span>
        </div>
    `).join('')
    : '<p>Товары не найдены</p>';

    } catch (error) {
        console.error('Ошибка:', error);
        showError(error.message);
    }
});