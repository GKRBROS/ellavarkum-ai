import 'server-only';

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const SES_REGION = process.env.AWS_SES_REGION?.trim() || process.env.AWS_REGION?.trim() || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID?.trim() || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY?.trim() || '';
const SENDER_EMAIL = process.env.AWS_SES_FROM_EMAIL?.trim() || 'no-reply@frameforge.one';
const RETURN_PATH_EMAIL = process.env.AWS_SES_RETURN_PATH?.trim() || SENDER_EMAIL;
const SES_CONFIGURATION_SET = process.env.AWS_SES_CONFIGURATION_SET?.trim() || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

let sesClient: SESClient | null = null;

const getSesClient = () => {
  if (!sesClient) {
    sesClient = new SESClient({
      region: SES_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return sesClient;
};

export const isSesConfigured = () => {
  return Boolean(SES_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && SENDER_EMAIL);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildOtpEmailHtml = (otp: string) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>FrameForge OTP</title>
<style>
body { margin:0; padding:0; background:#EAE7E4; }
a { text-decoration:none; }
</style>
</head>
<body bgcolor="#EAE7E4">
<center>
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#EAE7E4">
<tr>
<td align="center">
<table width="652" border="0" cellspacing="0" cellpadding="0" style="background:#ffffff;">
<tr>
<td>
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#202020">
<tr>
<td align="center" style="padding:40px 20px; font-family: Arial, sans-serif; font-size:28px; font-weight:bold; color:#ffffff; letter-spacing:1px;">
FRAMEFORGE
</td>
</tr>
</table>
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding: 40px 20px 10px 20px; font-family: Arial, sans-serif; font-size:16px; color:#555;">
Your verification code
</td>
</tr>
<tr>
<td align="center" style="padding: 10px 20px 30px 20px;">
<table border="0" cellspacing="0" cellpadding="0">
<tr>
<td bgcolor="#F4F2FF" align="center" style="border-radius:16px; padding:24px 38px;">
<div style="font-family: Arial, sans-serif; font-weight: bold; font-size: 42px; line-height: 42px; letter-spacing: 8px; color:#3F26DB;">${escapeHtml(otp)}</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td align="center" style="font-family: Arial, sans-serif; font-size:14px; color:#888; padding-bottom:30px;">
Valid for 10 minutes
</td>
</tr>
</table>
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:30px 70px 20px 70px; font-family: Arial, sans-serif; font-size:16px; line-height:26px; color:#444;">
Thank you for using <strong>FrameForge</strong>.
<br><br>
Use the one-time password above to verify your email and continue creating your image.
</td>
</tr>
<tr>
<td align="center" style="padding:0 70px 35px 70px; font-family: Arial, sans-serif; font-size:15px; line-height:24px; color:#666;">
If you didn’t request this code, you can safely ignore this email.
</td>
</tr>
</table>
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding-bottom:50px;">
<span style="font-family: Arial, sans-serif; font-size:16px; color:#3F26DB; font-weight:600;">
Thank you for choosing Frame Forge
</span>
</td>
</tr>
</table>
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:30px; font-family: Arial, sans-serif; font-size:12px; color:#8F8C94;">
You received this email as a registered user of <a href="${APP_URL}" target="_blank" style="color:#8F8C94; text-decoration:none;">FrameForge</a>
<br><br>
© 2026 FrameForge. All rights reserved.
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>
</center>
</body>
</html>`;

export const sendOtpEmail = async (input: { to: string; otp: string }) => {
  if (!isSesConfigured()) {
    throw new Error('AWS SES is not configured. Set AWS_REGION/AWS_SES_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.');
  }

  const client = getSesClient();
  const subject = `Frame Forge verification code: ${input.otp}`;
  const textBody = [
    `Your Frame Forge verification code is: ${input.otp}`,
    'This code is valid for 10 minutes.',
    '',
    'If you did not request this code, you can ignore this message.',
    '',
    `Frame Forge: ${APP_URL}`,
  ].join('\n');

  const response = await client.send(
    new SendEmailCommand({
      Source: SENDER_EMAIL,
      ReturnPath: RETURN_PATH_EMAIL,
      ...(SES_CONFIGURATION_SET ? { ConfigurationSetName: SES_CONFIGURATION_SET } : {}),
      Destination: {
        ToAddresses: [input.to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: buildOtpEmailHtml(input.otp),
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    })
  );

  return response.MessageId || null;
};
