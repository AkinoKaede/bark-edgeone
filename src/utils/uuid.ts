/**
 * Generate a unique device key using crypto.getRandomValues
 * Returns a 22-character base57-encoded string (compatible with shortuuid)
 *
 * shortuuid alphabet (base57): removes similar looking characters
 * "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
 */
export function generateDeviceKey(): string {
  // shortuuid alphabet (base57) - excludes 0, O, I, l, 1 to avoid confusion
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  // Generate 16 random bytes (128 bits) similar to UUID
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Encode to base57 using the alphabet
  // Convert bytes to a large number and encode
  let result = '';
  const base = BigInt(alphabet.length);

  // Convert byte array to BigInt
  let num = BigInt(0);
  for (let i = 0; i < randomBytes.length; i++) {
    num = (num << BigInt(8)) | BigInt(randomBytes[i]);
  }

  // Convert to base57
  // shortuuid typically produces 22 characters
  for (let i = 0; i < 22; i++) {
    const remainder = num % base;
    result = alphabet[Number(remainder)] + result;
    num = num / base;
  }

  return result;
}
