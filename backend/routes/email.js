const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const EmailTemplate = require('../models/EmailTemplate');
const Invoice = require('../models/Invoice');
const { authenticate } = require('../middleware/auth');

// Configure nodemailer (in production, use real SMTP settings)
const transporter = nodemailer.createTransport({
  service: 'gmail', // For demo purposes - use proper SMTP in production
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Send invoice email
router.post('/send-invoice/:invoiceId', authenticate, async (req, res) => {
  try {
    const { templateId, customMessage } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      user: req.user._id
    }).populate('user', 'name email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get email template
    let template;
    if (templateId) {
      template = await EmailTemplate.findOne({
        _id: templateId,
        $or: [{ createdBy: req.user._id }, { isDefault: true }]
      });
    }

    // Use default template if none specified
    if (!template) {
      template = await EmailTemplate.findOne({ type: 'invoice_sent', isDefault: true });
    }

    if (!template) {
      // Create a basic template
      template = {
        subject: 'Invoice {{invoice_number}} from {{company_name}}',
        body: 'Dear {{client_name}},\n\nPlease find attached invoice {{invoice_number}} for ${{amount}}.\n\nDue date: {{due_date}}\n\nThank you for your business!'
      };
    }

    // Replace template variables
    const subject = template.subject
      .replace('{{invoice_number}}', invoice.invoiceNumber)
      .replace('{{company_name}}', invoice.user.name)
      .replace('{{client_name}}', invoice.client.name);

    const body = (template.body || '')
      .replace('{{client_name}}', invoice.client.name)
      .replace('{{invoice_number}}', invoice.invoiceNumber)
      .replace('{{amount}}', invoice.total.toFixed(2))
      .replace('{{due_date}}', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt')
      .replace('{{company_name}}', invoice.user.name);

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@invoiceapp.com',
      to: invoice.client.email,
      subject: subject,
      text: body,
      attachments: [] // Could add PDF attachment here
    };

    // In development, just log the email instead of sending
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email would be sent:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        body: mailOptions.text
      });

      // Mark as sent for demo purposes
      invoice.status = 'sent';
      invoice.emailReminderSent = true;
      await invoice.save();

      return res.json({
        success: true,
        message: 'Email sent successfully (demo mode)',
        data: {
          to: mailOptions.to,
          subject: mailOptions.subject
        }
      });
    }

    // Actually send email in production
    await transporter.sendMail(mailOptions);

    // Update invoice status
    invoice.status = 'sent';
    invoice.emailReminderSent = true;
    await invoice.save();

    res.json({
      success: true,
      message: 'Email sent successfully',
      data: {
        to: mailOptions.to,
        subject: mailOptions.subject
      }
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending email'
    });
  }
});

// Get email templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await EmailTemplate.find({
      $or: [{ createdBy: req.user._id }, { isDefault: true }]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { templates }
    });

  } catch (error) {
    console.error('Email templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates'
    });
  }
});

// Create email template
router.post('/templates', authenticate, async (req, res) => {
  try {
    const { name, subject, body, type, variables } = req.body;

    const template = await EmailTemplate.create({
      name,
      subject,
      body,
      type,
      variables: variables || [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: { template }
    });

  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template'
    });
  }
});

// Initialize default email templates (admin only)
router.post('/init-templates', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const defaultTemplates = [
      {
        name: 'Invoice Sent',
        subject: 'Invoice {{invoice_number}} from {{company_name}}',
        body: 'Dear {{client_name}},\n\nPlease find attached invoice {{invoice_number}} for ${{amount}}.\n\nDue date: {{due_date}}\n\nThank you for your business!',
        type: 'invoice_sent',
        variables: ['{{client_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}', '{{company_name}}'],
        isDefault: true
      },
      {
        name: 'Payment Reminder',
        subject: 'Payment Reminder - Invoice {{invoice_number}}',
        body: 'Dear {{client_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for ${{amount}} is due on {{due_date}}.\n\nPlease make payment at your earliest convenience.',
        type: 'payment_reminder',
        variables: ['{{client_name}}', '{{invoice_number}}', '{{amount}}', '{{due_date}}'],
        isDefault: true
      },
      {
        name: 'Payment Received',
        subject: 'Payment Received - Invoice {{invoice_number}}',
        body: 'Dear {{client_name}},\n\nThank you for your payment of ${{amount}} for invoice {{invoice_number}}. Your payment has been received and processed.',
        type: 'payment_received',
        variables: ['{{client_name}}', '{{invoice_number}}', '{{amount}}'],
        isDefault: true
      }
    ];

    const createdTemplates = [];
    for (const templateData of defaultTemplates) {
      try {
        const template = await EmailTemplate.create(templateData);
        createdTemplates.push(template);
      } catch (err) {
        console.log(`Template already exists: ${templateData.name}`);
      }
    }

    res.json({
      success: true,
      message: `Created ${createdTemplates.length} email templates`,
      data: { templates: createdTemplates }
    });

  } catch (error) {
    console.error('Email templates init error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing templates'
    });
  }
});

module.exports = router;
