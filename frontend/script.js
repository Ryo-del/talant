// --- Вспомогательные функции для управления состоянием UI ---
const authContainer = document.getElementById('auth-container');
const createJobContainer = document.getElementById('create-job-container');
const jobsListContainer = document.getElementById('jobs-list-container');
const myJobsContainer = document.getElementById('my-jobs-container');
const jobDetailsContainer = document.getElementById('job-details-container');
const welcomeMessage = document.getElementById('welcome-message');

const showLoginBtn = document.getElementById('show-login-btn');
const showSigninBtn = document.getElementById('show-signin-btn');
const showJobsBtn = document.getElementById('show-jobs-btn');
const showCreateJobBtn = document.getElementById('show-create-job-btn');
const showMyJobsBtn = document.getElementById('show-my-jobs-btn');
const logoutBtn = document.getElementById('logout-btn');

let isLoggedIn = false;
let currentUsername = '';
let currentUserId = null;
let currentJobId = null;

// НОВАЯ ФУНКЦИЯ: Получение значения куки по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Показывает нужный контейнер и скрывает остальные
function showContainer(container) {
    [authContainer, createJobContainer, jobsListContainer, myJobsContainer, jobDetailsContainer].forEach(c => {
        c.classList.add('hidden');
    });
    container.classList.remove('hidden');
}

// Обновляет навигацию в зависимости от статуса авторизации
function updateUI(status) {
    if (status) {
        // Авторизован
        showLoginBtn.style.display = 'none';
        showSigninBtn.style.display = 'none';
        welcomeMessage.textContent = `Добро пожаловать, ${currentUsername}!`;
        welcomeMessage.style.display = 'inline';
        showJobsBtn.style.display = 'inline';
        showCreateJobBtn.style.display = 'inline';
        showMyJobsBtn.style.display = 'inline';
        logoutBtn.style.display = 'inline';
        showContainer(jobsListContainer);
        loadJobsList();
    } else {
        // Не авторизован
        isLoggedIn = false;
        currentUsername = '';
        currentUserId = null;
        showLoginBtn.style.display = 'inline';
        showSigninBtn.style.display = 'inline';
        welcomeMessage.style.display = 'none';
        showJobsBtn.style.display = 'none';
        showCreateJobBtn.style.display = 'none';
        showMyJobsBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        
        // Показываем контейнер авторизации
        showContainer(authContainer);
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('signin-form').classList.add('hidden');
    }
}

// --- Обработчики форм ---

