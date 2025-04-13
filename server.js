import('node-fetch').then(fetch => {
    fetch.default('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => console.log('🛰 Внешний IP-адрес:', data.ip));
});

const fs = require('fs');
const express = require('express');
const path = require('path');
const db = require('./db');
const app = express();
const port = 3000;
const { logParser } = require('./utils/analyticsHelper');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//------------------логировние-------------------------------

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
// Создаем поток для записи логов
const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs/access.log'), 
    { flags: 'a' }
);

const readLogFile = (filename) => {
    try {
        const filePath = path.join(logsDir, filename);
        if (!fs.existsSync(filePath)) return [];
        
        const content = fs.readFileSync(filePath, 'utf8');
        return content
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error('Error parsing log entry:', line);
                    return null;
                }
            })
            .filter(entry => entry !== null);

    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};


function saveToLogFile(filename, data) {
    const filePath = path.join(logsDir, filename);
    const logEntry = JSON.stringify(data) + '\n';
    
    fs.appendFile(filePath, logEntry, (err) => {
        if (err) console.error(`Ошибка записи в ${filename}:`, err);
    });
}

// Middleware для логирования
app.use((req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer') || 'direct'
    };
    
    saveToLogFile('access.log', logData);
    next();
});


app.post('/api/analytics', (req, res) => {
    const analyticsData = req.body;
    
    // Сохраняем в файл
    const analyticsStream = fs.createWriteStream(
        path.join(__dirname, 'logs/analytics.log'),
        { flags: 'a' }
    );
    
    analyticsStream.write(JSON.stringify({
        ...analyticsData,
        timestamp: new Date().toISOString()
    }) + '\n');
    
    res.status(200).end();
});


app.post('/api/track', (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const trackingData = JSON.parse(body);
            saveToLogFile('tracking.log', {
                ...trackingData,
                timestamp: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent') || 'unknown'
            });
        } catch (error) {
            console.error('Ошибка обработки трекинга:', error);
        }
    });
    res.status(200).end();
});

function parseCookies(cookieHeader) {
    return (cookieHeader || '')
        .split(';')
        .map(c => c.trim().split('='))
        .reduce((acc, [k, v]) => {
            acc[k] = decodeURIComponent(v || '');
            return acc;
        }, {});
}
//----------------------------------------------------------


// Мидлварь для проверки админа
const checkAdmin = (req, res, next) => {
    const user = JSON.parse(req.headers['x-user-data'] || '{}');
    
    if (!user.isAdmin) {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    next();
};



/*const checkAdmin = async (req, res, next) => {
    try {
        const userDataHeader = req.headers['x-user-data'];
        if (!userDataHeader) {
            console.log('Отсутствует заголовок X-User-Data');
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        // Исправленное декодирование
        const decoded = decodeURIComponent(escape(atob(userDataHeader)));
        const userData = JSON.parse(decoded);

        console.log('Данные пользователя:', userData);
        
        const [users] = await db.query(
            'SELECT is_admin FROM users WHERE id = ?', 
            [userData.id]
        );
        
        if (!users[0]?.is_admin) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        req.user = userData;
        next();
        
    } catch (error) {
        console.error('Ошибка проверки прав:', error);
        res.status(400).json({ error: 'Неверные данные пользователя' });
    }
};*/
// Middleware для обработки пользовательских данных
app.use((req, res, next) => {
    try {
        if (req.headers['x-user-data']) {
            const userData = decodeURIComponent(escape(
                atob(req.headers['x-user-data'])
            ));
            req.user = JSON.parse(userData);
        }
        next();
    } catch (error) {
        console.error('Ошибка декодирования:', error);
        res.status(400).json({ error: 'Invalid user data' });
    }
});

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Query Params:', req.query);
    console.log('Body:', req.body);
    next();
});

// Логирование запросов
app.use((req, res, next) => {

    // Пропускаем логирование запросов к элементам заказов
    if (req.url.includes('/items')) {
        return next();
    }
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Обработка CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000'); // Указать свой домен
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'product.html'));
});

app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/stats.html'));
});

