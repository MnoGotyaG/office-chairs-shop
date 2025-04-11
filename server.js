const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Обработка CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Маршруты для статических страниц
const staticRoutes = ['/', '/catalog', '/cart', '/checkout', '/login', '/register', '/account', '/order-success'];
staticRoutes.forEach(route => {
    app.get(route, (req, res) => {
        const page = route === '/' ? 'index' : route.slice(1);
        res.sendFile(path.join(__dirname, 'views', `${page}.html`));
    });
});

// Middleware авторизации
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
    
    try {
        const [users] = await db.query('SELECT * FROM users WHERE token = ?', [token]);
        if (users.length === 0) return res.status(401).json({ error: 'Неверный токен' });
        req.user = users[0];
        next();
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// Создание заказа
app.post('/api/orders', async (req, res) => {
    let connection;
    try {
        const { user_id, items, total } = req.body;
        
        // Валидация данных
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Товары не указаны' });
        }
        if (typeof total !== 'number' || total <= 0) {
            return res.status(400).json({ error: 'Некорректная сумма' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Создаем заказ
            const [orderResult] = await connection.query(
                `INSERT INTO orders (user_id, total, status) 
                 VALUES (?, ?, 'pending')`,
                [user_id || null, total]
            );

            // Добавляем товары
            const orderItemsValues = items.map(item => [
                orderResult.insertId,
                item.product_id,
                item.quantity,
                item.price
            ]);

            await connection.query(
                `INSERT INTO order_items 
                 (order_id, product_id, quantity, price)
                 VALUES ?`,
                [orderItemsValues]
            );

            await connection.commit();
            
            res.status(201).json({ 
                orderId: orderResult.insertId,
                total: total
            });

        } catch (err) {
            await connection.rollback();
            throw err;
        }

    } catch (err) {
        console.error('Ошибка создания заказа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        if (connection) connection.release();
    }
});

// Получение информации о заказе
app.get('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    console.log(`[DEBUG] Запрос заказа ${orderId}`);

    try {
        // Выполняем SQL-запрос
        const [result] = await db.query(
            `SELECT 
                id,
                user_id AS userId,
                total,
                status,
                DATE_FORMAT(created_at, '%Y-%m-%dT%TZ') AS createdAt
             FROM orders 
             WHERE id = ?`,
            [orderId]
        );

        // Обработка разных форматов ответа
        const orderData = Array.isArray(result) ? result[0] : result;

        // Валидация данных
        if (!orderData?.id || !orderData?.total) {
            throw new Error('Неверная структура данных заказа');
        }

        // Формирование ответа
        const response = {
            id: orderData.id,
            userId: orderData.userId || null,
            total: Number(orderData.total),
            status: orderData.status || 'pending',
            createdAt: orderData.createdAt
        };

        res.json(response);

    } catch (err) {
        console.error(`[ERROR] Ошибка: ${err.message}`);
        res.status(500).json({
            error: 'Ошибка сервера',
            details: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Получение товаров заказа
// Получение товаров заказа
app.get('/api/orders/:id/items', async (req, res) => {
    try {
        // Правильная деструктуризация:
        const result = await db.query(
            `SELECT 
                p.id,
                p.name,
                oi.quantity,
                oi.price
             FROM order_items oi
             INNER JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
            [req.params.id]
        );
        console.log("Результат запроса:", result);

        // Гарантируем, что это массив
        if (!Array.isArray(result)) {
            console.error("rows не является массивом:", rows);
            return res.status(500).json({ error: 'Некорректные данные из базы' });
        }

        const processedItems = result.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price)
        }));

        console.log("Товары для заказа:", processedItems);
        res.json(processedItems);

    } catch (err) {
        console.error('Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Получение заказов пользователя
app.get('/api/orders', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ error: "Требуется user_id" });
        }

        // 1. Выполняем запрос к базе данных
        const result = await db.query(`
            SELECT 
                id,
                total,
                status,
                DATE_FORMAT(created_at, '%Y-%m-%dT%TZ') AS date
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

//console.log('Результат запроса:', JSON.stringify(result, null, 2));
        
        res.json(result);

    } catch (err) {
        console.error('Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API для товаров
app.get('/api/products', async (req, res) => {
    try {
        const { category, minPrice, maxPrice, sort, search } = req.query;
        let query = `
            SELECT 
                id,
                name,
                CAST(price AS DECIMAL(10,2)) AS price,
                category,
                material,
                warranty,
                dimensions,
                weight,
                description,
                CAST(rating AS DECIMAL(3,2)) AS rating,
                COALESCE(images, JSON_ARRAY()) AS images,
                created_at
            FROM products
        `;
        const params = [];
        const conditions = [];
        
        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }
        if (minPrice || maxPrice) {
            conditions.push('price BETWEEN ? AND ?');
            params.push(minPrice || 0, maxPrice || 9999999);
        }
        if (search) {
            conditions.push('(name LIKE ? OR description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const sortOptions = {
            price_asc: 'price ASC',
            price_desc: 'price DESC',
            rating: 'rating DESC',
            new: 'created_at DESC'
        };
        query += ` ORDER BY ${sortOptions[sort] || 'id'} LIMIT 100`;
        
        const products = await db.query(query, params);
        res.json(products);
    } catch (err) {
        console.error('Ошибка получения товаров:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(products[0]);
    } catch (err) {
        console.error('Ошибка получения товара:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Авторизация и регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }
        
        const existing = await db.query(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email уже занят' });
        }
        
        const token = Math.random().toString(36).substr(2);
        const result = await db.query(
            `INSERT INTO users 
            (name, email, password, phone)
            VALUES (?, ?, ?, ?)`,
            [name, email, password, phone]
        );

        const user = {
            id: result.insertId,
            name,
            email,
            phone,
        };

        res.status(201).json({ user });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Делаем запрос к базе данных
        const [result] = await db.query(
            'SELECT * FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        // 2. Проверяем структуру ответа
        const user = Array.isArray(result) ? result[0] : result;

        // 3. Проверка существования пользователя
        if (!user || !user.id) {
            return res.status(401).json({ message: 'Неверные данные' });
        }

        // 4. Возвращаем данные
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Серверный код (server.js)
// Обновление профиля
app.put('/api/users', async (req, res) => {
    let connection;
    
    try {
        const { id, name, email, phone } = req.body;

        // 1. Валидация входных данных
        if (!id || typeof id !== 'number') {
            return res.status(400).json({ error: 'Некорректный ID пользователя' });
        }
        /*if (!currentPassword || typeof currentPassword !== 'string') {
            return res.status(400).json({ error: 'Текущий пароль обязателен' });
        }*/
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Имя обязательно' });
        }
        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. Поиск пользователя
        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const user = users[0];

        /*// 3. Проверка пароля (plain text)
        if (currentPassword !== user.password) {
            await connection.rollback();
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }*/

        // 4. Обновление данных
        await connection.query(`
            UPDATE users 
            SET 
                name = ?, 
                email = ?, 
                phone = ?
            WHERE id = ?
        `, [name, email, phone || null, id]);

        // 5. Получение обновленных данных
        const [updatedUsers] = await connection.query('SELECT id, name, email, phone FROM users WHERE id = ?', [id]);
        
        await connection.commit();
        res.json(updatedUsers[0]);

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Ошибка обновления:', err);
        
        // Обработка дубликата email
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email уже занят' });
        }
        
        res.status(500).json({ error: 'Ошибка сервера' });
    
    } finally {
        if (connection) connection.release();
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Страница не найдена</h1>
        <a href="/">На главную</a>
    `);
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});