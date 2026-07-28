const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Mock exchange rates (in production, use a real API like ExchangeRate-API, Fixer, etc.)
const exchangeRates = {
  USD: { USD: 1.0, EUR: 0.85, GBP: 0.73, CAD: 1.25, AUD: 1.35, JPY: 110.0, CHF: 0.92, CNY: 6.45, INR: 74.5 },
  EUR: { USD: 1.18, EUR: 1.0, GBP: 0.86, CAD: 1.47, AUD: 1.59, JPY: 129.5, CHF: 1.08, CNY: 7.58, INR: 87.8 },
  GBP: { USD: 1.37, EUR: 1.16, GBP: 1.0, CAD: 1.71, AUD: 1.85, JPY: 150.5, CHF: 1.26, CNY: 8.82, INR: 102.2 },
  CAD: { USD: 0.80, EUR: 0.68, GBP: 0.58, CAD: 1.0, AUD: 1.08, JPY: 88.0, CHF: 0.74, CNY: 5.16, INR: 59.6 },
  AUD: { USD: 0.74, EUR: 0.63, GBP: 0.54, AUD: 1.0, JPY: 81.5, CHF: 0.68, CNY: 4.78, INR: 55.2 },
  JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, JPY: 1.0, CHF: 0.0083, CNY: 0.0586, INR: 0.677 },
  CHF: { USD: 1.09, EUR: 0.93, GBP: 0.79, CAD: 1.35, AUD: 1.46, JPY: 120.0, CHF: 1.0, CNY: 7.02, INR: 81.3 },
  CNY: { USD: 0.155, EUR: 0.132, GBP: 0.113, CAD: 0.194, AUD: 0.209, JPY: 17.05, CHF: 0.142, CNY: 1.0, INR: 11.58 },
  INR: { USD: 0.0134, EUR: 0.0114, GBP: 0.0098, CAD: 0.0168, AUD: 0.0181, JPY: 1.476, CHF: 0.0123, CNY: 0.0863, INR: 1.0 }
};

// Get exchange rate
router.get('/rate', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Both from and to currencies are required'
      });
    }

    if (!exchangeRates[from] || !exchangeRates[from][to]) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency conversion'
      });
    }

    const rate = exchangeRates[from][to];

    res.json({
      success: true,
      data: {
        from,
        to,
        rate,
        inverseRate: 1 / rate
      }
    });

  } catch (error) {
    console.error('Exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange rate'
    });
  }
});

// Convert amount between currencies
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Amount, from currency, and to currency are required'
      });
    }

    if (!exchangeRates[from] || !exchangeRates[from][to]) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported currency conversion'
      });
    }

    const rate = exchangeRates[from][to];
    const convertedAmount = parseFloat(amount) * rate;

    res.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        convertedAmount: convertedAmount.toFixed(2),
        from,
        to,
        rate,
        formatted: `${amount} ${from} = ${convertedAmount.toFixed(2)} ${to}`
      }
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting currency'
    });
  }
});

// Get supported currencies
router.get('/currencies', authenticate, async (req, res) => {
  try {
    const currencies = Object.keys(exchangeRates).map(code => ({
      code,
      name: getCurrencyName(code)
    }));

    res.json({
      success: true,
      data: { currencies }
    });

  } catch (error) {
    console.error('Currencies list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching currencies'
    });
  }
});

function getCurrencyName(code) {
  const names = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    JPY: 'Japanese Yen',
    CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee'
  };
  return names[code] || code;
}

module.exports = router;
