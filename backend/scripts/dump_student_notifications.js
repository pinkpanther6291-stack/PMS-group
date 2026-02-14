const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';

async function main() {
  await mongoose.connect(mongoUri);
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
  const docs = await Student.find({}).select('name email notifications feedback').lean();
  console.log('Found', docs.length, 'students');
  docs.forEach((d) => {
    console.log('----');
    console.log('name:', d.name, 'email:', d.email);
    console.log('notifications:', JSON.stringify(d.notifications || [], null, 2));
    console.log('feedback:', JSON.stringify(d.feedback || [], null, 2));
  });
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
