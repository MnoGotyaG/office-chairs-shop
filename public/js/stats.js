document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.isAdmin) window.location.href = '/';


    // Элементы интерфейса
    const elements = {
        total: document.getElementById('totalSales'),
        average: document.getElementById('averageOrder'),
        products: document.getElementById('popularProducts'),
        period: document.getElementById('periodSelect'),
        error: document.getElementById('errorContainer')
    };

    // Функции
    const showError = (message) => {
        elements.error.innerHTML = `<div class="error">${message}</div>`;
    };

    const loadStats = async (period) => {
        try {
            const userData = btoa(unescape(encodeURIComponent(
                JSON.stringify(currentUser)
            )));
            
            const response = await fetch(`/api/stats?period=${period}`, {
                headers: { 'X-User-Data': userData }
            });

            //console.log('Статистика response:', response);
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Ошибка сервера');
            }
            
            const data = await response.json();
        
            // Обновление данных о продажах
            elements.total.textContent = `${data.sales.total.toLocaleString('ru-RU')} ₽`;
            elements.average.textContent = `${Math.round(data.sales.averageOrder).toLocaleString('ru-RU')} ₽`;
            
            // Обновление статистики посещений
            document.getElementById('totalVisits').textContent = data.analytics.totalVisits.toLocaleString();
            document.getElementById('uniqueVisitors').textContent = data.analytics.uniqueVisitors.toLocaleString();
            
            // Обновление популярных страниц
            const pagesContainer = document.getElementById('popularPages');
            pagesContainer.innerHTML = data.analytics.popularPages
                .map(({ page, count }, index) => `
                    <div class="page-item">
                        <span class="rank">${index + 1}.</span>
                        <span class="url">${page}</span>
                        <span class="count">${count}</span>
                    </div>
                `).join('');

            // Обновление диаграммы устройств
            renderDevicesChart(data.analytics.devices);
            
        } catch (error) {
            showError(error.message);
            console.error('Ошибка:', error);
        }
    };


    let salesChart;

    const renderChart = (data) => {
        const ctx = document.getElementById('salesChart').getContext('2d');

        const labels = data.map(d => d.date);
        const values = data.map(d => d.total);

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Продажи (₽)',
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: '#36A2EB',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };
    function updateUI(data) {
        // Проверка наличия данных
        if (!data) {
            showError('Нет данных для отображения', elements.error);
            return;
        }

        // Обновление данных о продажах
        elements.total.innerHTML = data.sales.total.toLocaleString('ru-RU') + ' ₽';
        elements.average.innerHTML = Math.round(data.sales.averageOrder).toLocaleString('ru-RU') + ' ₽';

        // Обновление счетчиков
        elements.total.textContent = data.analytics.totalVisits?.toLocaleString() || '0';
        elements.unique.textContent = data.analytics.uniqueVisitors?.toLocaleString() || '0';

        // Популярные страницы
        elements.pages.innerHTML = data.analytics.popularPages
            ?.map(([page, count], index) => `
                <div class="page-item">
                    <span class="rank">${index + 1}.</span>
                    <span class="url">${page}</span>
                    <span class="count">${count}</span>
                </div>
            `).join('') || '<div class="no-data">Нет данных</div>';
            // Устройства
        if (data.analytics.devices) {
            renderDevicesChart(data.analytics.devices);
        }

            
        // Обновление данных о посещениях
        document.getElementById('totalVisits').textContent = data.visits.totalVisits.toLocaleString();
        document.getElementById('uniqueVisitors').textContent = data.visits.uniqueVisitors.toLocaleString();

        // Популярные страницы
        const popularPagesContainer = document.getElementById('popularPages');
        popularPagesContainer.innerHTML = data.visits.popularPages
            .map(([page, count], index) => `
                <div class="page-item">
                    <span class="page-rank">${index + 1}.</span>
                    <span class="page-url">${page}</span>
                    <span class="page-count">${count} посещений</span>
                </div>
            `).join('');

        // Круговая диаграмма устройств
        renderDevicesChart(data.visits.devices);
    }
    let devicesChart = null;

    function renderDevicesChart(devicesData) {
        const ctx = document.getElementById('devicesChart').getContext('2d');
        
        if (window.devicesChart) {
            window.devicesChart.destroy();
        }

        window.devicesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Десктопы', 'Мобильные', 'Планшеты'],
                datasets: [{
                    data: [
                        devicesData.desktop || 0,
                        devicesData.mobile || 0,
                        devicesData.tablet || 0
                    ],
                    backgroundColor: ['#4e79a7', '#59a14f', '#e15759']
                }]
            }
        });
    }
    // Инициализация
    elements.period.addEventListener('change', () => loadStats(elements.period.value));
    loadStats('month');
    
});