document.addEventListener('DOMContentLoaded', async () => {
    const productsContainer = document.getElementById('productsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    updateCartCounter();
    let products = [];

    // Инициализация
    loadAndRenderProducts();

    // Обработчики событий
    searchInput.addEventListener('input', filterProducts);
    sortSelect.addEventListener('change', filterProducts);
    document.querySelectorAll('.category-filter input').forEach(input => {
        input.addEventListener('change', filterProducts);
    });

    async function loadAndRenderProducts() {
        products = await fetchProducts();
        renderProducts(products);
    }

    async function fetchProducts() {
        try {
            const response = await fetch('/api/products');
            return await response.json();
        } catch (error) {
            console.error('Ошибка:', error);
            return [];
        }
    }

    function filterProducts() {
        const searchQuery = searchInput.value.toLowerCase();
        const sortValue = sortSelect.value;
        const categories = Array.from(document.querySelectorAll('.category-filter input:checked'))
                            .map(checkbox => checkbox.value);
        const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
        const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

        let filtered = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery) || 
                                 product.description.toLowerCase().includes(searchQuery);
            const matchesCategory = categories.length === 0 || 
                                  categories.includes(product.category);
            const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

            return matchesSearch && matchesCategory && matchesPrice;
        });

        // Сортировка
        switch(sortValue) {
            case 'price_asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
        }

        renderProducts(filtered);
    }

    function renderProducts(products) {
    productsContainer.innerHTML = products.map(product => `
        <div class="product-card">
            <a href="/product/${product.id}">
                <img src="${product.images?.[0] || '/images/placeholder.jpg'}" 
                     alt="${product.name}" 
                     class="product-image">
                <h3>${product.name}</h3>
            </a>
            <div class="product-info">
                <span class="price">${product.price.toLocaleString()} ₽</span>
                <span class="rating">★ ${product.rating?.toFixed(1) || '0.0'}</span>
            </div>
            <button class="add-to-cart" 
                    data-id="${product.id}"
                    data-name="${product.name}"
                    data-price="${product.price}"
                    data-image="${product.images?.[0] || ''}">
                В корзину
            </button>
        </div>
    `).join('');

    // Добавляем обработчики для новых кнопок
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', addToCartHandler);
    });
}

function addToCartHandler(event) {
    const button = event.target;
    const product = {
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price),
        image: button.dataset.image || '/images/placeholder.jpg',
        quantity: 1
    };

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        if (existingItem.quantity < 20) {
            existingItem.quantity++;
            showAlert(`Количество увеличено: ${existingItem.quantity} шт.`);
        } else {
            showAlert('Максимальное количество - 20 шт.');
            return;
        }
    } else {
        cart.push(product);
        showAlert('Товар добавлен в корзину');
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCounter();
}

function showAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'cart-alert';
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


    // Обработчик кнопки "В корзину"
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.dataset.id;
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            const existingItem = cart.find(item => item.id == productId);
            if (existingItem) {
                if (existingItem.quantity < 20) existingItem.quantity++;
            } else {
                cart.push({
                    id: productId,
                    quantity: 1,
                    name: button.dataset.name,
                    price: parseFloat(button.dataset.price),
                    image: button.dataset.image
                });
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            alert('Товар добавлен в корзину');
        });
    });
});
