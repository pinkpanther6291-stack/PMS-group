#!/usr/bin/env node
// Remove specific fields from all documents in the `students` collection.
// Usage: node scripts/remove_student_fields.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

const FIELDS_TO_UNSET = [
  'experience',
  'suggested_roles',
  'projects',
  'certifications'
];

function parseDbName(uri) {
  try {
    // simplest: take substring after last '/'
    const idx = uri.lastIndexOf('/');
    if (idx !== -1 && idx < uri.length - 1) return uri.substring(idx + 1).split('?')[0];
  } catch (e) { }
  return 'pmsdb';
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
  const dbName = parseDbName(uri);
  console.log('Connecting to MongoDB at', uri, 'dbName=', dbName);

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('students');

    const unsetObj = FIELDS_TO_UNSET.reduce((acc, k) => { acc[k] = ""; return acc; }, {});

    console.log('Unsetting fields:', FIELDS_TO_UNSET.join(', '));
    const result = await collection.updateMany({}, { $unset: unsetObj });
    console.log(`Matched ${result.matchedCount} documents, modified ${result.modifiedCount} documents.`);
    if (result.modifiedCount > 0) console.log('Fields removed successfully.');
    else console.log('No documents were modified (fields may not exist).');
  } catch (err) {
    console.error('Error running update:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
