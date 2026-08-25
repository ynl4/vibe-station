/**
 * Access Token authentication middleware.
 * All /api/* routes require a valid Bearer token, except:
 *   - /api/github-stats (public)
 *   - /api/llm-model/* (public model file proxy for WebLLM)
 *
 * Token is configured via ACCESS_TOKEN env variable.
 */
export default defineEventHandler((event) => {
  const path = getRequestPath(event);

  // Only protect /api/* routes
  if (!path.startsWith('/api/')) return;

  // Public routes (no auth required)
  if (path === '/api/github-stats') return;
  if (path.startsWith('/api/llm-model/')) return;

  // Allow preflight requests
  if (event.method === 'OPTIONS') return;

  const token = useRuntimeConfig(event).public.accessToken;
  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error: ACCESS_TOKEN not set',
    });
  }

  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Use: Bearer <token>',
    });
  }

  const providedToken = authHeader.slice(7);
  if (providedToken !== token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid access token',
    });
  }
});
