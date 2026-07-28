require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const fs = require('fs');

async function testAtlasConnection() {
  console.log('🔄 Testing MongoDB Atlas connection...');
  console.log('📍 .env file exists:', fs.existsSync('./.env') ? 'Yes' : 'No');
  console.log('📍 MONGO_URI loaded:', process.env.MONGO_URI ? 'Yes' : 'No');

  if (process.env.MONGO_URI) {
    console.log('📍 MONGO_URI starts with:', process.env.MONGO_URI.substring(0, 20) + '...');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));

    // Check users
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log('👥 Users in database:', userCount);

    if (userCount > 0) {
      const users = await User.find({}).select('name email role');
      console.log('📋 User details:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    // Check invoices
    const Invoice = require('./models/Invoice');
    const invoiceCount = await Invoice.countDocuments();
    console.log('📄 Invoices in database:', invoiceCount);

    console.log('✅ Atlas connection test completed successfully!');

  } catch (error) {
    console.error('❌ Atlas connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check username/password in MONGO_URI');
    console.log('2. Verify IP whitelist in MongoDB Atlas (add 0.0.0.0/0 for testing)');
    console.log('3. Ensure database user has read/write permissions');
    console.log('4. Check network connectivity');
    console.log('5. Verify cluster is running in Atlas');
  } finally {
    await mongoose.disconnect();
  }
}

testAtlasConnection();
