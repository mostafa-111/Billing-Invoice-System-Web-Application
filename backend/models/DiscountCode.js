const mongoose = require('mongoose');

const discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers']
  },
  percentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [0, 'Percentage must be positive'],
    max: [100, 'Percentage cannot exceed 100']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  maxUses: {
    type: Number,
    default: null // null means unlimited uses
  },
  currentUses: {
    type: Number,
    default: 0
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

// Update timestamp before saving
discountCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if code is valid
discountCodeSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) {
    return { valid: false, message: 'Discount code is not active' };
  }
  
  // Check validity dates
  if (this.validFrom && now < this.validFrom) {
    return { valid: false, message: 'Discount code is not yet valid' };
  }
  
  if (this.validUntil && now > this.validUntil) {
    return { valid: false, message: 'Discount code has expired' };
  }
  
  // Check usage limit
  if (this.maxUses !== null && this.currentUses >= this.maxUses) {
    return { valid: false, message: 'Discount code has reached maximum uses' };
  }
  
  return { valid: true };
};

// Method to calculate discount amount
discountCodeSchema.methods.calculateDiscount = function(subtotal) {
  const validation = this.isValid();
  if (!validation.valid) {
    return { amount: 0, error: validation.message };
  }
  
  const discountAmount = (subtotal * this.percentage) / 100;
  return { amount: discountAmount, error: null };
};

module.exports = mongoose.model('DiscountCode', discountCodeSchema);

