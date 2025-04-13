const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '../logs/access.log');
console.log('Путь к логам доступа:', logPath); // Для отладки


const logParser = {
    parseAccessLogs: () => {
        try {
            const logPath = path.join(__dirname, '../logs/access.log');
            const logs = fs.readFileSync(logPath, 'utf8')
                .split('\n')
                .filter(line => line.trim())
                .map(JSON.parse);
            
            return {
                totalVisits: logs.length,
                uniqueIPs: [...new Set(logs.map(l => l.ip))].length,
                popularPages: getPopularPages(logs)
            };
        } catch (error) {
            console.error('Ошибка чтения логов:', error);
            return null;
        }
    }
};

function getPopularPages(logs) {
    const pages = {};
    logs.forEach(log => {
        if (log.url) {
            const cleanUrl = log.url.split('?')[0];
            pages[cleanUrl] = (pages[cleanUrl] || 0) + 1;
        }
    });
    return Object.entries(pages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
}

module.exports = { logParser, getPopularPages };