import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { UserModel } from '../models/user';
import { generateSecureBackupCodes } from '../utils/security';

const MFA_ISSUER = process.env.MFA_ISSUER || 'NEXUS Office Suite';

export class MFAService {
  constructor(private userModel: UserModel) {}

  async setupMFA(userId: string, userEmail: string): Promise<{ secret: string; qrCode: string }> {
    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate OTP Auth URL
    const otpauthUrl = authenticator.keyuri(userEmail, MFA_ISSUER, secret);

    // Generate QR code
    const qrCode = await qrcode.toDataURL(otpauthUrl);

    // Store secret (not enabled yet)
    await this.userModel.updateMFA(userId, false, secret);

    return { secret, qrCode };
  }

  async enableMFA(userId: string, token: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa_secret) {
      throw new Error('MFA not set up');
    }

    // Verify token
    const isValid = authenticator.verify({
      token,
      secret: user.mfa_secret,
    });

    if (!isValid) {
      throw new Error('Invalid MFA token');
    }

    // Enable MFA
    await this.userModel.updateMFA(userId, true, user.mfa_secret);
  }

  async disableMFA(userId: string, token: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa_secret) {
      throw new Error('MFA not enabled');
    }

    // Verify token
    const isValid = authenticator.verify({
      token,
      secret: user.mfa_secret,
    });

    if (!isValid) {
      throw new Error('Invalid MFA token');
    }

    // Disable MFA
    await this.userModel.updateMFA(userId, false, undefined);
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfa_secret || !user.mfa_enabled) {
      throw new Error('MFA not enabled');
    }

    return authenticator.verify({
      token,
      secret: user.mfa_secret,
    });
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    // Generate 10 cryptographically secure backup codes
    const codes = generateSecureBackupCodes(10);

    // TODO: Store hashed versions of these codes in the database
    // For now, we'll just return them

    return codes;
  }
}
