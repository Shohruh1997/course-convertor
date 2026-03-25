/**
 * Инициализация, слушатели событий (DOM)
 */

import { fetchRates } from './api.js';
import { toUSD, fromUSD } from './converter.js';

// Список поддерживаемых валют (с флагами)
const SUPPORTED_CURRENCIES = {
    RUB: { flag: '🇷🇺', name: 'RUB' },
    UZS: { flag: '🇺🇿', name: 'UZS' },
    KZT: { flag: '🇰🇿', name: 'KZT' },
    USD: { flag: '🇺🇸', name: 'USD' },
    EUR: { flag: '🇪🇺', name: 'EUR' },
    GBP: { flag: '🇬🇧', name: 'GBP' },
    TRY: { flag: '🇹🇷', name: 'TRY' },
    CNY: { flag: '🇨🇳', name: 'CNY' },
    JPY: { flag: '🇯🇵', name: 'JPY' },
    AED: { flag: '🇦🇪', name: 'AED' }
};

// Проверяем сохраненные настройки валют (используем localStorage)
const savedCurrencies = localStorage.getItem('activeCurrencies');
let initialCurrencies = ['RUB', 'UZS', 'KZT']; // По умолчанию

if (savedCurrencies) {
    try {
        const parsed = JSON.parse(savedCurrencies);
        // Защита: если массив не пустой, используем его
        if (Array.isArray(parsed) && parsed.length > 0) {
            initialCurrencies = parsed;
        }
    } catch (e) {
        console.error('Ошибка чтения сохраненных валют', e);
    }
}

// Внутреннее состояние
let state = {
    baseUsdAmount: 0,
    lastActiveCurrency: initialCurrencies[0], // Якорь на первую активную валюту
    rates: {},
    activeCurrencies: initialCurrencies
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    initApp();
});

async function initApp() {
    const datePicker = document.getElementById('date-picker');
    
    // 1. Настройка поля выбора даты (сегодня по умолчанию)
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.max = today; // Нельзя выбрать дату в будущем
    
    // 2. Слушатель на смену даты
    datePicker.addEventListener('change', async (e) => {
        const selectedDate = e.target.value;
        await loadRates(selectedDate === today ? 'latest' : selectedDate);
    });

    // 3. Инициализация UI: модалка настроек и рендер инпутов
    initThemeToggle();
    initSettingsModal();
    renderCurrencyInputs();

    // 4. Загрузка актуальных курсов при старте
    await loadRates('latest');
}

/**
 * Инициализация переключения тем (Светлая/Темная)
 */
function initThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('.theme-icon');
    
    // Проверяем сохраненную тему или системную
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme = 'dark';
        
        // По умолчанию смотрим на системную тему, если data-theme не задан
        if (!currentTheme) {
            newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
        } else if (currentTheme === 'dark') {
            newTheme = 'light';
        }

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

/**
 * Инициализация модального окна
 */
function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const checkboxesContainer = document.getElementById('currency-checkboxes');

    // Рендер чекбоксов
    Object.keys(SUPPORTED_CURRENCIES).forEach(code => {
        const currency = SUPPORTED_CURRENCIES[code];
        const isChecked = state.activeCurrencies.includes(code);
        
        const label = document.createElement('label');
        label.className = 'currency-checkbox-item';
        label.innerHTML = `
            <input type="checkbox" value="${code}" ${isChecked ? 'checked' : ''}>
            <span class="currency-flag">${currency.flag}</span>
            <span>${currency.name}</span>
        `;
        checkboxesContainer.appendChild(label);
    });

    // Открытие модалки
    openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    // Закрытие модалки
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Закрытие по клику вне контента
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Делегирование событий чекбоксов
    checkboxesContainer.addEventListener('change', (e) => {
        if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'checkbox') {
            const currencyCode = e.target.value;
            if (e.target.checked) {
                if (!state.activeCurrencies.includes(currencyCode)) {
                    state.activeCurrencies.push(currencyCode);
                }
            } else {
                state.activeCurrencies = state.activeCurrencies.filter(c => c !== currencyCode);
            }
            
            // Сохраняем настройки в локальное хранилище браузера
            localStorage.setItem('activeCurrencies', JSON.stringify(state.activeCurrencies));
            
            renderCurrencyInputs();
            // Сразу пересчитываем новые поля (т.к. мы уже могли иметь базовую сумму)
            updateAllInputsExcept(null); 
        }
    });
}

/**
 * Форматирует число в строку с пробелами-разделителями (напр., 742 270,63)
 */
function formatNumber(num) {
    if (isNaN(num)) return '';
    
    // Получаем строку через Intl (разделяет копейки запятой)
    let formatted = new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
    }).format(num);

    // Заменяем все виды скрытых пробелов (неразрывные и т.д.) на обычный пробел,
    // чтобы шрифты отображали его корректно и заметно
    return formatted.replace(/\s|\u00A0|\u202F/g, ' ');
}

/**
 * Парсит строку (даже с пробелами и запятыми) обратно в число
 */
function parseFormattedNumber(str) {
    if (!str) return NaN;
    // Удаляем все виды пробелов (включая неразрывные) и меняем запятую на точку
    const normalized = str.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
    return parseFloat(normalized);
}

/**
 * Рендер активных полей ввода на главный экран
 */
