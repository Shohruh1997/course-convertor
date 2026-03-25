/**
 * Логика запросов к API (курсы валют и даты)
 */

export async function fetchRates(date = 'latest') {
    // Если запрашиваем актуальные курсы, используем open.er-api.com (он ближе всего к Google Finance)
    if (date === 'latest') {
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (response.ok) {
                const data = await response.json();
                if (data && data.rates) {
                    return data.rates;
                }
            }
        } catch (e) {
            console.warn('open.er-api.com failed, falling back to @fawazahmed0...', e);
        }
    }

    // Для исторических дат (или если open.er-api упал) используем @fawazahmed0
    const primaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`;
    const fallbackUrl = `https://${date === 'latest' ? 'latest' : date}.currency-api.pages.dev/v1/currencies/usd.json`;

    try {
        let response = await fetch(primaryUrl);
        
        if (!response.ok) {
            response = await fetch(fallbackUrl);
        }

        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        const rates = { USD: 1 };
        if (data && data.usd) {
            for (const [currency, rate] of Object.entries(data.usd)) {
                rates[currency.toUpperCase()] = rate;
            }
        }
        
        return rates;
    } catch (error) {
        console.error('Ошибка при получении курсов валют:', error);
        return null;
    }
}
