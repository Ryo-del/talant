// --- Вспомогательные функции для управления состоянием UI ---
const authContainer = document.getElementById('auth-container');
const createAnketyContainer = document.getElementById('create-ankety-container');
const anketyListContainer = document.getElementById('ankety-list-container');
const welcomeMessage = document.getElementById('welcome-message');

const showLoginBtn = document.getElementById('show-login-btn');
const showSigninBtn = document.getElementById('show-signin-btn');
const showAnketyBtn = document.getElementById('show-ankety-btn');
const showCreateAnketyBtn = document.getElementById('show-create-ankety-btn');
const logoutBtn = document.getElementById('logout-btn');

let isLoggedIn = false;
let currentUsername = '';

// Показывает нужный контейнер и скрывает остальные
function showContainer(container) {
    [authContainer, createAnketyContainer, anketyListContainer].forEach(c => {
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
        showAnketyBtn.style.display = 'inline';
        showCreateAnketyBtn.style.display = 'inline';
        logoutBtn.style.display = 'inline';
    } else {
        // Не авторизован (по умолчанию показываем форму входа)
        isLoggedIn = false;
        currentUsername = '';
        showLoginBtn.style.display = 'inline';
        showSigninBtn.style.display = 'inline';
        welcomeMessage.style.display = 'none';
        showAnketyBtn.style.display = 'none';
        showCreateAnketyBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        
        // Показываем контейнер авторизации по умолчанию
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
    messageElement.classList.remove('success');

    try {
        const formData = new FormData(form);
        
        // Преобразуем FormData в строку URL-encoded, как требует Go-бэкенд (r.FormValue)
        const urlSearchParams = new URLSearchParams(formData).toString();

        const response = await fetch(url, {
            method: 'POST',
            // Важно: Go-бэкенд ожидает x-www-form-urlencoded
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
            body: urlSearchParams,
        });

        if (response.ok) {
            messageElement.textContent = successMessage;
            messageElement.classList.add('success');
            form.reset();
            if (afterSuccess) {
                await afterSuccess(formData);
            }
        } else {
            // Пытаемся получить текст ошибки от бэкенда
            const errorText = await response.text();
            messageElement.textContent = `Ошибка (${response.status}): ${errorText}`;
            messageElement.classList.remove('success');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети: ${error.message}`;
        messageElement.classList.remove('success');
    }
}

// 1. Обработка регистрации
document.getElementById('signin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/singin', 'signin-form', 'Регистрация успешна! Теперь Вы можете войти.', 
        async () => {
            // Переключение на форму входа после успешной регистрации
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('signin-form').classList.add('hidden');
        }
    );
});

// 2. Обработка входа
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/login', 'login-form', 'Вход успешен!', 
        async (formData) => {
            // Устанавливаем статус авторизации и имя пользователя (из формы)
            isLoggedIn = true;
            currentUsername = formData.get('username'); // Используем имя из формы
            updateUI(isLoggedIn);
            
            // Сразу переходим к созданию/просмотру анкет
            showContainer(createAnketyContainer); 
        }
    );
});

// 3. Обработка создания анкеты
document.getElementById('create-ankety-form').addEventListener('submit', function(e) {
    e.preventDefault();
    submitForm('/createankety', 'create-ankety-form', 'Анкета успешно создана!', 
        async () => {
            // После создания можно сразу обновить список анкет
            await loadAnketyList();
            showContainer(anketyListContainer);
        }
    );
});


// 4. Загрузка и отображение анкет
async function loadAnketyList() {
    const listElement = document.getElementById('ankety-list');
    const messageElement = anketyListContainer.querySelector('.form-message');
    listElement.innerHTML = ''; // Очистка списка
    messageElement.textContent = 'Загрузка анкет...';
    messageElement.classList.remove('success');
    
    try {
        // Мы отправляем запрос на ShowAnketyHandler. 
        // Куки 'auth_token' будут отправлены браузером автоматически.
        const response = await fetch('/showankety', {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
            const data = await response.json();
            messageElement.textContent = `Загружено анкет: ${data.length}`;
            messageElement.classList.add('success');
            
            if (data.length === 0) {
                listElement.innerHTML = '<p style="text-align: center;">Анкеты пока отсутствуют.</p>';
                return;
            }

            data.forEach(anketa => {
                const card = document.createElement('div');
                card.className = 'anketa-card';
                card.innerHTML = `
                    <p><strong>ID Анкеты:</strong> ${anketa.id}</p>
                    <p><strong>Пользователь ID:</strong> ${anketa.user_id}</p>
                    <hr>
                    <p><strong>Имя:</strong> ${anketa.name}</p>
                    <p><strong>Пол:</strong> ${anketa.gender}</p>
                    <p><strong>Возраст:</strong> ${anketa.age}</p>
                    <p><strong>Профессия:</strong> ${anketa.job}</p>
                    <p><strong>Образование:</strong> ${anketa.school}</p>
                `;
                listElement.appendChild(card);
            });

        } else if (response.status === 401) {
             // Если токен невалиден или отсутствует
            messageElement.textContent = 'Ошибка: Токен невалиден. Пожалуйста, войдите снова.';
            updateUI(false);
        }
        else {
            const errorText = await response.text();
            messageElement.textContent = `Ошибка загрузки анкет (${response.status}): ${errorText}`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        messageElement.textContent = `Ошибка сети при загрузке анкет: ${error.message}`;
    }
}

// --- Навигация и инициализация ---

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

showCreateAnketyBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showContainer(createAnketyContainer);
        createAnketyContainer.querySelector('.form-message').textContent = ''; // Очистить сообщение
    }
});

showAnketyBtn.addEventListener('click', () => {
    if (isLoggedIn) {
        showContainer(anketyListContainer);
        loadAnketyList();
    }
});

logoutBtn.addEventListener('click', () => {
    // Поскольку кука HttpOnly, мы не можем удалить её в JS.
    // Мы полагаемся на то, что кука истечет (Expires в Go) 
    // или будет перезаписана при следующем входе.
    // На клиенте мы просто сбрасываем статус авторизации и UI.
    alert('Выход выполнен. Для полного удаления сессии токен должен истечь.');
    updateUI(false);
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateUI(isLoggedIn);
});