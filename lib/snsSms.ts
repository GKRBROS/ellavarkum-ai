import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.AWS_SNS_REGION || "ap-south-1";

const snsClient = new SNSClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Sends a transactional SMS using Amazon SNS
 * @param phoneNumber Phone number in E.164 format (e.g. +91XXXXXXXXXX)
 * @param message The SMS message content
 */
export async function sendSMS(phoneNumber: string, message: string) {
  try {
    const params = {
      Message: message,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        "AWS.SNS.SMS.SenderID": {
          DataType: "String",
          StringValue: "ELAVARKUM",
        },
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    };

    const command = new PublishCommand(params);
    const response = await snsClient.send(command);
    
    console.log(`SMS sent to ${phoneNumber}. MessageId: ${response.MessageId}`);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("SNS Send Error:", error);
    return { success: false, error };
  }
}

/**
 * Sends an OTP via SMS
 * @param phoneNumber Phone number in E.164 format
 * @param otp 6-digit OTP code
 */
export async function sendOtpSms(phoneNumber: string, otp: string) {
  const message = `${otp} is your Elavarkum AI verification code. Valid for 10 minutes.`;
  return sendSMS(phoneNumber, message);
}
