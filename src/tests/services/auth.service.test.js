import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    pendingUser: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    session: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    passwordReset: { findFirst: jest.fn(), deleteMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (cb) => {
      const pm = (await import('../../prisma/client.js')).default;
      if (Array.isArray(cb)) return Promise.all(cb);
      return await cb(pm);
    })
  }
}));

jest.unstable_mockModule('../../helpers/password.helper.js', () => ({
  hashPassword: jest.fn(val => Promise.resolve(`hashed_${val}`)),
  comparePassword: jest.fn((plain, hashed) => Promise.resolve(`hashed_${plain}` === hashed)),
}));

jest.unstable_mockModule('../../helpers/otp.helper.js', () => ({
  generateOtp: jest.fn(() => '123456'),
  getOtpExpiry: jest.fn(() => new Date(Date.now() + 15 * 60 * 1000)),
}));

jest.unstable_mockModule('../../services/email.service.js', () => ({
  sendOtpEmail: jest.fn(() => Promise.resolve()),
  sendWelcomeEmail: jest.fn(() => Promise.resolve()),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
}));

const authService = await import('../../services/auth.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('AuthService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser()', () => {
    it('should stage a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.pendingUser.upsert.mockResolvedValue({ email: 't@e.com', name: 'T' });
      const result = await authService.registerUser({ name: 'T', email: 't@e.com', password: 'p123' });
      expect(result.email).toBe('t@e.com');
    });

    it('should throw for existing email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(authService.registerUser({ email: 'e' })).rejects.toThrow('exists');
    });

    it('should throw for invalid roles', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(authService.registerUser({ email: 'e', role: 'INVALID' })).rejects.toThrow('Invalid role');
    });
  });

  describe('loginUser()', () => {
    it('should login active user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', password: 'hashed_p123', status: 'ACTIVE', role: 'CLIENT' });
      prisma.session.create.mockResolvedValue({ token: 's1', expiresAt: new Date() });
      const res = await authService.loginUser({ email: 'e', password: 'p123' });
      expect(typeof res.sessionToken).toBe('string');
    });

    it('should block suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue({ status: 'SUSPENDED' });
      await expect(authService.loginUser({ email: 'e', password: 'p' })).rejects.toThrow('suspended');
    });

    it('should throw if user is only in pending table', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.pendingUser.findUnique.mockResolvedValue({ email: 'e' });
      await expect(authService.loginUser({ email: 'e', password: 'p' })).rejects.toThrow('verify your email');
    });
  });

  describe('logoutUser()', () => {
    it('should delete sessions for the provided token', async () => {
      await authService.logoutUser('token123');
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'token123' } });
    });
  });

  describe('forgotPassword()', () => {
    it('should send reset code if user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Tester' });
      const res = await authService.forgotPassword('test@e.com');
      expect(prisma.passwordReset.create).toHaveBeenCalled();
    });

    it('should return ambiguous message for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await authService.forgotPassword('fake@e.com');
      expect(res.message).toContain('If an account exists');
    });
  });

  describe('verifyResetCode()', () => {
    it('should mark reset request as verified on match', async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({ id: 'r1', code: 'hashed_123456' });
      const res = await authService.verifyResetCode('e@e.com', '123456');
      expect(prisma.passwordReset.update).toHaveBeenCalledWith(expect.objectContaining({ data: { verified: true } }));
    });

    it('should throw for invalid code', async () => {
      prisma.passwordReset.findFirst.mockResolvedValue({ id: 'r1', code: 'hashed_right' });
      await expect(authService.verifyResetCode('e', 'wrong')).rejects.toThrow('Invalid');
    });
  });
});
