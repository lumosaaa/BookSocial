const nodemailer = require('nodemailer');

// ── 构建 transporter（支持 SOCKS5 代理）──────────────────────
function createTransporter() {
  const opts = {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: parseInt(process.env.MAIL_PORT || '465', 10) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  };

  const transporter = nodemailer.createTransport(opts);

  // SOCKS5 代理：覆盖 getSocket 注入代理 socket
  const proxy = process.env.SMTP_PROXY;
  if (proxy && proxy.startsWith('socks')) {
    const { SocksClient } = require('socks');
    const url = new URL(proxy);
    const origGetSocket = transporter.transporter.getSocket.bind(
      transporter.transporter
    );
    transporter.transporter.getSocket = function (options, cb) {
      SocksClient.createConnection({
        proxy: {
          host: url.hostname,
          port: parseInt(url.port, 10),
          type: 5,
        },
        command: 'connect',
        destination: {
          host: options.host || opts.host,
          port: options.port || opts.port,
        },
      })
        .then(({ socket }) => {
          cb(null, { connection: socket });
        })
        .catch((err) => cb(err));
    };
  }

  return transporter;
}

const transporter = createTransporter();

/**
 * 发送6位数字验证码到指定邮箱
 */
async function sendVerificationCode(email, code) {
  const mailOptions = {
    from: process.env.MAIL_FROM || `"书·友 BookSocial" <${process.env.MAIL_USER}>`,
    to: email,
    subject: '【书·友】您的验证码',
    html: `
      <div style="font-family:'Noto Sans SC',sans-serif;max-width:480px;margin:0 auto;
                  padding:40px 20px;background:#FAF6F0;">
        <h2 style="color:#4A6741;text-align:center;margin-bottom:32px;">📖 书·友 BookSocial</h2>
        <div style="background:#FFFDF8;border-radius:12px;padding:32px;
                    border:1px solid #D4C9B0;text-align:center;">
          <p style="color:#2C3E2D;font-size:16px;margin-bottom:24px;">
            您的验证码为：
          </p>
          <div style="font-size:42px;font-weight:700;letter-spacing:12px;
                      color:#4A6741;padding:16px 0;background:#E8D5B7;
                      border-radius:8px;">${code}</div>
          <p style="color:#6B7C6D;font-size:13px;margin-top:24px;">
            验证码有效期 <strong>10 分钟</strong>，请勿泄露给他人。
          </p>
        </div>
        <p style="color:#A8B8A9;font-size:12px;text-align:center;margin-top:24px;">
          如非本人操作，请忽略此邮件。
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV EMAIL] 验证码 → ${email} : ${code}`);
  }
}

module.exports = { sendVerificationCode };
