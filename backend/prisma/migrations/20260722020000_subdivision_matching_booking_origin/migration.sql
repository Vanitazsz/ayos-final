CREATE TABLE "subdivisions" (
  "id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "center_lat" DECIMAL(10,7) NOT NULL,
  "center_lng" DECIMAL(10,7) NOT NULL,
  "radius_meters" INTEGER NOT NULL DEFAULT 2000,
  "boundary" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "subdivisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subdivisions_name_key" ON "subdivisions"("name");
CREATE INDEX "subdivisions_is_active_name_idx" ON "subdivisions"("is_active", "name");

ALTER TABLE "profiles" ADD COLUMN "subdivision_id" UUID;
ALTER TABLE "worker_profiles" ADD COLUMN "recommendation_priority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "worker_profiles" ADD COLUMN "subdivision_id" UUID;
ALTER TABLE "service_requests" ADD COLUMN "subdivision_id" UUID;
ALTER TABLE "bookings" ADD COLUMN "worker_start_lat" DECIMAL(10,7);
ALTER TABLE "bookings" ADD COLUMN "worker_start_lng" DECIMAL(10,7);

CREATE INDEX "worker_profiles_subdivision_id_verification_status_availability_status_idx"
  ON "worker_profiles"("subdivision_id", "verification_status", "availability_status");
CREATE INDEX "service_requests_subdivision_id_status_idx"
  ON "service_requests"("subdivision_id", "status");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_subdivision_id_fkey"
  FOREIGN KEY ("subdivision_id") REFERENCES "subdivisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_subdivision_id_fkey"
  FOREIGN KEY ("subdivision_id") REFERENCES "subdivisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_subdivision_id_fkey"
  FOREIGN KEY ("subdivision_id") REFERENCES "subdivisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "platform_settings" ("id", "key", "value", "schema_version", "updated_at")
VALUES (
  gen_random_uuid(),
  'matching.weights',
  '{"distance":0.30,"availability":0.20,"rating":0.20,"completedJobs":0.10,"responseHistory":0.10,"cancellationHistory":0.05,"recommendationPriority":0.05}'::jsonb,
  1,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
