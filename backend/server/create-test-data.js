import mongoose from 'mongoose';
import User from './src/models/User.js';
import Case from './src/models/Case.js';
import Client from './src/models/Client.js';
import Invoice from './src/models/Invoice.js';
import TimeEntry from './src/models/TimeEntry.js';
import Activity from './src/models/Activity.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lawyer_zen';

async function createTestData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test user
    const existingUser = await User.findOne({ email: 'test@example.com' });
    let testUser;
    
    if (!existingUser) {
      testUser = await User.create({
        name: 'Test Lawyer',
        email: 'test@example.com',
        passwordHash: User.hashPassword('password123'),
        role: 'lawyer',
        barNumber: 'BAR123',
        firm: 'Test Law Firm'
      });
      console.log('✅ Created test user:', testUser.email);
    } else {
      testUser = existingUser;
      console.log('✅ Using existing test user:', testUser.email);
    }

    const userId = testUser._id;

    // Create test clients
    const clients = await Client.insertMany([
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91-9876543210',
        address: 'Mumbai, Maharashtra',
        owner: userId
      },
      {
        name: 'Jane Smith', 
        email: 'jane@example.com',
        phone: '+91-9876543211',
        address: 'Delhi, India',
        owner: userId
      }
    ]);
    console.log('✅ Created test clients:', clients.length);

    // Create test cases
    const cases = await Case.insertMany([
      {
        caseNumber: 'CC/2024/001',
        clientName: 'John Doe',
        opposingParty: 'ABC Corp',
        courtName: 'District Court Mumbai',
        judgeName: 'Hon. Justice Sharma',
        hearingDate: new Date(),
        hearingTime: '10:30',
        status: 'active',
        priority: 'high',
        caseType: 'Civil',
        description: 'Contract dispute case',
        owner: userId
      },
      {
        caseNumber: 'CR/2024/002',
        clientName: 'Jane Smith',
        opposingParty: 'XYZ Ltd',
        courtName: 'High Court Delhi',
        judgeName: 'Hon. Justice Patel',
        hearingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        hearingTime: '14:00',
        status: 'active',
        priority: 'urgent',
        caseType: 'Criminal',
        description: 'Criminal case matter',
        owner: userId
      }
    ]);
    console.log('✅ Created test cases:', cases.length);

    // Create test invoices
    const invoices = await Invoice.insertMany([
      {
        clientId: clients[0]._id,
        invoiceNumber: 'INV-2024-001',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'paid',
        currency: 'INR',
        items: [{
          description: 'Legal consultation',
          quantity: 5,
          unitPrice: 5000,
          amount: 25000
        }],
        subtotal: 25000,
        taxRate: 18,
        taxAmount: 4500,
        total: 29500,
        paidAt: new Date(),
        owner: userId
      },
      {
        clientId: clients[1]._id,
        invoiceNumber: 'INV-2024-002',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'sent',
        currency: 'INR',
        items: [{
          description: 'Court representation',
          quantity: 3,
          unitPrice: 8000,
          amount: 24000
        }],
        subtotal: 24000,
        taxRate: 18,
        taxAmount: 4320,
        total: 28320,
        owner: userId
      }
    ]);
    console.log('✅ Created test invoices:', invoices.length);

    // Create test time entries
    const timeEntries = await TimeEntry.insertMany([
      {
        caseId: cases[0]._id,
        description: 'Case research and documentation',
        duration: 120, // 2 hours in minutes
        hourlyRate: 2500,
        date: new Date(),
        billable: true,
        owner: userId
      },
      {
        caseId: cases[1]._id,
        description: 'Client consultation meeting',
        duration: 60, // 1 hour in minutes
        hourlyRate: 3000,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000),
        billable: true,
        owner: userId
      }
    ]);
    console.log('✅ Created test time entries:', timeEntries.length);

    // Create test activities
    const activities = await Activity.insertMany([
      {
        owner: userId,
        type: 'case_created',
        message: `New case ${cases[0].caseNumber} created for ${cases[0].clientName}`,
        entityType: 'case',
        entityId: cases[0]._id,
        metadata: {
          caseNumber: cases[0].caseNumber,
          clientName: cases[0].clientName,
          priority: cases[0].priority
        }
      },
      {
        owner: userId,
        type: 'invoice_created',
        message: `Invoice ${invoices[0].invoiceNumber} created for ${clients[0].name}`,
        entityType: 'invoice',
        entityId: invoices[0]._id,
        metadata: {
          invoiceNumber: invoices[0].invoiceNumber,
          clientName: clients[0].name,
          amount: invoices[0].total,
          currency: invoices[0].currency
        }
      },
      {
        owner: userId,
        type: 'time_logged',
        message: '2h logged for CC/2024/001',
        entityType: 'time_entry',
        entityId: timeEntries[0]._id,
        metadata: {
          duration: timeEntries[0].duration,
          durationText: '2h',
          caseNumber: cases[0].caseNumber,
          billable: true
        }
      }
    ]);
    console.log('✅ Created test activities:', activities.length);

    console.log('\n🎉 Test data created successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('\n💡 You can now login with these credentials in the frontend.');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestData();
