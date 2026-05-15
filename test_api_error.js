const fetch = require('node-fetch');

async function testApi() {
    const res = await fetch("http://localhost:3000/api/admin/approve-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            requestId: "test-id",
            adminUserId: "test-admin"
        })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.slice(0, 200));
}
testApi();
