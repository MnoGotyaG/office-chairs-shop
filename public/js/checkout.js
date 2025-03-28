document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const checkoutForm = document.getElementById('checkoutForm');
    const orderItemsContainer = document.getElementById('orderItems');
    const totalPriceElement = document.querySelector('.total-price');
    const submitButton = document.querySelector('.submit-order');

    // Загрузка данных корзины
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Если корзина пуста, перенаправляем
    if (cart.length === 0) {
        window.location.href = '/cart';
        return;
    }

    // Рендер товаров в заказе
    function renderOrderItems() {
        orderItemsContainer.innerHTML = cart.map(item => `
            <div class="order-item">
                <span>${item.name} (×${item.quantity})</span>
                <span>${(item.price * item.quantity).toLocaleString()} ₽</span>
            </div>
        `).join('');
    }

    // Расчет и отображение итоговой суммы
    function updateTotalPrice() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceElement.textContent = `${total.toLocaleString()} ₽`;
    }

    // Отправка данных заказа
    async function submitOrder(formData) {
        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';

            const orderData = {
                customer: Object.fromEntries(formData),
                items: cart,
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                timestamp: new Date().toISOString()
            };

            // Пример запроса к API
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) throw new Error('Ошибка сервера');

            // Очистка корзины и перенаправление
            localStorage.removeItem('cart');
            localStorage.setItem('lastOrder', JSON.stringify(orderData));
            window.location.href = '/order-success';

        } catch (error) {
            console.error('Ошибка:', error);
            alert('Не удалось оформить заказ. Попробуйте ещё раз.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Подтвердить заказ';
        }
    }

    // Валидация телефона
    function validatePhone(phone) {
        return /^\+7\d{10}$/.test(phone);
    }

    // Обработчик отправки формы
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(checkoutForm);
        const phone = formData.get('phone');

        if (!validatePhone(phone)) {
            alert('Введите корректный телефон в формате +7XXXXXXXXXX');
            return;
        }

        await submitOrder(formData);
    });

    // Инициализация
    renderOrderItems();
    updateTotalPrice();
});