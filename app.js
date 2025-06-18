// State management
let state = {
  user: null,
  token: null,
  transactions: [],
  budgets: [],
  goals: [],
  accounts: [],
  settings: {
    currency: 'USD',
    theme: 'light',
    dateFormat: 'MM/DD/YYYY',
    notifications: {
      budget: true,
      goals: true,
      recurring: true,
      bills: true
    }
  }
};

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const addSection = document.getElementById('add-section');
const reportsSection = document.getElementById('reports-section');
const budgetsSection = document.getElementById('budgets-section');
const goalsSection = document.getElementById('goals-section');
const accountsSection = document.getElementById('accounts-section');
const settingsSection = document.getElementById('settings-section');

// Navigation buttons
const navButtons = {
  dashboard: document.getElementById('nav-dashboard'),
  add: document.getElementById('nav-add'),
  reports: document.getElementById('nav-reports'),
  budgets: document.getElementById('nav-budgets'),
  goals: document.getElementById('nav-goals'),
  accounts: document.getElementById('nav-accounts'),
  settings: document.getElementById('nav-settings'),
  logout: document.getElementById('nav-logout')
};

// Forms
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const addForm = document.getElementById('add-form');
const settingsForm = document.getElementById('settings-form');

// UI Elements
const currencySelector = document.getElementById('currency-selector');
const themeToggle = document.getElementById('theme-toggle');
const transactionList = document.getElementById('transaction-list');
const accountsList = document.getElementById('accounts-list');
const accountsListFull = document.getElementById('accounts-list-full');
const budgetsList = document.getElementById('budgets-list');
const goalsList = document.getElementById('goals-list');

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  state.settings.theme = savedTheme;
  themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

themeToggle.addEventListener('click', () => {
  const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  state.settings.theme = newTheme;
  localStorage.setItem('theme', newTheme);
  themeToggle.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// Currency Management
async function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await response.json();
    return amount * data.rates[to];
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return amount;
  }
}

function formatCurrency(amount, currency = state.settings.currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

currencySelector.addEventListener('change', async (e) => {
  const newCurrency = e.target.value;
  state.settings.currency = newCurrency;
  localStorage.setItem('currency', newCurrency);
  await updateUI();
});

// Navigation
function showSection(section) {
  [authSection, dashboardSection, addSection, reportsSection, budgetsSection, goalsSection, accountsSection, settingsSection].forEach(s => {
    s.style.display = 'none';
  });
  section.style.display = 'block';

  // Highlight the active nav button
  Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
  switch (section) {
    case dashboardSection:
      navButtons.dashboard.classList.add('active'); break;
    case addSection:
      navButtons.add.classList.add('active'); break;
    case reportsSection:
      navButtons.reports.classList.add('active'); break;
    case budgetsSection:
      navButtons.budgets.classList.add('active'); break;
    case goalsSection:
      navButtons.goals.classList.add('active'); break;
    case accountsSection:
      navButtons.accounts.classList.add('active'); break;
    case settingsSection:
      navButtons.settings.classList.add('active'); break;
  }
}

navButtons.dashboard.onclick = () => showSection(dashboardSection);
navButtons.add.onclick = () => showSection(addSection);
navButtons.reports.onclick = () => showSection(reportsSection);
navButtons.budgets.onclick = () => showSection(budgetsSection);
navButtons.goals.onclick = () => showSection(goalsSection);
navButtons.accounts.onclick = () => showSection(accountsSection);
navButtons.settings.onclick = () => showSection(settingsSection);
navButtons.logout.onclick = handleLogout;

// Authentication
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      state.user = data.user;
      state.token = data.token;
      localStorage.setItem('token', data.token);
      showSection(dashboardSection);
      await updateUI();
      showMessage('success', 'Login successful!');
      updateNavVisibility();
    } else {
      showMessage('error', data.message || 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('error', 'Login failed. Please try again later.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;

  if (password !== confirmPassword) {
    showMessage('error', 'Passwords do not match');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      showMessage('success', 'Registration successful! Please login.');
      document.querySelector('.auth-tab[data-tab="login"]').click();
      document.getElementById('login-form').reset();
    } else {
      showMessage('error', data.message || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('error', 'Registration failed. Please try again later.');
  }
}

function handleLogout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('token');
  showSection(authSection);
  updateNavVisibility();
}

// Transaction Management
async function addTransaction(e) {
  e.preventDefault();
  const formData = new FormData(addForm);
  const transaction = {
    amount: parseFloat(formData.get('amount')),
    type: formData.get('type'),
    category: formData.get('category'),
    account: formData.get('account'),
    date: formData.get('date'),
    time: formData.get('time'),
    notes: formData.get('notes'),
    recurring: formData.get('recurring')
  };

  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(transaction)
    });

    if (response.ok) {
      showMessage('success', 'Transaction added successfully');
      addForm.reset();
      await updateUI();
    } else {
      const data = await response.json();
      showMessage('error', data.message);
    }
  } catch (error) {
    showMessage('error', 'Failed to add transaction');
  }
}