function renderCurrencyInputs() {
    const listContainer = document.getElementById('currency-list');
    
    // Сохраняем текущие значения инпутов перед перерисовкой,
    // чтобы не потерять введенный текст, если пользователь просто добавил новую валюту
    const currentValues = {};
    const existingInputs = document.querySelectorAll('.currency-input');
    existingInputs.forEach(input => {
        const currency = input.closest('.currency-row').dataset.currency;
        currentValues[currency] = input.value;
    });

    listContainer.innerHTML = ''; // Очищаем

    state.activeCurrencies.forEach(code => {
        const currency = SUPPORTED_CURRENCIES[code] || { flag: '🏳️', name: code };
        
        const row = document.createElement('div');
        row.className = 'currency-row';
        row.dataset.currency = code;
        
        const val = currentValues[code] !== undefined ? currentValues[code] : '';

        row.innerHTML = `
            <div class="currency-label">
                <span class="currency-flag">${currency.flag}</span>
                <span class="currency-code">${currency.name}</span>
            </div>
            <input type="text" inputmode="decimal" class="currency-input" placeholder="0" id="input-${code}" value="${val}">
            <button class="move-top-btn" title="Переместить наверх" aria-label="Переместить наверх">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            </button>
        `;
        listContainer.appendChild(row);
    });

    // Заново навешиваем слушатели на новые инпуты и кнопки
    const newInputs = document.querySelectorAll('.currency-input');
    newInputs.forEach(input => {
        input.addEventListener('input', handleInputChange);
        input.addEventListener('focus', (e) => {
            const rowElement = e.target.closest('.currency-row');
            const currencyCode = rowElement.dataset.currency;
            state.lastActiveCurrency = currencyCode;
            // Убрали автоматическое перемещение отсюда
        });
        input.addEventListener('blur', (e) => {
            // При потере фокуса форматируем введенное значение красиво
            const val = parseFormattedNumber(e.target.value);
            if (!isNaN(val)) {
                e.target.value = formatNumber(val);
            }
        });
    });

    // Слушатели для кнопок перемещения наверх
    const moveBtns = document.querySelectorAll('.move-top-btn');
    moveBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rowElement = e.target.closest('.currency-row');
            const currencyCode = rowElement.dataset.currency;
            
            const listContainer = document.getElementById('currency-list');
            if (listContainer.firstElementChild !== rowElement) {
                listContainer.prepend(rowElement);
                
                // Обновляем порядок в состоянии
                state.activeCurrencies = state.activeCurrencies.filter(c => c !== currencyCode);
                state.activeCurrencies.unshift(currencyCode);
                
                // Сохраняем новый порядок в localStorage
                localStorage.setItem('activeCurrencies', JSON.stringify(state.activeCurrencies));
                
                // Фокусируемся на инпуте после перемещения (по желанию)
                rowElement.querySelector('.currency-input').focus();
            }
        });
    });
}

/**
 * Загрузка курсов и пересчет полей на основе сохраненного состояния
 */
async function loadRates(dateQuery) {
    const inputs = document.querySelectorAll('.currency-input');
    
    // Блокируем поля на время загрузки
    inputs.forEach(input => input.disabled = true);
    
    const newRates = await fetchRates(dateQuery);
    
    inputs.forEach(input => input.disabled = false);

    if (newRates) {
        state.rates = newRates;
        recalculateFromLastActive();
    } else {
        alert('Не удалось загрузить курсы валют. Пожалуйста, проверьте подключение к интернету.');
    }
}

/**
 * Пересчитываем все поля отталкиваясь от последней валюты, которую менял пользователь.
 * Это необходимо для корректного обновления цифр при смене даты!
 */
function recalculateFromLastActive() {
    if (!state.rates[state.lastActiveCurrency]) return;
    
    const activeInput = document.querySelector(`.currency-row[data-currency="${state.lastActiveCurrency}"] .currency-input`);
    if (!activeInput) return;

    const inputValue = parseFormattedNumber(activeInput.value);

    // Если поле пустое, не пересчитываем
    if (isNaN(inputValue)) {
        return;
    }

    // Пересчитываем базовую сумму в USD по НОВОМУ курсу
    const rateToUsd = state.rates[state.lastActiveCurrency];
    state.baseUsdAmount = toUSD(inputValue, rateToUsd);

    // Обновляем остальные поля
    updateAllInputsExcept(state.lastActiveCurrency);
}

function handleInputChange(event) {
    const inputElement = event.target;
    const inputValue = parseFormattedNumber(inputElement.value);

    // Получаем код валюты текущего поля
    const currencyCode = inputElement.closest('.currency-row').dataset.currency;
    state.lastActiveCurrency = currencyCode; // Обновляем стейт активной валюты

    if (isNaN(inputValue)) {
        // Если поле очищено (NaN), обнуляем стейт и очищаем остальные поля
        state.baseUsdAmount = 0;
        updateAllInputsExcept(currencyCode);
        return;
    }

    // 1. Конвертируем введенное значение в базовую валюту (USD)
    const rateToUsd = state.rates[currencyCode];
    state.baseUsdAmount = toUSD(inputValue, rateToUsd);

    // 2. Пересчитываем и обновляем остальные поля
    updateAllInputsExcept(currencyCode);
}

function updateAllInputsExcept(excludeCurrency) {
    const inputs = document.querySelectorAll('.currency-input');

    inputs.forEach(input => {
        const currencyCode = input.closest('.currency-row').dataset.currency;
        
        // Пропускаем инпут, который мы сейчас не должны трогать
        if (currencyCode === excludeCurrency) return;

        // Если базовой суммы нет (поля пустые), очищаем значение
        if (state.baseUsdAmount === 0) {
            input.value = '';
            return;
        }

        // Вычисляем значение для текущей валюты
        const rateFromUsd = state.rates[currencyCode];
        if (!rateFromUsd) return; // Защита, если такой валюты нет в API

        let newValue = fromUSD(state.baseUsdAmount, rateFromUsd);
        
        // Форматируем красивое число (742 270,63)
        input.value = formatNumber(newValue);
    });
}


