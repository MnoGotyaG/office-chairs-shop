const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
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