const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Данные товаров
const products = [
    {
        id: 1,
        name: "ErgoMaster Pro",
        price: 24990,
        category: "ergonomic",
        rating: 4.8,
        description: "Профессиональное эргономичное кресло",
        material: "Сетчатая ткань",
        warranty: 5,
        dimensions: "70×70×120 см",
        images: ["/images/chair1.jpg"],
        weight: "18 кг"
    },
    {
        id: 2,
        name: "Executive Lux 2024",
        price: 45990,
        category: "executive",
        rating: 4.9,
        description: "Роскошное кресло для руководителя",
        material: "Натуральная кожа",
        warranty: 7,
        dimensions: "85×75×135 см",
        images: ["/images/chair2.jpg"]
    }
];

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/catalog', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'catalog.html'));
});

app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

// API Endpoints
app.get('/api/products', (req, res) => {
    if (req.query.category) {
        const filtered = products.filter(p => p.category === req.query.category);
        return res.json(filtered.slice(0, req.query.limit || 4));
    }
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const productId = parseInt(req.params.id, 10); // Явное преобразование в число
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        return res.status(404).json({ 
            error: 'Товар не найден',
            details: `Запрошенный ID: ${productId}`
        });
    }
    
    res.json(product);
});

// Обработка корзины
app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

// Оформление заказа
app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

// Успешное оформление
app.get('/order-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'order-success.html'));
});

// Добавьте эти новые роуты ↓
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'account.html'));
});


// Моковый обработчик заказов
app.post('/api/orders', (req, res) => {
    const order = req.body;
    console.log('Новый заказ:', order);
    res.json({ success: true, orderId: Date.now() });
});


app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});