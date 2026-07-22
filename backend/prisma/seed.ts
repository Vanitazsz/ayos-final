import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, AccountStatus, AvailabilityStatus, EmploymentType, WorkerVerificationStatus } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for seeding");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const permissionCodes = [
  "users:view", "users:manage", "workers:view", "workers:manage", "workers:verify",
  "bookings:view", "bookings:manage", "catalog:view", "catalog:manage",
  "payments:view", "payments:manage", "reviews:view", "reviews:moderate",
  "support:view", "support:manage", "campaigns:view", "campaigns:manage", "campaigns:send",
  "analytics:view", "reports:view", "reports:manage", "audit:view",
  "settings:view", "settings:manage", "recovery:view", "recovery:manage", "recovery:purge"
] as const;

const roleDefinitions: Record<string, string[]> = {
  customer: [],
  worker: [],
  support_agent: ["users:view", "workers:view", "bookings:view", "reviews:view", "support:view", "support:manage"],
  operations_admin: ["users:view", "users:manage", "workers:view", "workers:manage", "workers:verify", "bookings:view", "bookings:manage", "catalog:view", "catalog:manage", "reviews:view", "reviews:moderate", "support:view", "support:manage", "analytics:view", "reports:view"],
  finance_admin: ["users:view", "workers:view", "bookings:view", "payments:view", "payments:manage", "analytics:view", "reports:view", "reports:manage", "audit:view"],
  super_admin: [...permissionCodes]
};

const industrySkills: Record<string, string[]> = {
  plumbing: ["Pipe Repair", "Drain Cleaning", "Water Heater Install", "Faucet Installation", "Leak Detection", "Sewer Line Repair"],
  electrical: ["Wiring Installation", "Circuit Breaker Repair", "Lighting Installation", "Outlet/Switch Install", "Generator Setup"],
  carpentry: ["Furniture Assembly", "Cabinet Installation", "Door/Window Repair", "Deck Building", "Custom Woodwork"],
  hvac: ["AC Installation", "AC Repair", "Duct Cleaning", "Thermostat Install", "Ventilation Service"],
  painting: ["Interior Painting", "Exterior Painting", "Wallpaper Installation", "Surface Preparation", "Decorative Finishes"],
  cleaning: ["Deep Cleaning", "Move-in/Move-out", "Post-Construction", "Window Cleaning", "Pressure Washing"],
  landscaping: ["Lawn Mowing", "Garden Maintenance", "Tree Trimming", "Irrigation Install", "Landscape Design"],
  appliance_repair: ["Refrigerator Repair", "Washing Machine Repair", "Aircon Servicing", "Oven/Range Repair", "TV/Monitor Repair"],
  general_maintenance: ["Home Inspection", "Drywall Repair", "Tile Grouting", "Lock Replacement", "Gutter Cleaning"],
  construction: ["Room Addition", "Flooring Installation", "Roofing Repair", "Concrete Work", "Demolition"]
};

const categoryDefinitions = [
  ["plumbing", "Plumbing", "Wrench", "#1B5E20"],
  ["electrical", "Electrical", "Zap", "#F9A825"],
  ["hvac", "HVAC", "Wind", "#1565C0"],
  ["cleaning", "Cleaning", "Sparkles", "#7B1FA2"],
  ["repair", "Repair", "Hammer", "#E65100"],
  ["painting", "Painting", "Paintbrush", "#C2185B"],
  ["carpentry", "Carpentry", "TreePine", "#33691E"],
  ["more", "More", "Grid2x2", "#616161"]
] as const;

async function upsertUser(email: string, password: string, firstName: string, lastName: string, roleCodes: string[]) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { status: AccountStatus.ACTIVE, passwordHash },
    create: {
      email,
      passwordHash,
      status: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      profile: { create: { firstName, lastName } }
    }
  });

  for (const code of roleCodes) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
  }
  return user;
}

