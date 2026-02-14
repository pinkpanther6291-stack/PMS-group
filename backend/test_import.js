// Simple Node script to POST to import endpoint and print response
const url = 'http://localhost:5000/api/import-scored/Resume_harshita.pdf';
(async () => {
  try {
    const res = await fetch(url, { method: 'POST' });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('HEADERS:', Object.fromEntries(res.headers));
    console.log('BODY:', text);
  } catch (e) {
    console.error('ERROR', e);
  }
})();
