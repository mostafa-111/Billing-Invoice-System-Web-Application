require('dotenv').config();
const mongoose = require('mongoose');

async function checkAtlasData() {
  console.log('🔍 Checking MongoDB Atlas for existing data...');
  console.log('📍 MONGO_URI:', process.env.MONGO_URI);

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to Atlas');

    // List all databases
    const adminDb = mongoose.connection.db.admin();
    const databases = await adminDb.listDatabases();
    console.log('📊 Available databases:');
    databases.databases.forEach(db => {
      console.log('  - ' + db.name + ' (' + (db.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB)');
    });

    // Check current database collections and data
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections in current database (' + mongoose.connection.db.databaseName + '):');

    for (const collection of collections) {
      const count = await mongoose.connection.db.collection(collection.name).countDocuments();
      console.log('  - ' + collection.name + ': ' + count + ' documents');

      // If there are users, show a sample
      if (collection.name === 'users' && count > 0) {
        const sampleUsers = await mongoose.connection.db.collection(collection.name).find({}).limit(3).toArray();
        console.log('    Sample users:');
        sampleUsers.forEach(user => {
          console.log('      - ' + (user.name || user.email || 'Unknown') + ' (' + user.email + ')');
        });
      }
    }

    // Try to connect to other common database names
    const commonDbNames = ['invoice-app', 'invoice_app', 'invoices', 'invoice', 'test'];

    for (const dbName of commonDbNames) {
      if (dbName !== mongoose.connection.db.databaseName) {
        console.log('\n🔄 Checking database: ' + dbName);
        try {
          const otherDb = mongoose.connection.useDb(dbName);
          const otherCollections = await otherDb.db.listCollections().toArray();
          if (otherCollections.length > 0) {
            console.log('  📋 Collections in ' + dbName + ':');
            for (const collection of otherCollections) {
              const count = await otherDb.collection(collection.name).countDocuments();
              console.log('    - ' + collection.name + ': ' + count + ' documents');
            }
          }
        } catch (err) {
          console.log('  ❌ Could not access database: ' + dbName);
        }
      }
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAtlasData();
