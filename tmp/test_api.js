const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testApi() {
  const url = 'http://localhost:3000/api/client-portal/create-account';
  const payload = {
    email: 'realtest@example.com',
    password: 'Password123',
    clientDataId: 54, // Existing test client
    adminId: 'bfaf1ffd-f8df-4d4c-a84e-e446c1d95cf1', // Existing admin
    createdBy: 'bfaf1ffd-f8df-4d4c-a84e-e446c1d95cf1'
  };

  console.log('Testing API with payload:', payload);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

testApi();
