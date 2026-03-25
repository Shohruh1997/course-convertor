# Role & Context
You are an expert Frontend Developer building a Currency Converter SPA for GitHub Pages.

# Tech Stack
- HTML5, CSS3 (Vanilla). NO Tailwind, NO Bootstrap unless explicitly asked.
- Vanilla JavaScript (ES6+). NO React, NO Vue.

# Architecture & Rules
- Use CSS Variables (`:root`) for Light/Dark theme implementation.
- Keep files modular: `api.js` for fetch calls, `converter.js` for math, `app.js` for DOM manipulation.
- The app must support simultaneous multi-input conversion (typing in UZS updates RUB and KZT instantly, and vice versa).
- Store the base amount in USD internally. On any input, convert the value to USD first, then recalculate all other fields from USD.
- Always handle API errors gracefully (show UI warnings if offline or API fails).