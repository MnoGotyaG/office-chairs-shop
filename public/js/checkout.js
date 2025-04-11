document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkoutForm');
    const orderItemsContainer = document.getElementById('orderItems');
    const totalPriceElement = document.querySelector('.total-price');
    const submitButton = document.querySelector('.submit-order');
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    // Проверка наличия товаров в корзине
    if (cart.length === 0) {
        window.location.href = '/cart';
        return;
    }

    // Автозаполнение данных пользователя
    if (currentUser) {
        checkoutForm.querySelector('[name="name"]').value = currentUser.name || '';
        checkoutForm.querySelector('[name="email"]').value = currentUser.email || '';
        checkoutForm.querySelector('[name="phone"]').value = currentUser.phone || '';
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

    // Обновление общей суммы заказа
    function updateTotalPrice() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalPriceElement.textContent = `${total.toLocaleString()} ₽`;
    }

    // Отправка заказа на сервер
    async function submitOrder(formData) {
        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';

            const orderData = {
                user_id: currentUser?.id || null,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            console.log('Отправка заказа:', orderData); // Логирование отправляемых данных

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser?.id || null,
                    items: cart.map(item => ({
                        product_id: item.id,
                        quantity: item.quantity,
                        price: Number(item.price) // Явное преобразование цены
                    })),
                    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка сервера');
            }

            const data = await response.json();
            console.log('Ответ сервера:', data); // Логирование ответа сервера

            localStorage.removeItem('cart');
            window.location.href = `/order-success?orderId=${data.orderId}`;

        } catch (error) {
            console.error('Ошибка:', error);
            alert(error.message || 'Не удалось оформить заказ');
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
            alert('Введите телефон в формате +7XXXXXXXXXX');
            return;
        }

        await submitOrder(formData);
    });

    // Инициализация страницы
    renderOrderItems();
    updateTotalPrice();
});