// Вспомогательная функция для отправки данных формы
async function submitForm(url, formId, successMessage, afterSuccess) {
    const form = document.getElementById(formId);
    const messageElement = form.querySelector('.form-message');
    
    // Сброс предыдущих сообщений
    messageElement.textContent = 'Отправка...';
    messageElement.classList.remove('success', 'info');
    messageElement.classList.add('info');

    try {
        const formData = new FormData(form);
        
        console.log('Отправляемые данные на', url, ':', Object.fromEntries(formData));
        
        const urlSearchParams = new URLSearchParams(formData).toString();

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlSearchParams,
            credentials: 'include'
        });

        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
            const responseText = await response.text();
            console.log('Текст ответа:', responseText);
            
            messageElement.textContent = successMessage;
            messageElement.classList.remove('info');
            messageElement.classList.add('success');
            form.reset();
            
            if (afterSuccess) {
                await afterSuccess(formData);
            }
        } else {
            const errorText = await response.text();
            console.log('Текст ошибки:', errorText);
            messageElement.textContent = `Ошибка (${response.status}): ${errorText}`;
            messageElement.classList.remove('info', 'success');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети: ${error.message}`;
        messageElement.classList.remove('info', 'success');
    }
}

// 1. Обработка регистрации
document.getElementById('signin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/singin', 'signin-form', 'Регистрация успешна! Теперь Вы можете войти.', 
        async () => {
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('signin-form').classList.add('hidden');
        }
    );
});

// 2. Обработка входа
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/login', 'login-form', 'Вход успешен!', 
        async () => {
            await checkAuthStatus();
        }
    );
});

// 3. Обработка создания вакансии
document.getElementById('create-job-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/createjob', 'create-job-form', 'Вакансия успешно создана!', 
        async () => {
            await loadJobsList();
            showContainer(jobsListContainer);
        }
    );
});

// Проверка статуса авторизации
async function checkAuthStatus() {
    try {
        const response = await fetch('/checkauth', {
            method: 'GET',
            credentials: 'include' 
        });

        console.log('CheckAuth status:', response.status);
        
        if (response.ok) {
            // Бэкенд возвращает только имя пользователя (текст)
            const username = await response.text();
            console.log('Полученное имя пользователя:', username);
            
            // Получаем ID пользователя из куки
            const userID = getCookie('id_cookie'); 
            
            if (userID) {
                isLoggedIn = true;
                currentUsername = username;
                currentUserId = userID; // Устанавливаем ID
                updateUI(isLoggedIn);
            } else {
                console.warn('Токен авторизации есть, но id_cookie отсутствует.');
                updateUI(false);
            }
            
        } else if (response.status === 401) {
            console.log('Пользователь не авторизован или сессия истекла.');
            updateUI(false); 
        }
    } catch (error) {
        console.error('Ошибка сети при проверке авторизации:', error);
        updateUI(false);
    }
}

// 4. Загрузка и отображение вакансий
async function loadJobsList() {
    const listElement = document.getElementById('jobs-list');
    const messageElement = jobsListContainer.querySelector('.form-message');
    listElement.innerHTML = '';
    messageElement.textContent = 'Загрузка вакансий...';
    messageElement.classList.remove('success', 'info');
    messageElement.classList.add('info');
    
    try {
        const response = await fetch('/showjobs', { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });

        console.log('Load jobs status:', response.status);

        if (response.ok) {
            const data = await response.json();
            
            if (!Array.isArray(data)) { 
                throw new Error('Некорректный формат данных: ожидался массив вакансий.');
            }
            
            console.log('Полученные вакансии:', data);
            
            messageElement.textContent = `Найдено вакансий: ${data.length}`;
            messageElement.classList.remove('info');
            messageElement.classList.add('success');
            
            if (data.length === 0) {
                listElement.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Вакансии пока отсутствуют.</p>';
                return;
            }

            data.forEach(job => {
                const card = document.createElement('div');
                card.className = 'job-card';
                card.dataset.id = job.id; 
                
                // ИСПРАВЛЕНИЕ 1: Сохраняем оригинальный тип (например, 'full') для фильтрации
                card.dataset.jobType = job.job_type || ''; 
                
                const jobTypeText = {
                    'full': 'Полная занятость',
                    'part': 'Частичная занятость',
                    'remote': 'Удалённая работа',
                    'internship': 'Стажировка'
                }[job.job_type] || job.job_type;
                
                const skills = job.skills ? job.skills.split(',').map(s => s.trim()) : [];
                
                card.innerHTML = `
                    <div class="job-card-header">
                        <h3>${job.title || 'Без названия'}</h3>
                        <span class="job-type">${jobTypeText}</span>
                    </div>
                    <p class="job-card-company">${job.company || 'Компания не указана'}</p>
                    <p class="job-card-salary">${job.salary || '0'} ₽</p>
                    <p>${(job.description || 'Описание отсутствует').substring(0, 150)}...</p>
                    ${skills.length > 0 ? `
                        <div class="job-card-skills">
                            ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="job-card-footer">
                        <span class="job-location">📍 ${job.location || 'Не указано'}</span>
                        <span class="job-date">${new Date().toLocaleDateString()}</span>
                    </div>
                `;
                
                card.addEventListener('click', () => showJobDetails(job.id));
                listElement.appendChild(card);
            });

            // Настройка фильтров
            setupFilters();
        } else if (response.status === 401) {
            messageElement.textContent = 'Ошибка: Требуется авторизация';
            updateUI(false);
        } else {
            const errorText = await response.text();
            messageElement.textContent = `Ошибка загрузки вакансий: ${errorText}`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети: ${error.message}`;
    }
}

// Настройка фильтров (ИСПРАВЛЕНО)
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('job-type-filter');
    const salaryFilter = document.getElementById('salary-filter');
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = typeFilter.value;
        const selectedSalary = salaryFilter.value;
        
        document.querySelectorAll('.job-card').forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const company = card.querySelector('.job-card-company').textContent.toLowerCase();
            
            // ИСПРАВЛЕНИЕ 2: Читаем тип занятости из data-атрибута
            const jobType = card.dataset.jobType; 
            
            const salaryText = card.querySelector('.job-card-salary').textContent;
            const salary = parseInt(salaryText.replace(/\D/g, '')) || 0;
            
            let visible = true;
            
            // Поиск по названию и компании
            if (searchTerm && !title.includes(searchTerm) && !company.includes(searchTerm)) {
                visible = false;
            }
            
            // ИСПРАВЛЕНИЕ 3: Фильтр по типу: сравнение значений 'full' == 'full'
            if (selectedType && selectedType !== jobType) { 
                visible = false;
            }
            
            // Фильтр по зарплате
            if (selectedSalary) {
                // Обработка формата '200000+'
                if (selectedSalary.endsWith('+')) {
                    const minSalary = parseInt(selectedSalary.slice(0, -1));
                    if (salary < minSalary) visible = false;
                } else {
                    const [min, max] = selectedSalary.split('-').map(part => {
                        const cleanPart = part.replace(/\D/g, '');
                        return cleanPart ? parseInt(cleanPart) : 0;
                    });
                    
                    if (salary < min || salary > max) visible = false;
                }
            }
            
            card.style.display = visible ? 'block' : 'none';
        });
    }
    
    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    salaryFilter.addEventListener('change', applyFilters);
    
    // ВАЖНО: Применяем фильтры сразу после настройки (загрузки)
    applyFilters(); 
}

// 5. Показать детали вакансии
async function showJobDetails(jobId) {
    currentJobId = jobId;
    const messageElement = jobDetailsContainer.querySelector('.form-message');
    messageElement.textContent = 'Загрузка...';
    messageElement.classList.remove('success', 'info');
    messageElement.classList.add('info');
    
    try {
        // Запрос к исправленному OpenHandler
        const response = await fetch(`/job/${jobId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });

        console.log('Job details status:', response.status);

        if (response.ok) {
            const job = await response.json();
            console.log('Детали вакансии:', job);
            
            document.getElementById('job-details-title').textContent = job.title || job.Title || 'Без названия';
            
            const jobTypeText = {
                'full': 'Полная занятость',
                'part': 'Частичная занятость',
                'remote': 'Удалённая работа',
                'internship': 'Стажировка'
            }[job.job_type] || job.job_type;
            
            const skills = job.skills ? job.skills.split(',').map(s => `<span class="skill-tag">${s.trim()}</span>`).join('') : '';
            
            document.getElementById('job-details-content').innerHTML = `
                <div class="job-detail">
                    <h3>Информация о вакансии</h3>
                    <p><strong>Компания:</strong> ${job.company || 'Не указана'}</p>
                    <p><strong>Зарплата:</strong> ${job.salary || '0'} ₽</p>
                    <p><strong>Тип занятости:</strong> ${jobTypeText}</p>
                    <p><strong>Местоположение:</strong> ${job.location || 'Не указано'}</p>
                    <p><strong>Требуемый опыт:</strong> ${job.experience || 'Не указан'}</p>
                </div>
                
                <div class="job-detail">
                    <h3>Описание</h3>
                    <p>${job.description || 'Описание отсутствует'}</p>
                </div>
                
                ${skills ? `
                <div class="job-detail">
                    <h3>Требуемые навыки</h3>
                    <div class="job-card-skills">${skills}</div>
                </div>
                ` : ''}
                
                <div class="job-detail">
                    <h3>Контактная информация</h3>
                    <p><strong>Создано:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
            `;
            
            // Проверка, что это наша вакансия. Используем job.user_id (JSON-поле из Go)
            // ИСПРАВЛЕНО: Теперь user_id приходит с бэкенда.
            if (job.user_id === currentUserId) { 
                document.getElementById('edit-job-btn').style.display = 'inline-block';
                document.getElementById('delete-job-btn').style.display = 'inline-block';
            } else {
                document.getElementById('edit-job-btn').style.display = 'none';
                document.getElementById('delete-job-btn').style.display = 'none';
            }
            
            messageElement.textContent = '';
            showContainer(jobDetailsContainer);
        } else {
            const errorText = await response.text();
            messageElement.textContent = `Ошибка: ${errorText}`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети: ${error.message}`;
    }
}

// 6. Загрузка моих вакансий
async function loadMyJobs() {
    const listElement = document.getElementById('my-jobs-list');
    const messageElement = myJobsContainer.querySelector('.form-message');
    // УДАЛЕНА ОШИБОЧНАЯ СТРОКА, вызывавшая сбой: card.dataset.jobType = job.job_type;
    listElement.innerHTML = '';
    messageElement.textContent = 'Загрузка ваших вакансий...';
    messageElement.classList.remove('success', 'info');
    messageElement.classList.add('info');
    
    try {
        const response = await fetch('/myjobs', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
        });

        console.log('My jobs status:', response.status);

        if (response.ok) {
            const data = await response.json();
            
            // !!! Проверка на массив
            if (!Array.isArray(data)) { 
                throw new Error('Некорректный формат данных: ожидался массив вакансий.');
            }
            
            messageElement.textContent = `Ваших вакансий: ${data.length}`;
            messageElement.classList.remove('info');
            messageElement.classList.add('success');
            
            if (data.length === 0) {
                listElement.innerHTML = '<p style="text-align: center;">Вы еще не создавали вакансий.</p>';
                return;
            }

            data.forEach(job => {
                const card = document.createElement('div');
                card.className = 'job-card';
                card.dataset.id = job.id;
                
                const jobTypeText = {
                    'full': 'Полная занятость',
                    'part': 'Частичная занятость',
                    'remote': 'Удалённая работа',
                    'internship': 'Стажировка'
                }[job.job_type] || job.job_type;
                
                card.innerHTML = `
                    <div class="job-card-header">
                        <h3>${job.title || job.Title || 'Без названия'}</h3>
                        <span class="job-type">${jobTypeText || 'Не указан'}</span>
                    </div>
                    <p class="job-card-company">${job.company || 'Компания не указана'}</p>
                    <p>Зарплата: ${job.salary || '0'} ₽</p>
                    <p>${(job.description || '').substring(0, 100)}...</p>
                    <div class="job-card-footer">
                        <span class="job-date">Создано: ${new Date().toLocaleDateString()}</span>
                        <button class="edit-btn" onclick="editJob('${job.id}')">Редактировать</button>
                    </div>
                `;
                
                // Добавляем обработчик для просмотра деталей
                card.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('edit-btn')) {
                        showJobDetails(job.id);
                    }
                });
                
                listElement.appendChild(card);
            });
        } else if (response.status === 401) {
            messageElement.textContent = 'Требуется авторизация';
            updateUI(false);
        } else {
            const errorText = await response.text();
            messageElement.textContent = `Ошибка: ${errorText}`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети: ${error.message}`;
    }
}

