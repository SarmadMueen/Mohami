const nodemailer = require('nodemailer');

// Get credentials from args or env
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASSWORD;

if (!user || !pass) {
    console.error('Error: EMAIL_USER and EMAIL_PASSWORD must be set in environment');
    process.exit(1);
}

console.log(`Attempting to send email as: ${user}`);

async function sendTestEmail() {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass,
            },
            debug: true, // Enable debug output
        });

        const mailOptions = {
            from: user,
            to: user, // Send to self
            subject: 'Test Email from Mohami Pro Debugger',
            html: '<h1>It works!</h1><p>If you are reading this, email sending is configured correctly.</p>',
        };

        console.log('Sending...');
        const info = await transporter.sendMail(mailOptions);
        console.log('Success! Message ID:', info.messageId);
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('---------------------------------------------------');
        console.error('FAILED TO SEND EMAIL');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.response) {
            console.error('Server Response:', error.response);
        }
        console.error('---------------------------------------------------');
        console.log('\nTroubleshooting Tip: If using Gmail, you likely need an "App Password" instead of your login password.');
        console.log('Visit https://myaccount.google.com/apppasswords to generate one.');
    }
}

sendTestEmail();
