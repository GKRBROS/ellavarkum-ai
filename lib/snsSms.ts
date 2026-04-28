import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

if (!process.env.AWS_SNS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) {
  console.warn('CRITICAL: No AWS Access Key ID found in environment variables (tried AWS_SNS_ACCESS_KEY_ID and AWS_ACCESS_KEY_ID)');
}

export class OtpService {
  static async sendOtp(phoneNumber: string, otpCode: string) {
    try {
      const message = `Your Ellavarkkum AI OTP is: ${otpCode}`;

      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      });

      const response = await snsClient.send(command);

      return {
        success: true,
        message: "OTP sent successfully",
        messageId: response.MessageId,
      };
    } catch (error: any) {
      // console.error("Error sending OTP:", error.message);

      return {
        success: false,
        message: "Failed to send OTP",
        error: error.message,
      };
    }
  }
}

// System required exports
export async function sendSMS(phoneNumber: string, message: string) {
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: phoneNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" },
    },
  });
  const response = await snsClient.send(command);
  return { success: true, messageId: response.MessageId };
}

export async function sendOtpSms(phoneNumber: string, otp: string) {
  return OtpService.sendOtp(phoneNumber, otp);
}
