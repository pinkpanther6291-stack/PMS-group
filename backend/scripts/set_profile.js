const db = db.getSiblingDB('pmsdb');
db.students.updateOne(
  { email: 'test+copilot@example.com' },
  { $set: { profileFileName: 'sample.png', profileData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=' } }
);
printjson(db.students.findOne({ email: 'test+copilot@example.com' }, { name: 1, email: 1, profileFileName: 1, profileData: 1 }));