// 7. Редактирование вакансии (оставляю как есть)
function editJob(jobId) {
    alert('Функция редактирования будет реализована позже для вакансии ID: ' + jobId);
}

// --- Навигация и инициализация (оставляю как есть) ---

// Переключение между формами входа/регистрации
document.getElementById('switch-to-signin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signin-form').classList.remove('hidden');
});

document.getElementById('switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signin-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

// Навигационные кнопки в шапке
showLoginBtn.addEventListener('click', () => {
    showContainer(authContainer);
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signin-form').classList.add('hidden');
});

showSigninBtn.addEventListener('click', () => {
    showContainer(authContainer);
    document.getElementById('signin-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
});

showCreateJobBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showContainer(createJobContainer);
        document.getElementById('create-job-form').querySelector('.form-message').textContent = '';
    }
});

showJobsBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showContainer(jobsListContainer);
        loadJobsList();
    }
});

showMyJobsBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showContainer(myJobsContainer);
        loadMyJobs();
    }
});

// Кнопки в деталях вакансии
document.getElementById('back-to-list-btn').addEventListener('click', () => {
    showContainer(jobsListContainer);
});

document.getElementById('delete-job-btn').addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите удалить эту вакансию?')) return;
    
    try {
        // Запрос к исправленному DeleteHandler
        const response = await fetch(`/job/${currentJobId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Вакансия успешно удалена');
            showContainer(jobsListContainer);
            loadJobsList();
        } else {
            const errorText = await response.text();
            alert(`Ошибка удаления: ${errorText}`);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        alert('Ошибка сети при удалении');
    }
});

// Выход из системы
logoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            alert('Вы успешно вышли из системы');
            updateUI(false);
        } else {
            alert('Ошибка выхода. Попробуйте снова.');
        }
    } catch (error) {
        console.error('Ошибка сети при выходе:', error);
        alert('Ошибка сети при попытке выхода.');
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена');
    console.log('Cookies:', document.cookie);
    checkAuthStatus();
});

//TODO: js ГОВНО