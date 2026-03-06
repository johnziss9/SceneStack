import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['Cookie'];
    }

    // Remove sensitive query params
    if (event.request?.query_string) {
      const params = new URLSearchParams(event.request.query_string);
      params.delete('token');
      params.delete('password');
      event.request.query_string = params.toString();
    }

    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
