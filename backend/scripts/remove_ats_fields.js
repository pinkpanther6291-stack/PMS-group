const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to', uri);
    const dbName = (uri.match(/\/([\w-]+)(\?|$)/) && RegExp.$1) || 'pmsdb';
    const db = client.db();
    const students = db.collection('students');

    const unsetFields = {
      ats_metrics: '',
      suggested_roles: '',
      extracted_skills: '',
      projects: '',
      experience: '',
      certifications: '',
      tips: ''
    };

    console.log('Unsetting fields:', Object.keys(unsetFields).join(', '));
    const res = await students.updateMany({}, { $unset: unsetFields });
    console.log('Matched', res.matchedCount, 'Modified', res.modifiedCount);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exitCode = 1;
  } finally {
    try { await client.close(); } catch (e) { }
  }
}

if (require.main === module) main();
