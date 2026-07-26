# Push notifications

NUSLink uses Expo Push Service. The mobile app registers an Expo push token after
the user enables device notifications in Profile settings. Supabase stores the
token and enqueues one delivery whenever an in-app notification is created. The
FastAPI lifespan worker sends queued deliveries, retries transient failures, and
checks Expo receipts after 15 minutes.

## Deployment

1. Apply `supabase/migrations/0041_add_push_notifications.sql`.
2. Deploy the FastAPI service with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
3. Leave `PUSH_WORKER_ENABLED=true`. Set `EXPO_PUSH_ACCESS_TOKEN` only if Expo
   push security is enabled for the EAS project.
4. Configure Android FCM V1 and iOS APNs credentials in EAS, then create a new
   development or production build. Remote push is not available in Expo Go on
   Android.

The worker is safe to run on multiple backend replicas because queue claims use
Postgres row locks with `SKIP LOCKED`. Expo push tickets and receipts are kept in
`notification_push_deliveries`; `DeviceNotRegistered` receipts automatically
disable stale device tokens.
