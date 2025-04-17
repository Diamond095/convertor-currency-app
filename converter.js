let allCurrencies = {};
let currentRates = {};
let baseCurrency = 'USD';
let conversionHistory = [];

const converterForm = document.getElementById('converter-form');
const amountInput = document.getElementById('amount');
const fromCurrencySelect = document.getElementById('from-currency');
const toCurrencySelect = document.getElementById('to-currency');
const swapButton = document.getElementById('swap-button');
const resultContainer = document.getElementById('result-container');
const amountDisplay = document.getElementById('amount-display');
const resultDisplay = document.getElementById('result-display');
const rateDisplay = document.getElementById('rate-display');
const loadingIndicator = document.getElementById('loading-indicator');
const errorAlert = document.getElementById('error-alert');
const errorMessage = document.getElementById('error-message');
const dateDisplay = document.getElementById('date');
const historyList = document.getElementById('history-list');
const noHistory = document.getElementById('no-history');
const clearHistoryButton = document.getElementById('clear-history');
const ratesTable = document.getElementById('rates-table').querySelector('tbody');
const noRates = document.getElementById('no-rates');

// Currency name mapping (common currencies)
const currencyNames = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CHF': 'Swiss Franc',
    'CNY': 'Chinese Yuan',
    'INR': 'Indian Rupee',
    'RUB': 'Russian Ruble',
    'BRL': 'Brazilian Real',
    'MXN': 'Mexican Peso',
    'SGD': 'Singapore Dollar',
    'NZD': 'New Zealand Dollar',
    'HKD': 'Hong Kong Dollar',
};

document.addEventListener('DOMContentLoaded', () => {
    updateDateDisplay();
    initializeCurrencySelectors();
    loadConversionHistory();

    converterForm.addEventListener('submit', handleFormSubmit);
    swapButton.addEventListener('click', swapCurrencies);
    fromCurrencySelect.addEventListener('change', handleBaseChange);
    clearHistoryButton.addEventListener('click', clearHistory);
    
    fetchExchangeRates('USD');
});

function updateDateDisplay() {
    const now = new Date();
    dateDisplay.value = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
}

function initializeCurrencySelectors() {
    const commonCurrencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
    

    const commonGroup = document.createElement('optgroup');
    commonGroup.label = 'Common Currencies';
    
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Other Currencies';
    
    commonCurrencyCodes.forEach(code => {
        const name = currencyNames[code] || code;
        const option = new Option(`${code} - ${name}`, code);
        commonGroup.appendChild(option.cloneNode(true));
    });
    
    fromCurrencySelect.appendChild(commonGroup.cloneNode(true));
    toCurrencySelect.appendChild(commonGroup.cloneNode(true));
    
    fromCurrencySelect.value = 'USD';
    toCurrencySelect.value = 'EUR';
}


