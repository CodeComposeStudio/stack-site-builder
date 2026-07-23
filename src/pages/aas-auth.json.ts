import type { APIRoute } from 'astro';
import { privateClientData } from '../lib/private';

/**
 * The site's login user table (salted id hashes + per-user wrapped keys —
 * the same data every private page already embeds in its gate payload, so
 * this exposes nothing new). Powers the header login control on sites with
 * private content; sites without the AAS_PRIVATE_* env render
 * `{ enabled: false }` and the control stays hidden.
 */
export const GET: APIRoute = () => {
  try {
    const data = privateClientData();
    return new Response(JSON.stringify({ enabled: true, ...data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ enabled: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