app.get('/order-history', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'order-history.html'));
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
    //console.log(`[DEBUG] Запрос заказа ${orderId}`);

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
        //console.log("Результат запроса:", result);

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

        //console.log("Товары для заказа:", processedItems);
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
        const { name, email, password, phone, date_of_birth, city } = req.body;
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
            (name, email, password, phone, date_of_birth, city)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, password, phone || null, date_of_birth || null, city || null]
        );

        const user = {
            id: result.insertId,
            name,
            email,
            phone: phone || null,
            date_of_birth: date_of_birth || null,
            city: city || null
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
        
        // Добавим проверку входящих данных
        if (!email || !password) {
            return res.status(400).json({ message: 'Все поля обязательны' });
        }

        // Выполняем запрос с улучшенной обработкой
        const result = await db.query(
            `SELECT 
                id, 
                name, 
                email, 
                phone, 
                is_admin AS isAdmin
            FROM users 
            WHERE email = ? 
            AND password = ?`,
            [email, password]
        );

        console.log('Результат запроса:', result);

        let user = null;

        // Если результат — массив
        if (Array.isArray(result) && result.length > 0) {
         user = result[0];
        } 
        // Если это просто объект (один пользователь)
        else if (result && typeof result === 'object') {
            user = result;
        }

        if (!user?.id) {
            console.error('Некорректная структура пользователя:', user);
            return res.status(500).json({ message: 'Ошибка сервера' });
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || null,
                isAdmin: Boolean(user.isAdmin) // Преобразуем tinyint в boolean
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
        const { id, name, email, phone, date_of_birth, city } = req.body;

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
                phone = ?,
                date_of_birth = ?,
                city = ?
            WHERE id = ?
        `, [name, email, phone || null, date_of_birth || null, city || null, id]);

        // 5. Получение обновленных данных
        const [updatedUsers] = await connection.query(
            'SELECT id, name, email, phone, date_of_birth, city FROM users WHERE id = ?', 
            [id]
        );
        
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

// Защищенный эндпоинт статистики
app.get('/api/stats', async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }

        const { period = 'month' } = req.query;
        const dateRange = calculateDateRange(period);

        // --- Статистика из базы данных ---
        const totalSales = await db.query(
            `SELECT 
                IFNULL(SUM(total), 0) AS total,
                COUNT(id) AS orders_count
            FROM orders
            WHERE created_at BETWEEN ? AND ?`,
            [dateRange.start, dateRange.end]
        );

        const salesData = totalSales[0] || { total: 0, orders_count: 0 };

        const popularProducts = await db.query(
            `SELECT 
                p.id,
                p.name,
                IFNULL(SUM(oi.quantity), 0) AS total_sold
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id
                AND o.created_at BETWEEN ? AND ?
            GROUP BY p.id
            ORDER BY total_sold DESC`,
            [dateRange.start, dateRange.end]
        );

        const salesOverTime = await db.query(
            `SELECT 
                DATE(created_at) as date,
                SUM(total) as total
            FROM orders
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY date`,
            [dateRange.start, dateRange.end]
        );

        // --- Статистика из логов ---
        const accessLogs = parseLogFile('access.log');
        const trackingLogs = parseLogFile('tracking.log');

        // Добавим логирование для отладки
        console.log('Access logs count:', accessLogs.length);
        console.log('Tracking logs count:', trackingLogs.length);
        console.log('Sample tracking entry:', trackingLogs[0]);

        const totalVisits = accessLogs.length;
        const uniqueVisitors = new Set(trackingLogs.map(log => log.visitorId)).size;
        const popularPages = getPopularPages(accessLogs);
        const devices = analyzeDevices(trackingLogs);



        // --- Формируем итоговый JSON ---

        const response = {
                sales: {
                    total: Number(salesData.total),
                    averageOrder: salesData.orders_count > 0 
                        ? Number(salesData.total) / salesData.orders_count
                        : 0,
                    popularProducts: popularProducts.map(p => ({
                        id: p.id,
                        name: p.name || 'Неизвестный товар',
                        total_sold: Number(p.total_sold)
                    })),
                    salesOverTime: salesOverTime.map(row => ({
                        date: row.date,
                        total: Number(row.total)
                    }))
                },
                analytics: {
                    totalVisits,
                    uniqueVisitors,
                    popularPages: popularPages.map(([page, count]) => ({ page, count })),
                    devices
                }
            };

            console.log('Статистика отправлена:', {
                totalVisits,
                uniqueVisitors,
                devices
            });

            res.json(response);
        /*res.json({
            total: Number(salesData.total),
            averageOrder: salesData.orders_count > 0 
                ? Number(salesData.total) / salesData.orders_count
                : 0,
            popularProducts: popularProducts.map(p => ({
                name: p.name || 'Неизвестный товар',
                total_sold: Number(p.total_sold)
            })),
            salesOverTime: salesOverTime.map(row => ({
                date: row.date,
                total: Number(row.total)
            })),
            visits: {
                totalVisits,
                uniqueVisitors,
                popularPages,
                devices
            }
        });*/

    } catch (error) {
        console.error('Ошибка статистики:', {
            message: error.message,
            sqlMessage: error.sqlMessage,
            sql: error.sql
        });
        res.status(500).json({ 
            error: 'Ошибка сервера',
            details: error.message
        });
    }
});

    function parseLogFile(filename) {
        const fullPath = path.join(__dirname, 'logs', filename);
        console.log(`Чтение логов из: ${fullPath}`); // Для отладки
        if (!fs.existsSync(fullPath)) return [];
    return fs.readFileSync(path.join(__dirname, 'logs', filename), 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(JSON.parse);
}

function getPopularPages(logs) {
    const pages = {};
    logs.forEach(log => {
        try {
            const url = log.url?.split('?')[0] || 'unknown';
            pages[url] = (pages[url] || 0) + 1;
        } catch (e) {
            console.error('Error processing log entry:', log);
        }
    });
    return Object.entries(pages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
}


function analyzeDevices(logs) {
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    logs.forEach(log => {
        try {
            const ua = (log.userAgent || '').toLowerCase();
            if (!ua) return;
            
            if (/(android|webos|iphone|ipod|blackberry|windows phone)/.test(ua)) {
                devices.mobile++;
            } else if (/(ipad|tablet|playbook|silk)/.test(ua)) {
                devices.tablet++;
            } else {
                devices.desktop++;
            }
        } catch (e) {
            console.error('Error analyzing device:', log);
        }
    });
    return devices;
}


function calculateDateRange(period) {
    const now = new Date();
    const start = new Date(now);
    
    switch(period.toLowerCase()) {
        case 'day':
            start.setDate(now.getDate() - 1);
            break;
        case 'week':
            start.setDate(now.getDate() - 7);
            break;
        case 'month':
            start.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(now.getFullYear() - 1);
            break;
        default:
            start.setTime(0);
    }
    
    return { 
        start: start.toISOString().split('T')[0], 
        end: now.toISOString().split('T')[0] 
    };
}


// server.js
// server.js
app.get('/api/admin/orders', async (req, res) => {
    try {
        
        const orders = await db.query(`
            SELECT 
                o.id,
                o.total,
                o.status,
                o.created_at,
                u.name AS user_name,
                u.email AS user_email,
                u.phone AS user_phone,
                COALESCE(
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', p.id,
                            'name', p.name,
                            'price', oi.price,
                            'quantity', oi.quantity,
                            'image', JSON_UNQUOTE(JSON_EXTRACT(p.images, '$[0]'))
                        )
                    ),
                    JSON_ARRAY()
                ) AS items
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id, o.total, o.status, o.created_at, u.name, u.email
            ORDER BY o.created_at DESC
        `);

        // Обработка результата
        const processedOrders = orders.map(order => ({
            id: order.id,
            total: Number(order.total),
            status: order.status,
            created_at: order.created_at,
            user_name: order.user_name,
            user_email: order.user_email,
            items: order.items.filter(item => item.id !== null) // Фильтр пустых элементов
        }));

        res.json(processedOrders);

    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        res.status(500).json({ 
            error: 'Ошибка сервера',
            details: error.message
        });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        res.json({ success: true });

    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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