async function main() {
  for (const code of permissionCodes) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }

  for (const [code, permissions] of Object.entries(roleDefinitions)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: code.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()) },
      create: { code, name: code.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()) }
    });
    for (const permissionCode of permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  for (const [code, skillNames] of Object.entries(industrySkills)) {
    const industry = await prisma.industry.upsert({
      where: { code },
      update: { name: code.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()) },
      create: { code, name: code.replaceAll("_", " ").replace(/\b\w/g, (value) => value.toUpperCase()) }
    });
    for (const name of skillNames) {
      const skillCode = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      await prisma.skill.upsert({
        where: { industryId_code: { industryId: industry.id, code: skillCode } },
        update: { name },
        create: { industryId: industry.id, code: skillCode, name }
      });
    }
  }

  for (const [slug, name, icon, color] of categoryDefinitions) {
    await prisma.serviceCategory.upsert({
      where: { slug },
      update: { name, icon, color },
      create: { slug, name, icon, color }
    });
  }

  const serviceSeeds = [
    ["plumbing", "Pipe Repair", 4500, 90], ["plumbing", "Drain Cleaning", 5000, 90],
    ["electrical", "Electrical Inspection", 5500, 120], ["hvac", "AC Repair", 6500, 120],
    ["cleaning", "Deep Cleaning", 3500, 180], ["carpentry", "Furniture Assembly", 4000, 120],
    ["painting", "Interior Painting", 5000, 240], ["repair", "General Repair", 4500, 120]
  ] as const;
  for (const [categorySlug, name, basePrice, durationMinutes] of serviceSeeds) {
    const category = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: categorySlug } });
    const slug = `${categorySlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    await prisma.service.upsert({
      where: { slug },
      update: { name, categoryId: category.id, basePrice, durationMinutes },
      create: { slug, name, categoryId: category.id, basePrice, durationMinutes }
    });
  }

  const settings: Record<string, unknown> = {
    "general.platformName": "A-yos Platform",
    "general.supportEmail": "support@a-yos.local",
    "general.currency": "PHP",
    "general.timezone": "Asia/Manila",
    "booking.cancellationWindowHours": 1,
    "booking.maxAdvanceDays": 90,
    "payments.platformFeeRate": 0.1,
    "worker.activationFee": 29900,
    "recovery.retentionDays": 30
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.platformSetting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  }

  const admin = await upsertUser(process.env.SEED_ADMIN_EMAIL ?? "admin@a-yos.local", process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe-Admin-123!", "Super", "Admin", ["super_admin"]);
  await upsertUser(process.env.SEED_CUSTOMER_EMAIL ?? "customer@a-yos.local", process.env.SEED_CUSTOMER_PASSWORD ?? "ChangeMe-Customer-123!", "Juan", "Dela Cruz", ["customer"]);
  const workerUser = await upsertUser(process.env.SEED_WORKER_EMAIL ?? "worker@a-yos.local", process.env.SEED_WORKER_PASSWORD ?? "ChangeMe-Worker-123!", "Carlos", "Mendez", ["customer", "worker"]);
  const plumbing = await prisma.industry.findUniqueOrThrow({ where: { code: "plumbing" } });
  const worker = await prisma.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      industryId: plumbing.id,
      employmentType: EmploymentType.FREELANCE,
      bio: "Professional plumber specializing in residential repairs and installations.",
      yearsExperience: 12,
      hourlyRate: 4500,
      verificationStatus: WorkerVerificationStatus.APPROVED,
      availabilityStatus: AvailabilityStatus.ONLINE,
      activationFeePaidAt: new Date(),
      submittedAt: new Date(),
      approvedAt: new Date(),
      wallet: { create: { balance: 1845000 } }
    }
  });
  const plumbingSkills = await prisma.skill.findMany({ where: { industryId: plumbing.id }, take: 4 });
  for (const skill of plumbingSkills) {
    await prisma.workerSkill.upsert({
      where: { workerId_skillId: { workerId: worker.id, skillId: skill.id } },
      update: {},
      create: { workerId: worker.id, skillId: skill.id }
    });
  }

  await prisma.auditLog.create({ data: { actorId: admin.id, action: "database.seed", module: "system", outcome: "SUCCESS", metadata: { deterministic: true } } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
