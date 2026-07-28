// Check for multiple admin users
const mongoose = require('mongoose');
const User = require('./models/User');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mohamedkhalil3136_db_user:MyQOY7uNQlkQtFI5@cluster0.2yknkyz.mongodb.net/test?retryWrites=true&w=majority');

  const admins = await User.find({ email: 'admin@invoiceapp.com' });
  console.log('Number of admin users:', admins.length);

  for (let i = 0; i < admins.length; i++) {
    const admin = admins[i];
    console.log(`Admin ${i + 1}:`, {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      active: admin.isActive,
      passwordValid: await admin.comparePassword('admin123')
    });
  }

  await mongoose.disconnect();
}

check();
