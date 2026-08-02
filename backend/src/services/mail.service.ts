import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const transport=env.SMTP_HOST?nodemailer.createTransport({host:env.SMTP_HOST,port:env.SMTP_PORT,secure:env.SMTP_SECURE,auth:env.SMTP_USER&&env.SMTP_PASSWORD?{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}:undefined}):null;
export const mailService={
 async sendVerification(email:string,token:string){if(!transport){logger.warn("SMTP is not configured; verification email was not dispatched");return}const url=`${env.APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;await transport.sendMail({from:env.SMTP_FROM,to:email,subject:"Verify your A-yos email",text:`Verify your email: ${url}`})},
 async sendPasswordReset(email:string,token:string){if(!transport){logger.warn("SMTP is not configured; password reset email was not dispatched");return}const url=`${env.APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;await transport.sendMail({from:env.SMTP_FROM,to:email,subject:"Reset your A-yos password",text:`Reset your password: ${url}`})}
};
