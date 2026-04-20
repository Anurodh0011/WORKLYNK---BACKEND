import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    pendingUser: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
    user: { create: jest.fn() }
  }
}));

jest.unstable_mockModule('../../helpers/otp.helper.js', () => ({
  generateOtp: jest.fn(() => '123456'),
  getOtpExpiry: jest.fn(() => new Date(Date.now() + 600000))
}));

jest.unstable_mockModule('../../helpers/password.helper.js', () => ({
  hashPassword: jest.fn(v => Promise.resolve(`hashed_${v}`)),
  comparePassword: jest.fn((p, h) => Promise.resolve(`hashed_${p}` === h))
}));

jest.unstable_mockModule('../../services/email.service.js', () => ({
  sendOtpEmail: jest.fn(() => Promise.resolve()),
  sendWelcomeEmail: jest.fn(() => Promise.resolve())
}));

const otpService = await import('../../services/otp.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('OtpService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyOtp()', () => {
    it('should throw 429 if too many failed attempts', async () => {
      prisma.pendingUser.findUnique.mockResolvedValue({ id: 'p1', attempts: 5 });
      await expect(otpService.verifyOtp('e', '123')).rejects.toThrow('Too many failed attempts');
      expect(prisma.pendingUser.delete).toHaveBeenCalled();
    });
  });

  describe('resendOtp()', () => {
    it('should send new OTP if cooldown of 60s has passed', async () => {
      const longAgo = new Date(Date.now() - 70000);
      prisma.pendingUser.findUnique.mockResolvedValue({ id: 'p1', createdAt: longAgo, name: 'T' });
      await otpService.resendOtp('test@e.com');
      expect(prisma.pendingUser.update).toHaveBeenCalled();
      const { sendOtpEmail } = await import('../../services/email.service.js');
      expect(sendOtpEmail).toHaveBeenCalled();
    });

    it('should throw 429 if resending too quickly (within 60s)', async () => {
      const justNow = new Date();
      prisma.pendingUser.findUnique.mockResolvedValue({ id: 'p1', createdAt: justNow });
      await expect(otpService.resendOtp('e')).rejects.toThrow('wait 60 seconds');
    });
  });
});
