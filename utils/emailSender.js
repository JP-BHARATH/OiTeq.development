import nodemailer from 'nodemailer';

// Create reusable transporter object
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  },
  // For production with proper certificates, you can add:
  tls: {
    // Use this if you have custom CA certificates
    // ca: [fs.readFileSync('/path/to/cert.pem')]
    
    // Or for development/testing with self-signed certs:
    rejectUnauthorized: process.env.NODE_ENV === 'production' // Only reject in production
  }
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.error('Error with mail transporter config:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

export async function sendEmail(to, subject, text, html) {
  try {
    const mailOptions = {
      from: `"InstantBackup" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error.message,
      fullError: error 
    };
  }
}