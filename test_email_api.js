const fetch = require('node-fetch');

async function debugEmail() {
    const res = await fetch("http://localhost:3000/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            to: "sarmad.mueen84@outlook.com",
            subject: "Debug Test",
            html: "<p>Hello</p>"
        })
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}
debugEmail();
