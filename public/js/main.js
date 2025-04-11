document.addEventListener('DOMContentLoaded', () => {
    // Вызываем обновление счетчика сразу при загрузке
    updateCartCounter();

    // Добавляем обработчик для всех динамических изменений корзины
    window.addEventListener('storage', updateCartCounter);
});

// Общая функция для обновления счетчика
function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.querySelector('.cart-counter');
    
    if (counter) {
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'inline-block' : 'none';
    }
}