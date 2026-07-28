const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { authenticate } = require('../middleware/auth');

// Get recurring invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const recurringInvoices = await Invoice.find({
      user: req.user._id,
      isRecurring: true
    }).sort({ nextRecurringDate: 1 });

    res.json({
      success: true,
      data: { invoices: recurringInvoices }
    });

  } catch (error) {
    console.error('Recurring invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recurring invoices'
    });
  }
});

// Create recurring invoice
router.post('/', authenticate, async (req, res) => {
  try {
    const { client, items, taxRate, discount, recurringInterval, startDate } = req.body;

    // Calculate next recurring date
    const nextDate = new Date(startDate || Date.now());
    switch (recurringInterval) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const invoice = await Invoice.create({
      user: req.user._id,
      client,
      items,
      taxRate: taxRate || 0,
      discount: discount || 0,
      isRecurring: true,
      recurringInterval,
      nextRecurringDate: nextDate,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Recurring invoice created successfully',
      data: { invoice }
    });

  } catch (error) {
    console.error('Create recurring invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating recurring invoice'
    });
  }
});

// Generate next recurring invoice (called by cron job or manual trigger)
router.post('/:invoiceId/generate', authenticate, async (req, res) => {
  try {
    const baseInvoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      user: req.user._id,
      isRecurring: true
    });

    if (!baseInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Recurring invoice not found'
      });
    }

    // Calculate next date
    const nextDate = new Date(baseInvoice.nextRecurringDate);
    switch (baseInvoice.recurringInterval) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    // Create new invoice
    const newInvoice = await Invoice.create({
      user: baseInvoice.user,
      client: baseInvoice.client,
      items: baseInvoice.items,
      taxRate: baseInvoice.taxRate,
      discount: baseInvoice.discount,
      currency: baseInvoice.currency,
      isRecurring: true,
      recurringInterval: baseInvoice.recurringInterval,
      nextRecurringDate: nextDate,
      status: 'draft'
    });

    // Update base invoice's next date
    baseInvoice.nextRecurringDate = nextDate;
    await baseInvoice.save();

    res.json({
      success: true,
      message: 'Next recurring invoice generated',
      data: { invoice: newInvoice }
    });

  } catch (error) {
    console.error('Generate recurring invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recurring invoice'
    });
  }
});

// Update recurring invoice
router.put('/:invoiceId', authenticate, async (req, res) => {
  try {
    const { recurringInterval, isRecurring } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      user: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.isRecurring = isRecurring !== undefined ? isRecurring : invoice.isRecurring;
    if (recurringInterval) {
      invoice.recurringInterval = recurringInterval;

      // Recalculate next date
      const nextDate = new Date(invoice.nextRecurringDate || invoice.createdAt);
      switch (recurringInterval) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
      invoice.nextRecurringDate = nextDate;
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Recurring invoice updated',
      data: { invoice }
    });

  } catch (error) {
    console.error('Update recurring invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating recurring invoice'
    });
  }
});

module.exports = router;
