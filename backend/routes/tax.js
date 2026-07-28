const express = require('express');
const router = express.Router();
const TaxRule = require('../models/TaxRule');
const { authenticate } = require('../middleware/auth');

// Get tax rate for location
router.get('/rate', authenticate, async (req, res) => {
  try {
    const { country, state } = req.query;

    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country is required'
      });
    }

    // Try to find state-specific rule first, then country-wide rule
    let taxRule = await TaxRule.findOne({ country, state, isActive: true });

    if (!taxRule) {
      taxRule = await TaxRule.findOne({ country, state: null, isActive: true });
    }

    if (!taxRule) {
      // Return default tax rate if no specific rule found
      return res.json({
        success: true,
        data: {
          taxRate: 0,
          taxName: 'No tax rule found',
          country,
          state
        }
      });
    }

    res.json({
      success: true,
      data: {
        taxRate: taxRule.taxRate,
        taxName: taxRule.taxName,
        country: taxRule.country,
        state: taxRule.state
      }
    });

  } catch (error) {
    console.error('Tax rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating tax rate'
    });
  }
});

// Calculate tax amount
router.post('/calculate', authenticate, async (req, res) => {
  try {
    const { amount, country, state, discount = 0 } = req.body;

    if (!amount || !country) {
      return res.status(400).json({
        success: false,
        message: 'Amount and country are required'
      });
    }

    // Get tax rate
    const taxResponse = await fetch(`${req.protocol}://${req.get('host')}/api/tax/rate?country=${country}&state=${state || ''}`, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    const taxData = await taxResponse.json();

    if (!taxData.success) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine tax rate'
      });
    }

    const taxRate = taxData.data.taxRate;
    const subtotal = parseFloat(amount);
    const discountAmount = parseFloat(discount);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;

    res.json({
      success: true,
      data: {
        subtotal: subtotal.toFixed(2),
        discount: discountAmount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        taxRate: taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        taxName: taxData.data.taxName
      }
    });

  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating tax'
    });
  }
});

// Initialize default tax rules (admin only)
router.post('/init-rules', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const defaultRules = [
      { country: 'US', state: 'CA', taxRate: 8.5, taxName: 'California Sales Tax' },
      { country: 'US', state: 'NY', taxRate: 8.0, taxName: 'New York Sales Tax' },
      { country: 'US', state: 'TX', taxRate: 6.25, taxName: 'Texas Sales Tax' },
      { country: 'US', state: null, taxRate: 7.0, taxName: 'US Average Sales Tax' },
      { country: 'GB', state: null, taxRate: 20.0, taxName: 'VAT' },
      { country: 'DE', state: null, taxRate: 19.0, taxName: 'MwSt' },
      { country: 'FR', state: null, taxRate: 20.0, taxName: 'TVA' }
    ];

    const createdRules = [];
    for (const rule of defaultRules) {
      try {
        const newRule = await TaxRule.create(rule);
        createdRules.push(newRule);
      } catch (err) {
        // Skip if rule already exists
        console.log(`Tax rule already exists for ${rule.country}${rule.state ? `, ${rule.state}` : ''}`);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdRules.length} tax rules`,
      data: { rules: createdRules }
    });

  } catch (error) {
    console.error('Tax rules init error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing tax rules'
    });
  }
});

module.exports = router;
