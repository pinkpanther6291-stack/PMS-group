const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Unset fields from students collection only, with backup
// Usage: node unset_student_fields.js

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';

async function run() {
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups', ts);
  fs.mkdirSync(backupDir, { recursive: true });

  try {
    const coll = db.collection('students');
    const count = await coll.countDocuments();
    console.log(`students count: ${count}`);

    // Backup
    const docs = await coll.find({}).toArray();
    const backupFile = path.join(backupDir, `students.json`);
    fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
    console.log(`Backed up ${docs.length} student docs to ${backupFile}`);

    // Unset fields
    const unsetObj = { suggested_roles: '', extracted_skills: '', projects: '' };
    const res = await coll.updateMany({}, { $unset: unsetObj });
    console.log(`Unset fields in 'students': matched=${res.matchedCount} modified=${res.modifiedCount}`);

    const after = await coll.countDocuments();
    const report = { beforeCount: count, afterCount: after, unset: { matched: res.matchedCount, modified: res.modifiedCount }, backup: backupFile };
    const reportFile = path.join(backupDir, 'migration-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log('Migration complete. Report:', reportFile);
  } catch (e) {
    console.error('Migration failed:', e && e.message ? e.message : e);
  } finally {
    await mongoose.disconnect();
  }
}

run();
