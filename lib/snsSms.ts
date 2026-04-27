import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.AWS_SNS_REGION || process.env.AWS_REGION || "ap-south-1";

const snsClient = new SNSClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export class OtpService {
  /**
   * Sends an OTP via SMS using Amazon SNS
   * @param phoneNumber Phone number in E.164 format
   * @param otpCode 6-digit OTP code
   */
  static async sendOtp(phoneNumber: string, otpCode: string) {
    try {
      const message = `Your OTP code is: ${otpCode}. It will expire in 10 minutes.`;

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
      console.error("Error sending OTP:", error.message);

      return {
        success: false,
        message: "Failed to send OTP",
        error: error.message,
      };
    }
  }
}

/**
 * Sends a transactional SMS using Amazon SNS
 * @param phoneNumber Phone number in E.164 format (e.g. +91XXXXXXXXXX)
 * @param message The SMS message content
 */
export async function sendSMS(phoneNumber: string, message: string) {
  try {
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
    
    console.log(`SMS sent to ${phoneNumber}. MessageId: ${response.MessageId}`);
    return { success: true, messageId: response.MessageId };
  } catch (error: any) {
    console.error("SNS Send Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends an OTP via SMS (Wrapper for OtpService.sendOtp for backward compatibility)
 * @param phoneNumber Phone number in E.164 format
 * @param otp 6-digit OTP code
 */
export async function sendOtpSms(phoneNumber: string, otp: string) {
  return OtpService.sendOtp(phoneNumber, otp);
}
