/**
 * Математика: пересчет всех инпутов одновременно
 * Базовая сумма хранится в USD под капотом.
 */

/**
 * Переводит сумму из любой валюты в USD
 * @param {number} amount - сумма в исходной валюте
 * @param {number} rateToUsd - курс исходной валюты к USD (сколько исходной валюты в 1 USD)
 * @returns {number} сумма в USD
 */
export function toUSD(amount, rateToUsd) {
    if (!amount || !rateToUsd) return 0;
    return amount / rateToUsd;
}

/**
 * Переводит сумму из USD в целевую валюту
 * @param {number} amountInUsd - сумма в USD
 * @param {number} rateFromUsd - курс целевой валюты к USD (сколько целевой валюты в 1 USD)
 * @returns {number} сумма в целевой валюте
 */
export function fromUSD(amountInUsd, rateFromUsd) {
    if (!amountInUsd || !rateFromUsd) return 0;
    return amountInUsd * rateFromUsd;
}

/**
 * Полный цикл конвертации: Валюта А -> USD -> Валюта Б
 * @param {number} amount - сумма в исходной валюте
 * @param {number} fromRate - курс исходной валюты к USD
 * @param {number} toRate - курс целевой валюты к USD
 * @returns {number} сумма в целевой валюте
 */
export function convert(amount, fromRate, toRate) {
    const amountInUsd = toUSD(amount, fromRate);
    return fromUSD(amountInUsd, toRate);
}
