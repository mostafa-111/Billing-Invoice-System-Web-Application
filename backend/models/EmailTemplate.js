const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['invoice_sent', 'payment_reminder', 'payment_received', 'overdue_notice'],
    required: true
  },
  variables: [{
    type: String,
    enum: ['{{client_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{company_name}}']
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
