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

// Получение ID из URL
function getProductIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return parseInt(pathParts.pop(), 10);
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
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сервера');
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
        `${product.price.toLocaleString()} ₽` : 'Цена не указана';
    elements.category.textContent = product.category || '—';
    elements.material.textContent = product.material || '—';
    elements.warranty.textContent = product.warranty ? 
        `${product.warranty} лет` : '—';
    elements.dimensions.textContent = product.dimensions || '—';
    elements.weight.textContent = product.weight || '—';
    elements.description.textContent = product.description || 'Описание отсутствует';

    // Галерея
    elements.mainImage.src = product.images?.[0] || '/images/placeholder.jpg';
    elements.gallery.innerHTML = (product.images || [])
        .map((img, index) => `
            <img src="${img}" 
                 alt="${product.name}" 
                 class="thumbnail ${index === 0 ? 'active' : ''}"
                 onclick="updateMainImage('${img}', this)">
        `).join('');
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

// Кнопка корзины
// В обработчике кнопки "Добавить в корзину"
function setupAddToCartButton(productId) {
    const btn = document.getElementById('addToCartBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const product = {
            id: productId,
            name: document.getElementById('productName').textContent,
            price: parseFloat(document.getElementById('productPrice').textContent.replace(/[^\d]/g, '')),
            image: document.getElementById('mainImage').src
        };
        
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item.id == productId);
        
        if (existingItem) {
            if (existingItem.quantity < 20) existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        alert('Товар добавлен в корзину');
    });
}

// Обработка ошибок
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