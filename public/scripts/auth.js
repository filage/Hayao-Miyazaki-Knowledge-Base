// Auth page script

// Загрузка темы
(function() {
  // Синхронизация body с html
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isDark = !document.body.classList.contains('dark-mode');
      document.documentElement.classList.toggle('dark-mode', isDark);
      document.body.classList.toggle('dark-mode', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      toggle.style.transform = 'scale(0.9)';
      setTimeout(() => toggle.style.transform = 'scale(1)', 150);
    });
  }
})();

const tabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    if (tab.dataset.tab === 'login') {
      loginForm.hidden = false;
      registerForm.hidden = true;
    } else {
      loginForm.hidden = true;
      registerForm.hidden = false;
    }
  });
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  
  const login = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      loginError.textContent = data.error;
      loginError.hidden = false;
      return;
    }
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Редирект
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    window.location.href = redirect;
  } catch (err) {
    loginError.textContent = 'Ошибка соединения с сервером';
    loginError.hidden = false;
  }
});

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.hidden = true;
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const displayName = document.getElementById('register-name').value;
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  
  if (password !== password2) {
    registerError.textContent = 'Пароли не совпадают';
    registerError.hidden = false;
    return;
  }
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      registerError.textContent = data.error;
      registerError.hidden = false;
      return;
    }
    
    // Сохраняем токен и данные пользователя
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Редирект
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
    window.location.href = redirect;
  } catch (err) {
    registerError.textContent = 'Ошибка соединения с сервером';
    registerError.hidden = false;
  }
});

// Проверка авторизации при загрузке
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (token) {
    // Если уже авторизован, редирект
    window.location.href = '/';
  }
}

checkAuth();
