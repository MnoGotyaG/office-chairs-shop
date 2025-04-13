// public/scripts/order-history.js
document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.isAdmin) window.location.href = '/';

    const elements = {
        ordersContainer: document.getElementById('ordersContainer'),
        orderDetails: document.getElementById('orderDetails'),
        statusFilter: document.getElementById('statusFilter')
    };

    let allOrders = [];

    const loadOrders = async () => {
        try {
            const userData = btoa(unescape(encodeURIComponent(
                JSON.stringify(currentUser)
            )));

            const response = await fetch('/api/admin/orders', {
                headers: { 'X-User-Data': userData }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки заказов');
            }

            allOrders = await response.json();
            renderOrders(allOrders);
            
        } catch (error) {
            showError(error.message);
        }
    };

    const renderOrders = (orders) => {
        elements.ordersContainer.innerHTML = orders.map(order => `
            <div class="order-card" data-id="${order.id}">
                <div class="order-header">
                    <span>Заказ #${order.id}</span>
                    <span class="status ${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-info">
                    <div>
                        <span class="label">Дата:</span>
                        ${new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div>
                        <span class="label">Клиент:</span>
                        ${order.user_name || 'Гость'}
                    </div>
                    <div>
                        <span class="label">Сумма:</span>
                        ${formatPrice(order.total)}
                    </div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.order-card').forEach(card => {
            card.addEventListener('click', () => showOrderDetails(card.dataset.id));
        });
    };

    const showOrderDetails = (orderId) => {
        const order = allOrders.find(o => o.id == orderId);
        if (!order) return;

        const statusOptions = {
            pending: 'В обработке',
            completed: 'Завершён',
            canceled: 'Отменён'
        };

        elements.orderDetails.innerHTML = `
            <h3>Детали заказа #${order.id}</h3>
            
            <form class="status-form" data-order-id="${order.id}">
                <div class="form-group">
                    <label>Статус заказа:</label>
                    <select name="status" class="status-select">
                        ${Object.entries(statusOptions).map(([key, val]) => `
                            <option value="${key}" ${key === order.status ? 'selected' : ''}>
                                ${val}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <button type="submit" class="save-btn">Сохранить изменения</button>
            </form>
            <div class="order-meta">
                <div><strong>Статус:</strong> ${getStatusText(order.status)}</div>
                <div><strong>Дата:</strong> ${new Date(order.created_at).toLocaleString()}</div>
                <div><strong>Клиент:</strong> ${order.user_name || 'Гость'} (${order.user_email || 'нет email'})</div>
                <div><strong>Телефон:</strong> ${order.user_phone || '—'}</div>
            </div>

            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <img src="${item.image || '/images/placeholder.jpg'}" 
                             alt="${item.name}" 
                             class="item-image">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-price">${formatPrice(item.price)} × ${item.quantity} шт.</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="order-total">
                <strong>Итого:</strong> ${formatPrice(order.total)}
            </div>
        `;

        const form = elements.orderDetails.querySelector('.status-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const status = form.status.value;
            
            try {
                const response = await fetch(`/api/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Data': btoa(unescape(encodeURIComponent(
                            JSON.stringify(currentUser)
                        )))
                    },
                    body: JSON.stringify({ status })
                });

                if (!response.ok) throw new Error('Ошибка обновления');

                const updatedOrder = allOrders.find(o => o.id == orderId);
                updatedOrder.status = status;

                // Обновляем данные
                order.status = status;
                renderOrders(allOrders);
        
                // Перерисовываем детали
                showOrderDetails(orderId);
        
                showAlert('Статус успешно обновлён!', 'success');
                // Обновляем отображение
                document.querySelector(`.order-card[data-id="${orderId}"] .status`)
                    .textContent = {
                        pending: 'В обработке',
                        completed: 'Завершён',
                        canceled: 'Отменён'
                    }[status];
                    
                document.querySelector(`.order-card[data-id="${orderId}"] .status`)
                    .className = `status ${status}`;

                showAlert('Статус обновлён!', 'success');

            } catch (error) {
                showAlert(error.message, 'error');
            }
        });

    };

    // Вспомогательные функции
    const formatPrice = (price) => 
        Number(price).toLocaleString('ru-RU') + ' ₽';

    const getStatusText = (status) => {
        const statusMap = {
            pending: 'В обработке',
            completed: 'Завершён',
            canceled: 'Отменён'
        };
        return statusMap[status] || status;
    };

    const showError = (message) => {
        elements.ordersContainer.innerHTML = `
            <div class="error">${message}</div>
        `;
    };

    // Фильтрация
    elements.statusFilter.addEventListener('change', () => {
        const status = elements.statusFilter.value;
        const filtered = status 
            ? allOrders.filter(o => o.status === status)
            : allOrders;
        renderOrders(filtered);
    });

    // Инициализация
    loadOrders();
});