function fetchExchangeRates(currency) {
    showLoading(true);
    hideError();
    
    fetch(`https://api.frankfurter.app/latest?from=${currency}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            baseCurrency = data.base;
            currentRates = data.rates;
            
            currentRates[baseCurrency] = 1;
            
            updateCurrencyOptions();
            updateRatesTable();
            
            if (fromCurrencySelect.value && toCurrencySelect.value && amountInput.value) {
                performConversion();
            }
            
            showLoading(false);
        })
        .catch(error => {
            console.error('Error fetching exchange rates:', error);
            showError('Failed to fetch exchange rates. Please try again later.');
            showLoading(false);
        });
}

function updateCurrencyOptions() {
    const fromValue = fromCurrencySelect.value;
    const toValue = toCurrencySelect.value;
    
    while (fromCurrencySelect.options.length > 1) {
        fromCurrencySelect.remove(1);
    }
    
    while (toCurrencySelect.options.length > 1) {
        toCurrencySelect.remove(1);
    }
    
    const commonCurrencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
    
    const commonFromGroup = document.createElement('optgroup');
    commonFromGroup.label = 'Common Currencies';
    
    const otherFromGroup = document.createElement('optgroup');
    otherFromGroup.label = 'Other Currencies';
    
    const commonToGroup = commonFromGroup.cloneNode(true);
    const otherToGroup = otherFromGroup.cloneNode(true);
    
    Object.keys(currentRates).forEach(code => {
        const name = currencyNames[code] || code;
        const option = new Option(`${code} - ${name}`, code);
        
        if (commonCurrencyCodes.includes(code)) {
            commonFromGroup.appendChild(option.cloneNode(true));
            commonToGroup.appendChild(option.cloneNode(true));
        } else {
            otherFromGroup.appendChild(option.cloneNode(true));
            otherToGroup.appendChild(option.cloneNode(true));
        }
    });
    
    fromCurrencySelect.appendChild(commonFromGroup);
    fromCurrencySelect.appendChild(otherFromGroup);
    
    toCurrencySelect.appendChild(commonToGroup);
    toCurrencySelect.appendChild(otherToGroup);

    if (fromValue && Object.keys(currentRates).includes(fromValue)) {
        fromCurrencySelect.value = fromValue;
    } else {
        fromCurrencySelect.value = baseCurrency;
    }
    
    if (toValue && Object.keys(currentRates).includes(toValue)) {
        toCurrencySelect.value = toValue;
    } else {
        const defaultTarget = baseCurrency === 'USD' ? 'EUR' : 'USD';
        toCurrencySelect.value = Object.keys(currentRates).includes(defaultTarget) ? defaultTarget : Object.keys(currentRates)[0];
    }
}

function updateRatesTable() {
    while (ratesTable.firstChild) {
        ratesTable.removeChild(ratesTable.firstChild);
    }
    if (Object.keys(currentRates).length > 0) {
        noRates.classList.add('d-none');
    } else {
        noRates.classList.remove('d-none');
        return;
    }
    
    // Sort currency codes alphabetically
    const sortedCodes = Object.keys(currentRates).sort();
    
    sortedCodes.forEach(code => {
        const row = document.createElement('tr');
        const rate = currentRates[code];
        const currencyName = currencyNames[code] || code;
        
        row.innerHTML = `
            <td>${currencyName}</td>
            <td>${code}</td>
            <td>${rate.toFixed(6)}</td>
        `;
        
        ratesTable.appendChild(row);
    });
}

function handleFormSubmit(event) {
    event.preventDefault();
    performConversion();
}
function performConversion() {
    const amount = parseFloat(amountInput.value);
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    
    if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid positive amount");
        return;
    }
    
    if (!fromCurrency || !toCurrency) {
        showError("Please select both currencies");
        return;
    }
    if (fromCurrency !== baseCurrency) {
        fetchExchangeRates(fromCurrency);
        return;
    }
    
    const rate = currentRates[toCurrency];
    if (!rate) {
        showError(`Exchange rate not available for ${toCurrency}`);
        return;
    }
    
    const convertedAmount = amount * rate;
    
    amountDisplay.textContent = `${amount.toLocaleString()} ${fromCurrency}`;
    resultDisplay.textContent = `${convertedAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} ${toCurrency}`;
    
    rateDisplay.textContent = `1 ${fromCurrency} = ${rate.toFixed(6)} ${toCurrency}`;
    resultContainer.classList.remove('d-none');

    addToHistory({
        date: new Date(),
        from: fromCurrency,
        to: toCurrency,
        amount: amount,
        result: convertedAmount,
        rate: rate
    });
}
function addToHistory(conversion) {
    conversionHistory.unshift(conversion);
    if (conversionHistory.length > 10) {
        conversionHistory.pop();
    }
    saveConversionHistory();
    updateHistoryDisplay();
}

function saveConversionHistory() {
    localStorage.setItem('conversionHistory', JSON.stringify(conversionHistory));
}

function loadConversionHistory() {
    const saved = localStorage.getItem('conversionHistory');
    if (saved) {
        try {
            conversionHistory = JSON.parse(saved);
            conversionHistory.forEach(item => {
                item.date = new Date(item.date);
            });
            updateHistoryDisplay();
        } catch (e) {
            console.error('Error loading conversion history:', e);
            conversionHistory = [];
        }
    }
}
function updateHistoryDisplay() {
    const items = historyList.querySelectorAll('li:not(#no-history)');
    items.forEach(item => item.remove());
    if (conversionHistory.length === 0) {
        noHistory.classList.remove('d-none');
        return;
    } else {
        noHistory.classList.add('d-none');
    }
    
    conversionHistory.forEach((conversion, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item history-item';
        listItem.dataset.index = index;
    
        const dateFormatted = conversion.date.toLocaleDateString() + ' ' + 
                             conversion.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <small class="text-muted">${dateFormatted}</small>
                    <div>
                        <span>${conversion.amount.toLocaleString()} ${conversion.from}</span>
                        <i class="fas fa-arrow-right mx-2"></i>
                        <span>${conversion.result.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })} ${conversion.to}</span>
                    </div>
                    <small>Rate: 1 ${conversion.from} = ${conversion.rate.toFixed(6)} ${conversion.to}</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary repeat-conversion" data-index="${index}">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        `;
        listItem.querySelector('.repeat-conversion').addEventListener('click', (e) => {
            e.stopPropagation();
            repeatConversion(index);
        });
        
        historyList.appendChild(listItem);
    });
}

function repeatConversion(index) {
    const conversion = conversionHistory[index];
    
    amountInput.value = conversion.amount;

    if (conversion.from !== baseCurrency) {
        fromCurrencySelect.value = conversion.from;
        toCurrencySelect.value = conversion.to;
        fetchExchangeRates(conversion.from);
    } else {
        fromCurrencySelect.value = conversion.from;
        toCurrencySelect.value = conversion.to;
        performConversion();
    }
    
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function clearHistory() {
    conversionHistory = [];
    saveConversionHistory();
    updateHistoryDisplay();
}

function swapCurrencies() {
    const fromValue = fromCurrencySelect.value;
    const toValue = toCurrencySelect.value;
    
    if (!fromValue || !toValue) return;
    
    fromCurrencySelect.value = toValue;
    toCurrencySelect.value = fromValue;
    if (toValue !== baseCurrency) {
        fetchExchangeRates(toValue);
    } else {
        performConversion();
    }
}
function handleBaseChange() {
    const newBase = fromCurrencySelect.value;
    
    if (newBase && newBase !== baseCurrency) {
        fetchExchangeRates(newBase);
    }
}

function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('d-none');
    } else {
        loadingIndicator.classList.add('d-none');
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('d-none');
    setTimeout(hideError, 5000);
}

function hideError() {
    errorAlert.classList.add('d-none');
}