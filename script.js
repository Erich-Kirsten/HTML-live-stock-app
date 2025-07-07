 // EquiZen Trading Platform - Complete JavaScript

// Configuration
const CONFIG = {
    // API_KEY: '3b654249e04247ceb9a5af6213d3d802',
    BASE_URL: 'https://api.twelvedata.com/',
    STOCK_SYMBOLS: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'],
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    STOCK_COLORS: {
        'AAPL': '#007AFF',
        'GOOGL': '#34A853',
        'MSFT': '#00BCF2',
        'AMZN': '#FF9900',
        'TSLA': '#E31837',
        'META': '#1877F2',
        'NVDA': '#76B900',
        'NFLX': '#E50914'
    }
};

// Global variables
let currentUser = null;
let apiConnected = false;
let marketChart = null;
let portfolioChart = null;
let refreshInterval = null;

// DOM elements
const elements = {
    apiStatus: null,
    authButtons: null,
    userSection: null,
    userName: null,
    logoutBtn: null,
    marketData: null,
    totalMarketCap: null,
    activeStocks: null,
    lastUpdate: null,
    loginForm: null,
    signupForm: null,
    portfolioChart: null,
    tradingChart: null,
    topMovers: null
};

// Initialize DOM elements
function initializeElements() {
    Object.keys(elements).forEach(key => {
        elements[key] = document.getElementById(key);
    });
}

