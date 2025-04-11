document.addEventListener('DOMContentLoaded', async () => {
    const productsContainer = document.getElementById('productsContainer');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    let products = [];

    console.log('Инициализация каталога...');

    // Обновление счетчика корзины
    const updateCartCounter = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const counter = document.querySelector('.cart-counter');
        if (counter) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            console.log('Обновление счетчика корзины. Текущее количество:', totalItems);
            counter.textContent = totalItems;
        }
    };
    updateCartCounter();

    // Загрузка товаров
    const fetchProducts = async () => {
        try {
            console.log('Загрузка товаров с сервера...');
            const response = await fetch('/api/products');
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Получены данные с сервера:', data);
            return data;

        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
            productsContainer.innerHTML = `
                <div class="error">
                    Ошибка загрузки данных: ${error.message}
                </div>
            `;
            return [];
        }
    };

    // Рендер товаров
    const renderProducts = (productsToRender) => {
        console.log('Начало рендеринга товаров. Количество:', productsToRender.length);
        
        productsContainer.innerHTML = productsToRender.map(product => {
            if (!product.id || !product.name || !product.price) {
                console.error('Некорректный товар:', product);
                return '';
            }

            // Обработка изображений
            const images = Array.isArray(product.images) 
                ? product.images 
                : JSON.parse(product.images || '[]');

            console.log(`Рендер товара ID: ${product.id}`, {
                name: product.name,
                images: images
            });

            return `
                <div class="product-card">
                    <a href="/product/${product.id}">
                        <img src="${images[0] || '/images/placeholder.jpg'}" 
                             alt="${product.name}" 
                             class="product-image">
                        <h3>${product.name}</h3>
                    </a>
                    <div class="product-info">
                        <span class="price">${Number(product.price).toLocaleString()} ₽</span>
                        <span class="rating">★ ${Number(product.rating).toFixed(1)}</span>
                    </div>
                    <button class="add-to-cart" 
                            data-id="${product.id}"
                            data-name="${product.name}"
                            data-price="${product.price}"
                            data-image="${images[0] || ''}">
                        В корзину
                    </button>
                </div>
            `;
        }).join('');

        console.log('Рендеринг завершен');
    };

    // Фильтрация и сортировка
    const filterProducts = () => {
        console.log('Фильтрация товаров...');
        
        const searchQuery = searchInput.value.toLowerCase();
        const minPrice = Number(document.getElementById('minPrice').value) || 0;
        const maxPrice = Number(document.getElementById('maxPrice').value) || Infinity;
        const categories = Array.from(document.querySelectorAll('.category-filter input:checked'))
                            .map(checkbox => checkbox.value);

        console.log('Параметры фильтрации:', {
            searchQuery,
            minPrice,
            maxPrice,
            categories
        });

        const filtered = products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery) || 
                                 (product.description?.toLowerCase().includes(searchQuery));
            
            const matchesPrice = Number(product.price) >= minPrice && 
                               Number(product.price) <= maxPrice;
            
            const matchesCategory = categories.length === 0 || 
                                  categories.includes(product.category);

            console.log(`Проверка товара ${product.id}:`, {
                matchesSearch,
                matchesPrice,
                matchesCategory
            });

            return matchesSearch && matchesPrice && matchesCategory;
        });

        // Сортировка
        const sortValue = sortSelect.value;
        console.log('Сортировка по:', sortValue);
        
        filtered.sort((a, b) => {
            switch(sortValue) {
                case 'price_asc': return a.price - b.price;
                case 'price_desc': return b.price - a.price;
                case 'rating': return b.rating - a.rating;
                default: return 0;
            }
        });

        console.log('Отфильтрованные товары:', filtered);
        renderProducts(filtered);
    };

    // Инициализация
    const initialize = async () => {
        console.log('Инициализация приложения...');
        
        products = await fetchProducts();
        console.log('Получено товаров:', products.length);
        
        filterProducts();
        
        // Обработчики событий
        searchInput.addEventListener('input', () => {
            console.log('Изменение поискового запроса');
            filterProducts();
        });
        
        sortSelect.addEventListener('change', () => {
            console.log('Изменение сортировки');
            filterProducts();
        });
        
        document.querySelectorAll('.category-filter input').forEach(input => {
            input.addEventListener('change', () => {
                console.log('Изменение категории');
                filterProducts();
            });
        });

        // Обработчик корзины
        productsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart')) {
                const button = e.target;
                console.log('Добавление в корзину:', {
                    id: button.dataset.id,
                    name: button.dataset.name
                });

                const product = {
                    id: button.dataset.id,
                    name: button.dataset.name,
                    price: Number(button.dataset.price),
                    image: button.dataset.image || '/images/placeholder.jpg',
                    quantity: 1
                };

                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                const existing = cart.find(item => item.id === product.id);

                if (existing) {
                    existing.quantity = Math.min(existing.quantity + 1, 20);
                    console.log('Увеличение количества товара:', existing);
                } else {
                    cart.push(product);
                    console.log('Добавлен новый товар:', product);
                }

                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartCounter();
                alert('Товар добавлен в корзину');
            }
        });
    };

    initialize();
});