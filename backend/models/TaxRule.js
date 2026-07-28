const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true
  },
  state: {
    type: String
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  taxName: {
    type: String,
    required: true,
    default: 'Sales Tax'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one active rule per country/state combination
taxRuleSchema.index({ country: 1, state: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TaxRule', taxRuleSchema);
