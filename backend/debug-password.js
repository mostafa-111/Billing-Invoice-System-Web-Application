// Debug password issue
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function debug() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mohamedkhalil3136_db_user:MyQOY7uNQlkQtFI5@cluster0.2yknkyz.mongodb.net/test?retryWrites=true&w=majority');

  const user = await User.findOne({ email: 'admin@invoiceapp.com' });
  if (!user) {
    console.log('No admin user found');
    return;
  }

  console.log('User password hash starts with:', user.password.substring(0, 20));
  console.log('Hash length:', user.password.length);

  // Test direct bcrypt comparison
  const directCompare = await bcrypt.compare('admin123', user.password);
  console.log('Direct bcrypt compare:', directCompare);

  // Test user method
  const methodCompare = await user.comparePassword('admin123');
  console.log('User method compare:', methodCompare);

  await mongoose.disconnect();
}

debug();
