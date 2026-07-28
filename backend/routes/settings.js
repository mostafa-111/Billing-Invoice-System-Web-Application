const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const CompanySettings = require('../models/CompanySettings');
const { authenticate, isAdmin } = require('../middleware/auth');
const Invoice = require('../models/Invoice');

router.use(authenticate);
router.use(isAdmin);

// Get settings
router.get('/', async (req, res) => {
  try {
    const settings = await CompanySettings.getSettings();
    
    res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching settings' 
    });
  }
});

// Update settings
router.put('/', [
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty'),
  body('currency').optional().trim().notEmpty().withMessage('Currency cannot be empty'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      settings.updatedAt = Date.now();
      await settings.save();
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating settings' 
    });
  }
});

// Export invoices as CSV
router.get('/export/csv', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const createCsvWriter = require('csv-writer').createObjectCsvStringifier;
    
    const csvWriter = createCsvWriter({
      header: [
        { id: 'invoiceNumber', title: 'Invoice Number' },
        { id: 'clientName', title: 'Client Name' },
        { id: 'clientEmail', title: 'Client Email' },
        { id: 'userName', title: 'Created By' },
        { id: 'status', title: 'Status' },
        { id: 'subtotal', title: 'Subtotal' },
        { id: 'taxAmount', title: 'Tax' },
        { id: 'discount', title: 'Discount' },
        { id: 'total', title: 'Total' },
        { id: 'createdAt', title: 'Created At' }
      ]
    });

    const records = invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      clientEmail: inv.client.email,
      userName: inv.user.name,
      status: inv.status,
      subtotal: inv.subtotal.toFixed(2),
      taxAmount: inv.taxAmount.toFixed(2),
      discount: inv.discount.toFixed(2),
      total: inv.total.toFixed(2),
      createdAt: new Date(inv.createdAt).toLocaleDateString()
    }));

    const csv = csvWriter.getHeaderString() + csvWriter.stringifyRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices-export.csv');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error exporting CSV' 
    });
  }
});

module.exports = router;