async function fetchTransactions() {
  try {
    const response = await fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (response.ok) {
      state.transactions = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
  }
}

function renderTransactions() {
  transactionList.innerHTML = '';
  state.transactions.slice(0, 10).forEach(transaction => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-category">${transaction.category}</span>
        <span class="transaction-date">${formatDate(transaction.date)}</span>
      </div>
      <span class="transaction-amount ${transaction.type}">
        ${formatCurrency(transaction.amount)}
      </span>
    `;
    transactionList.appendChild(li);
  });
}

// Account Management
async function fetchAccounts() {
  try {
    const response = await fetch('/api/accounts', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (response.ok) {
      state.accounts = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
  }
}

function renderAccounts() {
  accountsList.innerHTML = '';
  accountsListFull.innerHTML = '';
  
  state.accounts.forEach(account => {
    const accountCard = document.createElement('div');
    accountCard.className = 'account-card';
    accountCard.innerHTML = `
      <h4>${account.name}</h4>
      <div class="account-balance">${formatCurrency(account.balance)}</div>
      <div class="account-type">${account.type}</div>
    `;
    accountsList.appendChild(accountCard);
    accountsListFull.appendChild(accountCard.cloneNode(true));
  });
}

// Budget Management
async function fetchBudgets() {
  try {
    const response = await fetch('/api/budgets', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (response.ok) {
      state.budgets = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch budgets:', error);
  }
}

function renderBudgets() {
  budgetsList.innerHTML = '';
  state.budgets.forEach(budget => {
    const progress = (budget.spent / budget.amount) * 100;
    const budgetCard = document.createElement('div');
    budgetCard.className = 'budget-card';
    budgetCard.innerHTML = `
      <div class="budget-header">
        <h4>${budget.category}</h4>
        <span>${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
    `;
    budgetsList.appendChild(budgetCard);
  });
}

// Goals Management
async function fetchGoals() {
  try {
    const response = await fetch('/api/goals', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (response.ok) {
      state.goals = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch goals:', error);
  }
}

function renderGoals() {
  goalsList.innerHTML = '';
  state.goals.forEach(goal => {
    const progress = (goal.current / goal.target) * 100;
    const goalCard = document.createElement('div');
    goalCard.className = 'goal-card';
    goalCard.innerHTML = `
      <div class="goal-header">
        <h4>${goal.name}</h4>
        <span class="goal-amount">${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="goal-progress">${progress.toFixed(1)}% complete</div>
    `;
    goalsList.appendChild(goalCard);
  });
}

// Charts
function renderCharts() {
  renderCategoryChart();
  renderMonthChart();
  renderComparisonChart();
  renderTrendChart();
  renderAccountChart();
  renderBudgetChart();
}

function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const data = {
    labels: state.transactions.map(t => t.category),
    datasets: [{
      data: state.transactions.map(t => t.amount),
      backgroundColor: [
        '#2196F3', '#4CAF50', '#FFC107', '#F44336', '#9C27B0',
        '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63'
      ]
    }]
  };
  new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

function renderMonthChart() {
  const ctx = document.getElementById('monthChart').getContext('2d');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data = {
    labels: months,
    datasets: [{
      label: 'Income',
      data: months.map(m => calculateMonthlyTotal(m, 'income')),
      borderColor: '#4CAF50',
      fill: false
    }, {
      label: 'Expenses',
      data: months.map(m => calculateMonthlyTotal(m, 'expense')),
      borderColor: '#F44336',
      fill: false
    }]
  };
  new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderComparisonChart() {
  const ctx = document.getElementById('comparisonChart').getContext('2d');
  const data = {
    labels: ['Income', 'Expenses'],
    datasets: [{
      data: [
        calculateTotal('income'),
        calculateTotal('expense')
      ],
      backgroundColor: ['#4CAF50', '#F44336']
    }]
  };
  new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderTrendChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');
  const categories = [...new Set(state.transactions.map(t => t.category))];
  const data = {
    labels: categories,
    datasets: [{
      label: 'Spending by Category',
      data: categories.map(c => calculateCategoryTotal(c)),
      backgroundColor: '#2196F3'
    }]
  };
  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderAccountChart() {
  const ctx = document.getElementById('accountChart').getContext('2d');
  const data = {
    labels: state.accounts.map(a => a.name),
    datasets: [{
      label: 'Account Balance',
      data: state.accounts.map(a => a.balance),
      backgroundColor: '#2196F3'
    }]
  };
  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderBudgetChart() {
  const ctx = document.getElementById('budgetChart').getContext('2d');
  const data = {
    labels: state.budgets.map(b => b.category),
    datasets: [{
      label: 'Budget',
      data: state.budgets.map(b => b.amount),
      backgroundColor: '#4CAF50'
    }, {
      label: 'Actual',
      data: state.budgets.map(b => b.spent),
      backgroundColor: '#F44336'
    }]
  };
  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Utility Functions
function calculateTotal(type) {
  return state.transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateMonthlyTotal(month, type) {
  return state.transactions
    .filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === month && t.type === type;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateCategoryTotal(category) {
  return state.transactions
    .filter(t => t.category === category)
    .reduce((sum, t) => sum + t.amount, 0);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showMessage(type, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 3000);
}

// Data Export/Import
function exportData() {
  const data = {
    transactions: state.transactions,
    budgets: state.budgets,
    goals: state.goals,
    accounts: state.accounts,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'money-manager-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        // Validate data structure
        if (!data.transactions || !data.budgets || !data.goals || !data.accounts) {
          throw new Error('Invalid backup file');
        }
        // Update state
        state.transactions = data.transactions;
        state.budgets = data.budgets;
        state.goals = data.goals;
        state.accounts = data.accounts;
        state.settings = data.settings;
        // Update UI
        await updateUI();
        showMessage('success', 'Data imported successfully');
      } catch (error) {
        showMessage('error', 'Failed to import data');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Notifications
function checkBudgetAlerts() {
  if (!state.settings.notifications.budget) return;
  
  state.budgets.forEach(budget => {
    const progress = (budget.spent / budget.amount) * 100;
    if (progress >= 90) {
      showNotification(
        'Budget Alert',
        `You've used ${progress.toFixed(1)}% of your ${budget.category} budget`
      );
    }
  });
}

