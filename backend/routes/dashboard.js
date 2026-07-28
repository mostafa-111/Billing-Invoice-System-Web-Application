const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Admin dashboard stats
router.get('/admin', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    const totalInvoices = await Invoice.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    const invoices = await Invoice.find();
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);

    const recentInvoices = await Invoice.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalInvoices,
          totalRevenue,
          totalUsers
        },
        recentInvoices
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data' 
    });
  }
});

// User dashboard stats
router.get('/user', async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments({ user: req.user._id });
    
    const userInvoices = await Invoice.find({ user: req.user._id });
    const totalRevenue = userInvoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.total : 0), 0);
    const pendingAmount = userInvoices.reduce((sum, inv) => sum + (inv.status === 'sent' ? inv.total : 0), 0);

    const recentInvoices = await Invoice.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalInvoices,
          totalRevenue,
          pendingAmount
        },
        recentInvoices
      }
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard data' 
    });
  }
});

module.exports = router;

