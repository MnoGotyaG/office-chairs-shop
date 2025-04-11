document.addEventListener('DOMContentLoaded', async () => {
    const productId = getProductIdFromUrl();
    if (!validateProductId(productId)) return;

    try {
        const product = await fetchProductData(productId);
        if (!product) throw new Error('Товар не найден');
        
        renderProductDetails(product);
        updateBreadcrumb(product.name);
        setupAddToCartButton(product.id);
        
    } catch (error) {
        handleLoadingError(error.message);
    }
});
document.addEventListener('DOMContentLoaded', updateCartCounter);
// Получение ID из URL
function getProductIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return parseInt(pathParts[2], 10); // URL: /product/123 → 123
}

// Валидация ID
function validateProductId(id) {
    if (!id || isNaN(id)) {
        handleLoadingError('Некорректный ID товара');
        return false;
    }
    return true;
}

// Загрузка данных
async function fetchProductData(id) {
    try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error('Товар не найден');
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        throw new Error('Не удалось загрузить данные');
    }
}

// Рендер данных
function renderProductDetails(product) {
    const elements = {
        name: document.getElementById('productName'),
        price: document.getElementById('productPrice'),
        category: document.getElementById('productCategory'),
        material: document.getElementById('productMaterial'),
        warranty: document.getElementById('productWarranty'),
        dimensions: document.getElementById('productDimensions'),
        weight: document.getElementById('productWeight'),
        description: document.getElementById('productDescription'),
        mainImage: document.getElementById('mainImage'),
        gallery: document.getElementById('productGallery')
    };

    // Проверка элементов
    for (const [key, el] of Object.entries(elements)) {
        if (!el) throw new Error(`Отсутствует элемент: ${key}`);
    }

    // Заполнение данных
    elements.name.textContent = product.name || 'Без названия';
    elements.price.textContent = product.price ? 
        formatPrice(product.price) : 'Цена не указана';
    elements.category.textContent = product.category || '—';
    elements.material.textContent = product.material || '—';
    elements.warranty.textContent = product.warranty ? 
        `${product.warranty} ${declOfNum(product.warranty, ['год', 'года', 'лет'])}` : '—';
    elements.dimensions.textContent = product.dimensions || '—';
    elements.weight.textContent = product.weight || '—';
    elements.description.textContent = product.description || 'Описание отсутствует';

    // Галерея
    const images = Array.isArray(product.images) ? product.images : [];
    elements.mainImage.src = images[0] || '/images/placeholder.jpg';
    elements.gallery.innerHTML = images.map((img, index) => `
        <img src="${img}" 
             alt="${product.name}" 
             class="thumbnail ${index === 0 ? 'active' : ''}"
             onclick="updateMainImage('${img}', this)">
    `).join('');
}

// Форматирование цены (убираем лишние нули)
function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + ' ₽';
}

// Обновление главного изображения
window.updateMainImage = (src, thumbnail) => {
    document.getElementById('mainImage').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
}

// Хлебные крошки
function updateBreadcrumb(name) {
    const breadcrumb = document.getElementById('productBreadcrumb');
    if (breadcrumb) breadcrumb.textContent = name;
}

// Кнопка "В корзину"
function setupAddToCartButton(productId) {
    const btn = document.getElementById('addToCartBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const priceText = document.getElementById('productPrice').textContent;
        const price = parseFloat(
            priceText
                .replace(/[^\d,]/g, '')
                .replace(',', '.')
        );

        const product = {
            id: productId,
            name: document.getElementById('productName').textContent,
            price: price,
            image: document.getElementById('mainImage').src
        };
        
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.id == productId);
        
        if (existingItem) {
            if (existingItem.quantity < 20) {
                existingItem.quantity++;
                showAlert(`Количество: ${existingItem.quantity} шт.`, 'info');
            } else {
                showAlert('Максимум 20 шт. в корзине', 'error');
                return;
            }
        } else {
            cart.push({ ...product, quantity: 1 });
            showAlert('Товар добавлен в корзину', 'success');
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCounter();
    });
}

// Вспомогательные функции
function declOfNum(number, titles) {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[
        (number % 100 > 4 && number % 100 < 20) 
            ? 2 
            : cases[(number % 10 < 5) ? number % 10 : 5]
    ];
}

function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => alert.remove(), 2000);
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counter = document.querySelector('.cart-counter');
    
    if (counter) {
        counter.textContent = totalItems;
        counter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function handleLoadingError(message) {
    const main = document.querySelector('main');
    if (!main) return;
    
    main.innerHTML = `
        <div class="error-message">
            <h2>${message}</h2>
            <a href="/catalog" class="back-link">← Вернуться в каталог</a>
        </div>
    `;
}