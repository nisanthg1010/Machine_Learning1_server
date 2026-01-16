const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from current directory
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const uri = process.env.MONGODB_URI;

console.log('--- MongoDB Diagnostic Script ---');
console.log('Node Version:', process.version);

if (!uri) {
    console.error('❌ MONGODB_URI is missing from .env');
    process.exit(1);
}

// Masked URI logging
const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log('Attempting to connect to:', maskedUri);

async function testConnection() {
    try {
        console.log('Connecting...');
        const start = Date.now();

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        const duration = Date.now() - start;
        console.log(`✅ Connected successfully in ${duration}ms!`);

        console.log('Connection state:', mongoose.connection.readyState);
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

        console.log('Testing simple query...');
        // Try to list collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`✅ Collections found: ${collections.length}`);
        collections.forEach(c => console.log(' - ' + c.name));

        console.log('✅ Diagnostic complete. Connection is working.');
    } catch (err) {
        console.error('❌ Connection failed!');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        if (err.reason) console.error('Error reason:', err.reason);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
            console.log('Disconnected.');
        }
    }
}

testConnection();