function showNotification(title, message) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }
}

// Settings Management
function updateSettings(e) {
  e.preventDefault();
  const formData = new FormData(settingsForm);
  state.settings = {
    currency: formData.get('currency'),
    theme: formData.get('theme'),
    dateFormat: formData.get('date-format'),
    notifications: {
      budget: formData.get('notify-budget') === 'on',
      goals: formData.get('notify-goals') === 'on',
      recurring: formData.get('notify-recurring') === 'on',
      bills: formData.get('notify-bills') === 'on'
    }
  };
  localStorage.setItem('settings', JSON.stringify(state.settings));
  showMessage('success', 'Settings updated successfully');
  updateUI();
}

// UI Update
async function updateUI() {
  if (!state.token) return;
  
  await Promise.all([
    fetchTransactions(),
    fetchAccounts(),
    fetchBudgets(),
    fetchGoals()
  ]);
  
  renderTransactions();
  renderAccounts();
  renderBudgets();
  renderGoals();
  renderCharts();
  checkBudgetAlerts();
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
addForm.addEventListener('submit', addTransaction);
settingsForm.addEventListener('submit', updateSettings);

// Auth Tabs (make sure these are styled as tabs)
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    document.getElementById(`${tab.dataset.tab}-form`).style.display = 'block';
  });
});

function updateNavVisibility() {
  const isLoggedIn = !!state.token;
  // Hide or show nav buttons and main sections
  Object.values(navButtons).forEach(btn => {
    if (btn === navButtons.logout) {
      btn.style.display = isLoggedIn ? '' : 'none';
    } else {
      btn.style.display = isLoggedIn ? '' : 'none';
    }
  });
  // Hide or show main sections
  [dashboardSection, addSection, reportsSection, budgetsSection, goalsSection, accountsSection, settingsSection].forEach(s => {
    s.style.display = isLoggedIn ? 'none' : 'none';
  });
  if (!isLoggedIn) {
    showSection(authSection);
  }
}

// Initialize
async function init() {
  initTheme();
  
  // Load saved settings
  const savedSettings = localStorage.getItem('settings');
  if (savedSettings) {
    state.settings = JSON.parse(savedSettings);
  }
  
  // Check for saved token
  const token = localStorage.getItem('token');
  if (token) {
    state.token = token;
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        state.user = await response.json();
        showSection(dashboardSection);
        await updateUI();
      } else {
        handleLogout();
      }
    } catch (error) {
      handleLogout();
    }
  } else {
    showSection(authSection);
  }
  updateNavVisibility();
}

init(); 