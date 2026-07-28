const mongoose = require('mongoose');

const aiSuggestionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  suggestionType: {
    type: String,
    enum: ['amount', 'due_date', 'client_info', 'tax_rate'],
    required: true
  },
  context: {
    type: String,
    required: true
  },
  suggestion: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  accepted: {
    type: Boolean,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AISuggestion', aiSuggestionSchema);
