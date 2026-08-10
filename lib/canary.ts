const encoder = new TextEncoder();

export const CANARY_HEADER = "x-mise-canary-token";

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hasCanaryAccess(request: Request) {
  const expected = process.env.CANARY_ACCESS_TOKEN;
  const supplied = request.headers.get(CANARY_HEADER);
  if (!expected || expected.length < 32 || !supplied) return false;

  const [expectedDigest, suppliedDigest] = await Promise.all([
    digest(expected),
    digest(supplied),
  ]);
  let mismatch = 0;
  for (let index = 0; index < expectedDigest.length; index += 1) {
    mismatch |= expectedDigest[index] ^ suppliedDigest[index];
  }
  return mismatch === 0;
}
