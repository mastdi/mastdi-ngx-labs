import { TestBed } from '@angular/core/testing';

import { SecureStorage } from 'shared-core';

describe('SecureStorage', () => {
  let service: SecureStorage;
  const MASTER_PASSWORD = 'SuperSecureMasterPassword123!';
  const TOP_SECRET_DATA = '{"apiKey": "xyz_987654", "user": "admin"}';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SecureStorage);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Encryption & Decryption Pipeline', () => {
    it('should successfully encrypt and then decrypt a secret back to its original value', async () => {
      // 1. Encrypt the data
      const encryptedPayload = await service.encryptSecret(TOP_SECRET_DATA, MASTER_PASSWORD);

      expect(encryptedPayload).toBeTruthy();
      expect(typeof encryptedPayload).toBe('string');
      expect(encryptedPayload).not.toContain('xyz_987654'); // Verify it is obfuscated

      // 2. Decrypt the data using the matching password
      const decryptedData = await service.decryptSecret(encryptedPayload, MASTER_PASSWORD);

      expect(decryptedData).toEqual(TOP_SECRET_DATA);
    });

    it('should fail decryption if given an incorrect master password', async () => {
      const encryptedPayload = await service.encryptSecret(TOP_SECRET_DATA, MASTER_PASSWORD);
      const wrongPassword = 'WrongPassword456!';

      // Vitest modern promise rejection assertion
      await expect(service.decryptSecret(encryptedPayload, wrongPassword)).rejects.toThrow(
        'Decryption failed. Invalid master password or corrupted data.',
      );
    });

    it('should fail decryption if the stored payload becomes corrupted or tampered with', async () => {
      const encryptedPayload = await service.encryptSecret(TOP_SECRET_DATA, MASTER_PASSWORD);

      // Simulate an attacker modifying a single character of the base64 payload string
      const corruptedPayload = encryptedPayload.substring(0, encryptedPayload.length - 2) + 'zM';

      // AES-GCM integrity failure check via Vitest
      await expect(service.decryptSecret(corruptedPayload, MASTER_PASSWORD)).rejects.toThrow(
        'Decryption failed. Invalid master password or corrupted data.',
      );
    });

    it('should produce completely unique ciphertext payloads for the exact same input (Salt/IV randomization)', async () => {
      const payloadOne = await service.encryptSecret(TOP_SECRET_DATA, MASTER_PASSWORD);
      const payloadTwo = await service.encryptSecret(TOP_SECRET_DATA, MASTER_PASSWORD);

      // Must be unique because new cryptographic salts and IVs are spun up every single run
      expect(payloadOne).not.toEqual(payloadTwo);

      // Yet both should still be cleanly unpackable by the same master key
      const decryptedOne = await service.decryptSecret(payloadOne, MASTER_PASSWORD);
      const decryptedTwo = await service.decryptSecret(payloadTwo, MASTER_PASSWORD);

      expect(decryptedOne).toEqual(TOP_SECRET_DATA);
      expect(decryptedTwo).toEqual(TOP_SECRET_DATA);
    });
  });
});
