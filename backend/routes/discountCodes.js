const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const DiscountCode = require('../models/DiscountCode');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require admin access
router.use(authenticate);
router.use(isAdmin);

// Get all discount codes
router.get('/', async (req, res) => {
  try {
    const codes = await DiscountCode.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { codes }
    });
  } catch (error) {
    console.error('Get discount codes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching discount codes' 
    });
  }
});

// Get single discount code
router.get('/:id', async (req, res) => {
  try {
    const code = await DiscountCode.findById(req.params.id);
    
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        message: 'Discount code not found' 
      });
    }

    res.json({
      success: true,
      data: { code }
    });
  } catch (error) {
    console.error('Get discount code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching discount code' 
    });
  }
});

// Validate discount code (public endpoint for users)
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Discount code is required'
      });
    }
    
    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid subtotal is required'
      });
    }
    
    const discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase().trim() 
    });
    
    if (!discountCode) {
      return res.status(404).json({
        success: false,
        message: 'Invalid discount code'
      });
    }
    
    const validation = discountCode.isValid();
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }
    
    const discount = discountCode.calculateDiscount(subtotal);
    
    res.json({
      success: true,
      data: {
        code: discountCode.code,
        percentage: discountCode.percentage,
        discountAmount: discount.amount,
        description: discountCode.description
      }
    });
  } catch (error) {
    console.error('Validate discount code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error validating discount code' 
    });
  }
});

// Create discount code
router.post('/', [
  body('code').notEmpty().withMessage('Code is required')
    .matches(/^[A-Z0-9]+$/).withMessage('Code must contain only uppercase letters and numbers'),
  body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100')
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

    const { code, percentage, description, validFrom, validUntil, maxUses, isActive } = req.body;
    
    // Convert code to uppercase
    const codeUpper = code.toUpperCase().trim();
    
    // Check if code already exists
    const existingCode = await DiscountCode.findOne({ code: codeUpper });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Discount code already exists'
      });
    }
    
    const discountCode = await DiscountCode.create({
      code: codeUpper,
      percentage,
      description,
      validFrom: validFrom ? new Date(validFrom) : Date.now(),
      validUntil: validUntil ? new Date(validUntil) : undefined,
      maxUses: maxUses || null,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Discount code created successfully',
      data: { code: discountCode }
    });
  } catch (error) {
    console.error('Create discount code error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Discount code already exists'
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Error creating discount code' 
    });
  }
});

// Update discount code
router.put('/:id', [
  body('percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100')
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

    const code = await DiscountCode.findById(req.params.id);
    
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        message: 'Discount code not found' 
      });
    }

    const { percentage, description, validFrom, validUntil, maxUses, isActive } = req.body;
    
    if (percentage !== undefined) code.percentage = percentage;
    if (description !== undefined) code.description = description;
    if (validFrom !== undefined) code.validFrom = new Date(validFrom);
    if (validUntil !== undefined) code.validUntil = validUntil ? new Date(validUntil) : undefined;
    if (maxUses !== undefined) code.maxUses = maxUses || null;
    if (isActive !== undefined) code.isActive = isActive;

    await code.save();

    res.json({
      success: true,
      message: 'Discount code updated successfully',
      data: { code }
    });
  } catch (error) {
    console.error('Update discount code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating discount code' 
    });
  }
});

// Delete discount code
router.delete('/:id', async (req, res) => {
  try {
    const code = await DiscountCode.findById(req.params.id);
    
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        message: 'Discount code not found' 
      });
    }

    await DiscountCode.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Discount code deleted successfully'
    });
  } catch (error) {
    console.error('Delete discount code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting discount code' 
    });
  }
});

module.exports = router;

