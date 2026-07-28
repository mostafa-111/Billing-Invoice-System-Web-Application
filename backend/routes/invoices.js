const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const DiscountCode = require('../models/DiscountCode');
const { authenticate, isAdmin, isAdminOrOwner } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Get all invoices (admin: all, user: own only)
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };
    const invoices = await Invoice.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { invoices }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoices' 
    });
  }
});

// Generate PDF (must come before /:id route)
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && invoice.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice number and date
    doc.fontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Client info
    doc.fontSize(14).text('Bill To:', 50);
    doc.fontSize(12);
    doc.text(invoice.client.name);
    if (invoice.client.email) doc.text(invoice.client.email);
    if (invoice.client.address) doc.text(invoice.client.address);
    if (invoice.client.phone) doc.text(invoice.client.phone);
    doc.moveDown();

    // Items table
    doc.fontSize(14).text('Items:', 50);
    doc.moveDown(0.5);
    
    let yPosition = doc.y;
    doc.fontSize(10);
    doc.text('Description', 50, yPosition);
    doc.text('Qty', 350, yPosition);
    doc.text('Price', 400, yPosition);
    doc.text('Total', 480, yPosition);
    
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    invoice.items.forEach(item => {
      doc.text(item.name, 50, yPosition);
      doc.text(item.quantity.toString(), 350, yPosition);
      doc.text(`$${item.price.toFixed(2)}`, 400, yPosition);
      doc.text(`$${item.total.toFixed(2)}`, 480, yPosition);
      yPosition += 20;
    });

    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 20;

    // Totals
    doc.fontSize(12);
    doc.text(`Subtotal:`, 350, yPosition);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, 480, yPosition, { align: 'right' });
    yPosition += 20;
    
    if (invoice.taxRate > 0) {
      doc.text(`Tax (${invoice.taxRate}%):`, 350, yPosition);
      doc.text(`$${invoice.taxAmount.toFixed(2)}`, 480, yPosition, { align: 'right' });
      yPosition += 20;
    }
    
    if (invoice.discount > 0) {
      doc.text(`Discount:`, 350, yPosition);
      doc.text(`-$${invoice.discount.toFixed(2)}`, 480, yPosition, { align: 'right' });
      yPosition += 20;
    }
    
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(`Total:`, 350, yPosition);
    doc.text(`$${invoice.total.toFixed(2)}`, 480, yPosition, { align: 'right' });
    yPosition += 30;

    // Status
    doc.fontSize(12).font('Helvetica');
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, yPosition);
    
    if (invoice.notes) {
      yPosition += 30;
      doc.text(`Notes: ${invoice.notes}`, 50, yPosition);
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF' 
    });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && invoice.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      data: { invoice }
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching invoice' 
    });
  }
});

// Create invoice
router.post('/', [
  body('client.name').notEmpty().withMessage('Client name is required'),
  body('client.email').isEmail().withMessage('Client email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be positive'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive')
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

    const { client, items, taxRate, discountCode, discount, status, dueDate, notes } = req.body;

    // Calculate item totals
    const invoiceItems = items.map(item => ({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price
    }));

    // Calculate subtotal, tax, and total
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    
    // For non-admin users, force tax rate to 14%
    const finalTaxRate = req.user.role === 'admin' ? (taxRate || 0) : 14;
    const taxAmount = (subtotal * finalTaxRate) / 100;
    
    // Handle discount code or direct discount amount
    let finalDiscount = 0;
    let appliedDiscountCode = null;
    
    if (discountCode) {
      // Validate and apply discount code
      const code = await DiscountCode.findOne({ code: discountCode.toUpperCase().trim() });
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount code'
        });
      }
      
      const validation = code.isValid();
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
      
      const discountResult = code.calculateDiscount(subtotal);
      if (discountResult.error) {
        return res.status(400).json({
          success: false,
          message: discountResult.error
        });
      }
      
      finalDiscount = discountResult.amount;
      appliedDiscountCode = code.code;
      
      // Increment usage count
      code.currentUses += 1;
      await code.save();
    } else if (req.user.role === 'admin' && discount !== undefined) {
      // Only admins can set direct discount amount
      finalDiscount = discount || 0;
    }
    
    const total = subtotal + taxAmount - finalDiscount;

    // For non-admin users, status must be 'draft' or not set
    const finalStatus = req.user.role === 'admin' ? (status || 'draft') : 'draft';

    const invoice = await Invoice.create({
      user: req.user._id,
      client,
      items: invoiceItems,
      subtotal,
      taxRate: finalTaxRate,
      taxAmount,
      discount: finalDiscount,
      discountCode: appliedDiscountCode,
      total,
      status: finalStatus,
      dueDate,
      notes
    });

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice: populatedInvoice }
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating invoice' 
    });
  }
});

// Update invoice
router.put('/:id', [
  body('client.name').notEmpty().withMessage('Client name is required'),
  body('client.email').isEmail().withMessage('Client email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
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

    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && invoice.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const { client, items, taxRate, discountCode, discount, status, dueDate, notes } = req.body;

    // Calculate item totals
    const invoiceItems = items.map(item => ({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      price: item.price,
      total: item.quantity * item.price
    }));

    invoice.client = client;
    invoice.items = invoiceItems;
    
    // For non-admin users, force tax rate to 14% and prevent status changes
    if (req.user.role === 'admin') {
      invoice.taxRate = taxRate !== undefined ? taxRate : invoice.taxRate;
      invoice.status = status !== undefined ? status : invoice.status;
    } else {
      // Non-admin users: tax rate is always 14%, status cannot be changed
      invoice.taxRate = 14;
      // Status remains unchanged for non-admin users
    }
    
    // Handle discount code or direct discount amount
    if (discountCode) {
      // Validate and apply discount code
      const code = await DiscountCode.findOne({ code: discountCode.toUpperCase().trim() });
      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Invalid discount code'
        });
      }
      
      const validation = code.isValid();
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message
        });
      }
      
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const discountResult = code.calculateDiscount(subtotal);
      if (discountResult.error) {
        return res.status(400).json({
          success: false,
          message: discountResult.error
        });
      }
      
      invoice.discount = discountResult.amount;
      invoice.discountCode = code.code;
      
      // Increment usage count
      code.currentUses += 1;
      await code.save();
    } else if (req.user.role === 'admin' && discount !== undefined) {
      // Only admins can set direct discount amount
      invoice.discount = discount;
      invoice.discountCode = null;
    }
    
    invoice.dueDate = dueDate !== undefined ? dueDate : invoice.dueDate;
    invoice.notes = notes !== undefined ? notes : invoice.notes;

    // Recalculate totals explicitly
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    invoice.subtotal = subtotal;
    invoice.taxAmount = (invoice.subtotal * invoice.taxRate) / 100;
    invoice.total = invoice.subtotal + invoice.taxAmount - invoice.discount;

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('user', 'name email');

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: { invoice: populatedInvoice }
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating invoice' 
    });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invoice not found' 
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && invoice.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting invoice' 
    });
  }
});

module.exports = router;

