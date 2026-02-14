// Simple migration script: copy collections from source DB to target DB using Mongoose connection
const mongoose = require('mongoose');

const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const SOURCE = 'pmsdb';
const TARGET = 'pmsdb';
const COLS = ['students','faculties','tpos','admins'];

async function run(){
  await mongoose.connect(MONGO, { dbName: SOURCE });
  const admin = mongoose.connection.db.admin();
  console.log('Connected to', MONGO);

  const native = mongoose.connection.client;

  for(const c of COLS){
    const sourceColl = native.db(SOURCE).collection(c);
    const targetColl = native.db(TARGET).collection(c);
    const docs = await sourceColl.find().toArray();
    let n = 0;
    for(const d of docs){
      await targetColl.updateOne({ _id: d._id }, { $set: d }, { upsert: true });
      n++;
    }
    console.log(`Copied ${n} docs from ${SOURCE}.${c} -> ${TARGET}.${c}`);
  }

  await mongoose.disconnect();
}

run().catch(err=>{ console.error('Migration failed', err); process.exit(1); });
