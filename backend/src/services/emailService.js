import nodemailer from 'nodemailer';

// Configure transporter
// For development, we'll try to use a real testing service or just log if env vars are missing
let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
} else {
    console.warn("⚠️ SMTP not configured. Emails will be logged to console only.");
    // Mock transporter
    transporter = {
        sendMail: async (mailOptions) => {
            console.log("----------------------------------------");
            console.log("📧 [MOCK EMAIL] To:", mailOptions.to);
            console.log("Subject:", mailOptions.subject);
            console.log("Body:", mailOptions.text || mailOptions.html);
            console.log("----------------------------------------");
            return { messageId: 'mock-id' };
        }
    };
}

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"HouseMarket Support" <no-reply@housemarket.com>',
            to,
            subject,
            html,
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
    const subject = "🔒 Yêu cầu đặt lại mật khẩu - HouseMarket";
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #3b82f6; text-align: center;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Xin chào,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>${email}</strong>.</p>
            <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu của bạn:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Đặt lại mật khẩu</a>
            </div>
            <p style="font-size: 12px; color: #666;">Link này sẽ hết hạn sau 15 phút.</p>
            <p>Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">© 2026 HouseMarket Pro Dashboard</p>
        </div>
    `;
    return sendEmail({ to: email, subject, html });
};
