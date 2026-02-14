const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Migration: backup collections, unset fields, remove cgpa from non-students, set accessLevel on admins
// Usage: node migrate_remove_fields.js
// It reads MONGODB_URI from env or falls back to mongodb://127.0.0.1:27017/pmsdb

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
const collectionsToModify = ['students', 'faculties', 'tpos', 'admins'];
const fieldsToRemove = [
  'suggested_roles',
  'extracted_skills',
  'projects',
  'notifications',
  'feedback',
  'ats_metrics',
];

async function run() {
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups', ts);
  fs.mkdirSync(backupDir, { recursive: true });

  const summary = {};

  try {
    for (const name of collectionsToModify) {
      const coll = db.collection(name);
      const count = await coll.countDocuments();
      console.log(`Collection '${name}' count: ${count}`);

      // Backup whole collection for safety
      const docs = await coll.find({}).toArray();
      const backupFile = path.join(backupDir, `${name}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
      console.log(`Backed up ${docs.length} docs to ${backupFile}`);

      summary[name] = { beforeCount: count, backedUp: docs.length };
    }

    // Unset target fields from all collections listed
    const unsetObj = {};
    for (const f of fieldsToRemove) unsetObj[f] = '';

    for (const name of collectionsToModify) {
      const coll = db.collection(name);
      const res = await coll.updateMany({}, { $unset: unsetObj });
      console.log(`Unset fields in '${name}': matched=${res.matchedCount} modified=${res.modifiedCount}`);
      summary[name].unset = { matched: res.matchedCount, modified: res.modifiedCount };
    }

    // Remove cgpa from all collections except students
    const nonStudentCollections = collectionsToModify.filter((c) => c !== 'students');
    for (const name of nonStudentCollections) {
      const coll = db.collection(name);
      const res = await coll.updateMany({}, { $unset: { cgpa: '' } });
      console.log(`Unset cgpa in '${name}': matched=${res.matchedCount} modified=${res.modifiedCount}`);
      summary[name].unsetCgpa = { matched: res.matchedCount, modified: res.modifiedCount };
    }

    // Add accessLevel: 'full' to admins
    const adminsColl = db.collection('admins');
    const resAdmin = await adminsColl.updateMany({}, { $set: { accessLevel: 'full' } });
    console.log(`Set accessLevel in 'admins': matched=${resAdmin.matchedCount} modified=${resAdmin.modifiedCount}`);
    summary['admins'].accessLevel = { matched: resAdmin.matchedCount, modified: resAdmin.modifiedCount };

    // Report final counts for sanity
    for (const name of collectionsToModify) {
      const coll = db.collection(name);
      const after = await coll.countDocuments();
      console.log(`Collection '${name}' after count: ${after}`);
      summary[name].afterCount = after;
    }

    const reportFile = path.join(backupDir, 'migration-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
    console.log(`Migration complete. Report written to ${reportFile}`);
    console.log('Backups are in:', backupDir);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
