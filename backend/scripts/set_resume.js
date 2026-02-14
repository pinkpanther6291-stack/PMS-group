const db = db.getSiblingDB('pmsdb');
const base64 = `JVBERi0xLjUKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL0xlbmd0aCAyIDAgUgovRmlsdGVyIC9GbGF0ZURlY29kZQp+PgpzdHJlYW0KeJwr5M3JyVfIS8xNVbIyUjI0NzS2MjEwMDAwMDAwCkVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago0MAplbmRvYmoKc3RhcnR4cmVmCjQ0NgolJUVPRgo`; // tiny dummy PDF base64

const res = db.students.updateOne({ email: 'anandita@gmail.com' }, { $set: { resumeFileName: 'resume.pdf', resumeData: base64 } });
printjson(db.students.findOne({ email: 'anandita@gmail.com' }, { name:1, email:1, resumeFileName:1 }).toArray ? db.students.find({ email: 'anandita@gmail.com' }).toArray() : db.students.findOne({ email: 'anandita@gmail.com' }));
printjson(res);