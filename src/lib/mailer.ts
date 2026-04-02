import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your VerifyIQ Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981,#06b6d4);padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🔍 VerifyIQ</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Email Verification</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:15px;">Hi there 👋</p>
                    <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                      Use the verification code below to complete your sign-up. This code expires in <strong style="color:#34d399;">10 minutes</strong>.
                    </p>
                    <!-- OTP Box -->
                    <div style="background:#0f172a;border:2px solid #10b981;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Verification Code</p>
                      <h2 style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#10b981;font-family:monospace;">${otp}</h2>
                    </div>
                    <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
                      If you didn't request this, you can safely ignore this email. Someone may have entered your address by mistake.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
                    <p style="margin:0;color:#475569;font-size:12px;">© 2025 VerifyIQ · AI Plagiarism Detection</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Reset Your VerifyIQ Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🔑 VerifyIQ</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Password Reset</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:15px;">Hi there 👋</p>
                    <p style="margin:0 0 28px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                      We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong style="color:#fbbf24;">15 minutes</strong>.
                    </p>
                    <div style="text-align:center;margin-bottom:28px;">
                      <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:700;font-size:16px;border-radius:12px;text-decoration:none;">Reset Password</a>
                    </div>
                    <p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.6;">
                      Or copy this link into your browser:
                    </p>
                    <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all;background:#0f172a;padding:12px;border-radius:8px;border:1px solid #334155;">${resetUrl}</p>
                    <p style="margin:20px 0 0;color:#475569;font-size:13px;line-height:1.6;">
                      If you didn't request this, you can safely ignore this email. Your password will not change.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
                    <p style="margin:0;color:#475569;font-size:12px;">© 2025 VerifyIQ · AI Plagiarism Detection</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}

