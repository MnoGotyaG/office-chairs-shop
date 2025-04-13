const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'vfr2012cbv',
    database: 'office_chairs_shop',
    waitForConnections: true,
    connectionLimit: 10
});

// Проверка подключения
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Проверка подключения: УСПЕШНО');
        connection.release();
    } catch (error) {
        console.error('❌ Ошибка подключения к MySQL:', error.message);
        process.exit(1);
    }
})();

module.exports = {
    query: async (sql, values) => {
        const [rows] = await pool.query(sql, values);
        return rows;
    },
    getConnection: () => pool.getConnection()  // Добавляем метод для получения соединения
};


/*const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',          // ваш PostgreSQL пользователь
    host: 'localhost',
    database: 'office_chairs_shop',
    password: 'vfr2012cbv',    // ваш пароль от PostgreSQL
    port: 5432,                // стандартный порт PostgreSQL
    max: 10,                   // максимальное количество клиентов
    idleTimeoutMillis: 30000,  // таймаут бездействия
    connectionTimeoutMillis: 2000 // таймаут подключения
});

// Проверка подключения
(async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Подключение к PostgreSQL успешно!');
        client.release(); // Освобождаем клиент обратно в пул
    } catch (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        process.exit(1);
    }
})();

module.exports = {
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            const res = await client.query(text, params);
            return res.rows; // Возвращаем только строки результата
        } finally {
            client.release(); // Гарантированно освобождаем клиент
        }
    },
    pool // Экспортируем пул для ручного управления соединениями
};*/