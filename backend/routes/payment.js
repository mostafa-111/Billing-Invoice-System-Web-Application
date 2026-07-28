const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const { authenticate } = require('../middleware/auth');

// Generate payment link (mock implementation)
router.post('/create-link/:invoiceId', authenticate, async (req, res) => {
  try {
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

    // Generate mock payment link
    const paymentLink = `https://invoiceapp.com/pay/${invoice._id}?token=${Date.now()}`;

    // Save payment link to invoice
    invoice.paymentLink = paymentLink;
    await invoice.save();

    res.json({
      success: true,
      message: 'Payment link created successfully',
      data: {
        paymentLink,
        amount: invoice.total,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber
      }
    });

  } catch (error) {
    console.error('Create payment link error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment link'
    });
  }
});

// Process payment (mock implementation)
router.post('/process/:invoiceId', authenticate, async (req, res) => {
  try {
    const { paymentMethod, amount } = req.body;

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

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Invoice is already paid'
      });
    }

    // Mock payment processing
    // In real implementation, integrate with Stripe, PayPal, etc.
    const paymentAmount = parseFloat(amount);
    const invoiceTotal = parseFloat(invoice.total);

    if (Math.abs(paymentAmount - invoiceTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount does not match invoice total'
      });
    }

    // Mark invoice as paid
    invoice.status = 'paid';
    await invoice.save();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        invoiceId: invoice._id,
        amount: paymentAmount,
        currency: invoice.currency,
        paymentMethod: paymentMethod || 'card',
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment'
    });
  }
});

// Get payment status
router.get('/status/:invoiceId', authenticate, async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: {
        status: invoice.status,
        paymentLink: invoice.paymentLink,
        amount: invoice.total,
        currency: invoice.currency,
        invoiceNumber: invoice.invoiceNumber
      }
    });

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment status'
    });
  }
});

module.exports = router;
