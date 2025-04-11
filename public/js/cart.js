document.addEventListener('DOMContentLoaded', () => {
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    const cartContainer = document.querySelector('.cart-items');
    const totalPriceElement = document.querySelector('.total-price');
    const cartCounter = document.querySelector('.cart-counter');

    // Рендер корзины
    function renderCart() {
        cartContainer.innerHTML = cartItems.map((item, index) => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="item-image">
                <div class="item-details">
                    <h3 class="item-title">${item.name}</h3>
                    <div class="quantity-controls">
                        <button class="quantity-btn decrement">−</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn increment">+</button>
                    </div>
                </div>
                <div class="item-actions">
                    <span class="item-price">${(item.price * item.quantity).toLocaleString()} ₽</span>
                    <button class="remove-btn">× Удалить</button>
                </div>
            </div>
        `).join('');

        updateTotal();
        updateCartCounter();
        attachEventListeners();
    }

    // Обновление общей суммы
    function updateTotal() {
        const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        totalPriceElement.textContent = `${total.toLocaleString()} ₽`;
    }

    // Обновление счетчика в шапке
    /*function updateCartCounter() {
        const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
        cartCounter.textContent = totalItems;
        cartCounter.style.visibility = totalItems > 0 ? 'visible' : 'hidden';
    }*/
    // Обновление счетчика корзины
function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.querySelector('.cart-counter');
    
    if (counter) {
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

    // Обработчики событий
    function attachEventListeners() {
        document.querySelectorAll('.decrement').forEach(btn => {
            btn.addEventListener('click', handleDecrement);
        });

        document.querySelectorAll('.increment').forEach(btn => {
            btn.addEventListener('click', handleIncrement);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', handleRemove);
        });

        document.querySelector('.checkout-btn').addEventListener('click', handleCheckout);
    }

    // Уменьшение количества
    function handleDecrement(e) {
        const itemId = e.target.closest('.cart-item').dataset.id;
        const item = cartItems.find(item => item.id === itemId);
        
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            cartItems.splice(cartItems.indexOf(item), 1);
        }
        
        saveCart();
        renderCart();
    }

    // Увеличение количества (макс. 20)
    function handleIncrement(e) {
        const itemId = e.target.closest('.cart-item').dataset.id;
        const item = cartItems.find(item => item.id === itemId);
        
        if (item.quantity < 20) {
            item.quantity++;
            saveCart();
            renderCart();
        } else {
            alert('Максимальное количество товара - 20 шт.');
        }
    }

    // Удаление товара
    function handleRemove(e) {
        const itemId = e.target.closest('.cart-item').dataset.id;
        const itemIndex = cartItems.findIndex(item => item.id === itemId);
        
        cartItems.splice(itemIndex, 1);
        saveCart();
        renderCart();
    }

    // Оформление заказа
    function handleCheckout(e) {
        e.preventDefault();
        
        if (cartItems.length === 0) {
            alert('Корзина пуста! Добавьте товары перед оформлением.');
            return;
        }
        
        window.location.href = '/checkout';
    }

    // Сохранение в localStorage
    function saveCart() {
        localStorage.setItem('cart', JSON.stringify(cartItems));
    }

    // Инициализация
    renderCart();
});