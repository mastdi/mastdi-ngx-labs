import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SecureStorage {
  // https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2
  // PBKDF2-HMAC-SHA256: 600,000 iterations
  private readonly ITERATIONS = 600000;
  private readonly ENCODER = new TextEncoder();
  private readonly DECODER = new TextDecoder();

  /**
   * Encrypts a plain text secret using a master password.
   * Returns a self-contained, base64-encoded encrypted payload string.
   */
  async encryptSecret(secret: string, password: string): Promise<string> {
    // Force the underlying buffer type to strictly be standard ArrayBuffer
    const salt = window.crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
    const iv = window.crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>;

    const aesKey = await this.deriveKey(password, salt, ['encrypt']);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      this.ENCODER.encode(secret),
    );

    return this.packPayload(salt, iv, new Uint8Array(encryptedBuffer));
  }

  /**
   * Decrypts a base64-encoded payload string using the master password.
   */
  async decryptSecret(packedPayload: string, password: string): Promise<string> {
    try {
      const { salt, iv, ciphertext } = this.unpackPayload(packedPayload);
      const aesKey = await this.deriveKey(password, salt, ['decrypt']);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        aesKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ciphertext as any,
      );

      return this.DECODER.decode(decryptedBuffer);
    } catch {
      throw new Error('Decryption failed. Invalid master password or corrupted data.');
    }
  }

  /**
   * Key Stretching via PBKDF2
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    usage: 'encrypt'[] | 'decrypt'[],
  ): Promise<CryptoKey> {
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      this.ENCODER.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      usage,
    );
  }

  // --- Binary-to-Base64 Serialization Helpers ---

  private packPayload(
    salt: Uint8Array<ArrayBuffer>,
    iv: Uint8Array<ArrayBuffer>,
    ciphertext: Uint8Array,
  ): string {
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(ciphertext, salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  private unpackPayload(packed: string): {
    salt: Uint8Array<ArrayBuffer>;
    iv: Uint8Array<ArrayBuffer>;
    ciphertext: Uint8Array;
  } {
    const binaryString = atob(packed);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Explicitly slicing and asserting as standard non-shared ArrayBuffer views
    return {
      salt: bytes.slice(0, 16) as Uint8Array<ArrayBuffer>,
      iv: bytes.slice(16, 28) as Uint8Array<ArrayBuffer>,
      ciphertext: bytes.slice(28),
    };
  }
}
