const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity must be positive']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price must be positive']
  },
  total: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Client email is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  items: {
    type: [invoiceItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountCode: {
    type: String,
    trim: true
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR']
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid'],
    default: 'draft'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  nextRecurringDate: {
    type: Date
  },
  paymentLink: {
    type: String
  },
  emailReminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate invoice number before validation
invoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      // Find the highest invoice number and increment it
      const lastInvoice = await mongoose.model('Invoice')
        .findOne({}, { invoiceNumber: 1 })
        .sort({ invoiceNumber: -1 })
        .limit(1);

      let nextNumber = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        // Extract number from INV-XXXXXX format
        const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      this.invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return next(error);
    }
  }

  next();
});

// Update timestamps and calculate totals before saving
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.total = this.subtotal + this.taxAmount - this.discount;

  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);