// Utility Functions
function getStockColor(symbol) {
    return CONFIG.STOCK_COLORS[symbol] || '#6c757d';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// API Functions
async function loadMarketData() {
    try {
        updateApiStatus('Loading...', 'connecting');
        
        const response = await fetch(`${CONFIG.BASE_URL}eod?access_key=${CONFIG.API_KEY}&symbols=${CONFIG.STOCK_SYMBOLS.join(',')}&limit=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'API Error');
        }
        
        displayMarketData(data.data);
        updateApiStatus('Connected', 'connected');
        updateLastUpdate();
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        displayError(error.message);
        updateApiStatus('Error', 'api-error');
    }
}

// UI Update Functions
function updateApiStatus(status, className) {
    if (elements.apiStatus) {
        elements.apiStatus.textContent = status;
        elements.apiStatus.className = `api-status me-3 ${className}`;
    }
}

function updateLastUpdate() {
    if (elements.lastUpdate) {
        const now = new Date();
        elements.lastUpdate.textContent = now.toLocaleTimeString();
    }
}

function displayMarketData(stocks) {
    if (!elements.marketData) return;
    
    if (!stocks || stocks.length === 0) {
        elements.marketData.innerHTML = '<div class="text-center text-muted">No market data available</div>';
        return;
    }

    let html = '<div class="row">';
    
    stocks.slice(0, 6).forEach(stock => {
        const change = stock.close - stock.open;
        const changePercent = ((change / stock.open) * 100).toFixed(2);
        const isPositive = change >= 0;
        
        html += `
            <div class="col-md-4 mb-3">
                <div class="stock-item">
                    <div class="d-flex align-items-center">
                        <div class="stock-icon" style="background: ${getStockColor(stock.symbol)}">
                            ${stock.symbol.substring(0, 2)}
                        </div>
                        <div>
                            <div class="stock-name">${stock.symbol}</div>
                            <div class="stock-symbol">${stock.date}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">${formatCurrency(stock.close)}</div>
                        <div class="${isPositive ? 'price-positive' : 'price-negative'}">
                            ${isPositive ? '+' : ''}${changePercent}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    elements.marketData.innerHTML = html;
    
    updateStats(stocks);
    updateCharts(stocks);
}

function displayError(message) {
    if (elements.marketData) {
        elements.marketData.innerHTML = `
            <div class="text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <div>Failed to load market data</div>
                <small>${message}</small>
                <div class="mt-3">
                    <button class="btn btn-primary btn-sm" onclick="loadMarketData()">
                        <i class="fas fa-sync-alt me-2"></i>Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

function updateStats(stocks) {
    const totalValue = stocks.reduce((sum, stock) => sum + stock.close, 0);
    
    if (elements.totalMarketCap) {
        elements.totalMarketCap.textContent = formatCurrency(totalValue * 1000000000);
    }
    
    if (elements.activeStocks) {
        elements.activeStocks.textContent = stocks.length;
    }
    
    // Update dynamic stats
    const statUsers = document.getElementById('statUsers');
    const statVolume = document.getElementById('statVolume');
    const statStocks = document.getElementById('statStocks');
    
    if (statUsers) statUsers.textContent = `${(2.1 + Math.random() * 0.5).toFixed(1)}M+`;
    if (statVolume) statVolume.textContent = `$${(15 + Math.random() * 5).toFixed(0)}B`;
    if (statStocks) statStocks.textContent = `${Math.floor(500 + Math.random() * 100)}+`;
}

function updateCharts(stocks) {
    updatePortfolioChart(stocks);
    updateTradingChart(stocks);
    updateTopMovers(stocks);
}

function updatePortfolioChart(stocks) {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;
    
    if (portfolioChart) {
        portfolioChart.destroy();
    }
    
    portfolioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: stocks.slice(0, 5).map(s => s.symbol),
            datasets: [{
                data: stocks.slice(0, 5).map(s => s.close),
                backgroundColor: stocks.slice(0, 5).map(s => getStockColor(s.symbol)),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        color: '#b7bdc6'
                    }
                }
            }
        }
    });
}

function updateTradingChart(stocks) {
    const ctx = document.getElementById('tradingChart');
    if (!ctx) return;
    
    if (marketChart) {
        marketChart.destroy();
    }
    
    marketChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stocks.map(s => s.symbol),
            datasets: [{
                label: 'Stock Prices',
                data: stocks.map(s => s.close),
                borderColor: '#02c076',
                backgroundColor: 'rgba(2, 192, 118, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#888'
                    }
                },
                y: {
                    grid: {
                        color: '#333'
                    },
                    ticks: {
                        color: '#888',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateTopMovers(stocks) {
    if (!elements.topMovers) return;
    
    const sortedStocks = [...stocks].sort((a, b) => {
        const changeA = ((a.close - a.open) / a.open) * 100;
        const changeB = ((b.close - b.open) / b.open) * 100;
        return Math.abs(changeB) - Math.abs(changeA);
    });

    let html = '';
    sortedStocks.slice(0, 3).forEach(stock => {
        const change = ((stock.close - stock.open) / stock.open) * 100;
        const isPositive = change >= 0;
        
        html += `
            <div class="d-flex justify-content-between mb-2">
                <span>${stock.symbol}</span>
                <span class="${isPositive ? 'text-success' : 'text-danger'}">
                    ${isPositive ? '+' : ''}${change.toFixed(2)}%
                </span>
            </div>
        `;
    });

    elements.topMovers.innerHTML = html;
}

// Authentication Functions
function initializeAuth() {
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (elements.signupForm) {
        elements.signupForm.addEventListener('submit', handleSignup);
    }
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    updateAuthUI();
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (email && password) {
        currentUser = {
            email: email,
            name: email.split('@')[0]
        };
        
        updateAuthUI();
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();
        showToast('Welcome back! Successfully logged in.', 'success');
    }
}

function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName')?.value;
    const email = document.getElementById('signupEmail')?.value;
    const password = document.getElementById('signupPassword')?.value;
    
    if (name && email && password) {
        currentUser = {
            email: email,
            name: name
        };
        
        updateAuthUI();
        const signupModal = bootstrap.Modal.getInstance(document.getElementById('signupModal'));
        if (signupModal) signupModal.hide();
        showToast('Account created successfully! Welcome aboard.', 'success');
    }
}

function handleLogout() {
    currentUser = null;
    updateAuthUI();
    showToast('You have been logged out successfully.', 'info');
}

function updateAuthUI() {
    if (currentUser) {
        elements.authButtons?.classList.add('d-none');
        elements.userSection?.classList.remove('d-none');
        if (elements.userName) {
            elements.userName.textContent = `Hello, ${currentUser.name}!`;
        }
    } else {
        elements.authButtons?.classList.remove('d-none');
        elements.userSection?.classList.add('d-none');
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fas fa-${getToastIcon(type)} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        info: 'info-circle',
        warning: 'exclamation-triangle',
        danger: 'exclamation-circle'
    };
    return icons[type] || 'info-circle';
}

// Form validation
function initializeFormValidation() {
    document.querySelectorAll('input[type="email"]').forEach(input => {
        input.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                this.setCustomValidity('Please enter a valid email address');
            } else {
                this.setCustomValidity('');
            }
        });
    });

    document.querySelectorAll('input[type="password"]').forEach(input => {
        input.addEventListener('input', function() {
            if (this.value && this.value.length < 6) {
                this.setCustomValidity('Password must be at least 6 characters long');
            } else {
                this.setCustomValidity('');
            }
        });
    });
}

// Modal event handlers
function initializeModals() {
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    if (loginModal) {
        loginModal.addEventListener('hidden.bs.modal', function() {
            const form = document.getElementById('loginForm');
            if (form) form.reset();
        });
    }
    
    if (signupModal) {
        signupModal.addEventListener('hidden.bs.modal', function() {
            const form = document.getElementById('signupForm');
            if (form) form.reset();
        });
    }
}

// Animation and interaction effects
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-on-scroll');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.hero-title, .hero-subtitle, .trading-dashboard, .feature-card, .stat-card').forEach(el => {
        observer.observe(el);
    });
}

// CTA button handler
function handleCreateAccount() {
    const button = document.querySelector('.cta-button');
    if (button) {
        button.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            button.style.transform = '';
            const signupModal = new bootstrap.Modal(document.getElementById('signupModal'));
            signupModal.show();
        }, 150);
    }
}

// Background animation effects
function initializeBackgroundEffects() {
    // Mouse parallax effect
    const debouncedMouseMove = debounce((e) => {
        const container = document.querySelector('.containers');
        if (container) {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const moveX = (x - rect.width / 2) * 0.01;
            const moveY = (y - rect.height / 2) * 0.01;
            
            container.style.transform = `translateX(${moveX}px) translateY(${moveY}px)`;
        }
    }, 16);
    
    document.addEventListener('mousemove', debouncedMouseMove);
    
    document.addEventListener('mouseleave', () => {
        const container = document.querySelector('.containers');
        if (container) {
            container.style.transform = '';
        }
    });
    
    // Animate background shapes
    function animateShapes() {
        const shapes = document.querySelectorAll('.shape');
        shapes.forEach(shape => {
            const randomX = Math.random() * 20 - 10;
            const randomY = Math.random() * 20 - 10;
            shape.style.transform = `translate(${randomX}px, ${randomY}px)`;
        });
    }
    
    setInterval(animateShapes, 3000);
}

// Auto-refresh functionality
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        if (apiConnected) {
            loadMarketData();
        }
    }, CONFIG.REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showToast('An unexpected error occurred. Please refresh the page.', 'danger');
});

// Page visibility API for pausing/resuming updates
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        loadMarketData(); // Refresh data when page becomes visible
    }
});

// Main initialization function
function initializeApp() {
    initializeElements();
    initializeAuth();
    initializeFormValidation();
    initializeModals();
    initializeAnimations();
    initializeBackgroundEffects();
    
    // Load initial data
    loadMarketData();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Set up API status simulation
    setTimeout(() => {
        apiConnected = true;
        updateApiStatus('Connected', 'connected');
    }, 2000);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global function exports for HTML onclick handlers
window.loadMarketData = loadMarketData;
window.handleCreateAccount = handleCreateAccount;