const express = require('express');
const router = express.Router();
const AISuggestion = require('../models/AISuggestion');
const Invoice = require('../models/Invoice');
const { authenticate } = require('../middleware/auth');

// AI Suggestions for invoice creation
router.post('/suggestions', authenticate, async (req, res) => {
  try {
    const { type, context, clientName, amount, dueDate } = req.body;

    let suggestion = '';
    let confidence = 0.7;

    switch (type) {
      case 'amount':
        // Simple AI suggestion based on historical data
        const userInvoices = await Invoice.find({ user: req.user._id });
        const avgAmount = userInvoices.reduce((sum, inv) => sum + inv.total, 0) / userInvoices.length;
        suggestion = Math.round(avgAmount * 1.1).toString();
        confidence = 0.8;
        break;

      case 'due_date':
        // Suggest due date based on client history
        const clientInvoices = await Invoice.find({
          user: req.user._id,
          'client.name': clientName
        }).sort({ createdAt: -1 }).limit(5);

        if (clientInvoices.length > 0) {
          const avgPaymentDays = clientInvoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => {
              const days = Math.round((new Date(inv.updatedAt) - new Date(inv.createdAt)) / (1000 * 60 * 60 * 24));
              return sum + days;
            }, 0) / clientInvoices.length;

          const suggestedDate = new Date();
          suggestedDate.setDate(suggestedDate.getDate() + Math.round(avgPaymentDays || 30));
          suggestion = suggestedDate.toISOString().split('T')[0];
          confidence = 0.75;
        } else {
          suggestion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          confidence = 0.5;
        }
        break;

      case 'tax_rate':
        suggestion = '8.5'; // Default tax rate
        confidence = 0.6;
        break;

      default:
        suggestion = 'AI suggestion not available';
        confidence = 0.3;
    }

    // Save the suggestion
    const aiSuggestion = await AISuggestion.create({
      user: req.user._id,
      suggestionType: type,
      context: context || '',
      suggestion,
      confidence
    });

    res.json({
      success: true,
      data: {
        suggestion,
        confidence,
        id: aiSuggestion._id
      }
    });

  } catch (error) {
    console.error('AI suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating AI suggestion'
    });
  }
});

// Accept or reject AI suggestion
router.post('/suggestions/:id/feedback', authenticate, async (req, res) => {
  try {
    const { accepted } = req.body;

    const suggestion = await AISuggestion.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    suggestion.accepted = accepted;
    await suggestion.save();

    res.json({
      success: true,
      message: 'Feedback recorded'
    });

  } catch (error) {
    console.error('AI feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording feedback'
    });
  }
});

module.exports = router;
