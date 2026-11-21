const { getRevalidateSecret } = require('../utils/security');

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const ALL_TAGS = ['settings', 'branches', 'rooms', 'facilities', 'packages', 'galleries'];

async function revalidateFrontend(tags = ALL_TAGS) {
  const uniqueTags = Array.from(new Set([...ALL_TAGS, ...(Array.isArray(tags) ? tags : [tags])]));
  try {
    await fetch(`${FRONTEND_ORIGIN}/api/revalidate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': getRevalidateSecret(),
      },
      body: JSON.stringify({ tags: uniqueTags }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Abaikan jika server frontend sedang tidak aktif
  }
}

module.exports = { revalidateFrontend };
