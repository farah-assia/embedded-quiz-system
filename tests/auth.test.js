import { describe, it } from 'node:test';
import assert from 'node:assert';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Authentication & Security Utilities', () => {
    const testSecret = 'test_jwt_secret_key_123456789012345';

    it('should correctly hash and verify passwords using bcrypt', async () => {
        const plainPassword = 'SuperSecretPassword!';
        const hash = await bcryptjs.hash(plainPassword, 10);

        assert.notStrictEqual(hash, plainPassword);
        const isMatch = await bcryptjs.compare(plainPassword, hash);
        assert.strictEqual(isMatch, true);

        const isWrong = await bcryptjs.compare('WrongPassword', hash);
        assert.strictEqual(isWrong, false);
    });

    it('should sign and verify valid JWT access tokens', () => {
        const payload = { id: 42, email: 'teacher@uni.edu', role: 'teacher' };
        const token = jwt.sign(payload, testSecret, { expiresIn: '1h' });

        assert.strictEqual(typeof token, 'string');
        const decoded = jwt.verify(token, testSecret);

        assert.strictEqual(decoded.id, 42);
        assert.strictEqual(decoded.email, 'teacher@uni.edu');
        assert.strictEqual(decoded.role, 'teacher');
    });

    it('should reject tampered or invalid JWT tokens', () => {
        const validToken = jwt.sign({ id: 1 }, testSecret);
        const tamperedToken = validToken + 'invalid';

        assert.throws(() => {
            jwt.verify(tamperedToken, testSecret);
        });
    });
});
