const mongoose = require('mongoose');
(async ()=>{
  try {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
    await mongoose.connect(uri);
    const students = await mongoose.connection.db.collection('students').find({}).toArray();
    console.log('students count=', students.length);
    console.dir(students.slice(0,10), {depth:3, colors:true});
    await mongoose.disconnect();
  } catch (e) {
    console.error('err', e);
    process.exit(1);
  }
})();
