const mongoose = require('mongoose');
(async ()=>{
  try {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
    console.log('Connecting to', uri);
  await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const names = ['students','faculties','tpos','admins','logins'];
    for (const n of names) {
      const col = db.collection(n);
      const count = await col.countDocuments();
      console.log(`${n} count =`, count);
      if (count>0) {
        const docs = await col.find({}).limit(3).toArray();
        console.dir(docs, {depth:2});
      }
    }
    await mongoose.disconnect();
  } catch (e) {
    console.error('error', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
