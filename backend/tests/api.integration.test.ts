import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/database.js";

const app=createApp();
let customerToken="";let adminToken="";let workerToken="";

beforeAll(async()=>{
  const customer=await request(app).post("/api/v1/auth/login").send({email:"customer@a-yos.local",password:"ChangeMe-Customer-123!"});
  const admin=await request(app).post("/api/v1/auth/login").send({email:"admin@a-yos.local",password:"ChangeMe-Admin-123!"});
  const worker=await request(app).post("/api/v1/auth/login").send({email:"worker@a-yos.local",password:"ChangeMe-Worker-123!"});
  expect(customer.status).toBe(200);expect(admin.status).toBe(200);expect(worker.status).toBe(200);
  customerToken=customer.body.data.accessToken;adminToken=admin.body.data.accessToken;workerToken=worker.body.data.accessToken;
});
afterAll(async()=>{await prisma.$disconnect()});

describe("API contract",()=>{
  it("reports live and database readiness",async()=>{expect((await request(app).get("/health/live")).status).toBe(200);expect((await request(app).get("/health/ready")).status).toBe(200)});
  it("rejects protected routes without a token",async()=>{const r=await request(app).get("/api/v1/users/me");expect(r.status).toBe(401);expect(r.body.success).toBe(false)});
  it("returns the authenticated profile",async()=>{const r=await request(app).get("/api/v1/users/me").set("Authorization",`Bearer ${customerToken}`);expect(r.status).toBe(200);expect(r.body.data.email).toBe("customer@a-yos.local")});
  it("serves catalog data and handles a request draft",async()=>{const categories=await request(app).get("/api/v1/categories");expect(categories.status).toBe(200);const categoryId=categories.body.data.items[0].id;const created=await request(app).post("/api/v1/requests").set("Authorization",`Bearer ${customerToken}`).send({categoryId,description:"Kitchen sink has a persistent leak under the cabinet.",location:{addressText:"Makati City, Metro Manila"}});expect(created.status).toBe(201);expect(created.body.data.status).toBe("DRAFT");const removed=await request(app).delete(`/api/v1/requests/${created.body.data.id}`).set("Authorization",`Bearer ${customerToken}`);expect(removed.status).toBe(204)});
  it("enforces and accepts administrator permissions",async()=>{const forbidden=await request(app).get("/api/v1/admin/dashboard").set("Authorization",`Bearer ${customerToken}`);expect(forbidden.status).toBe(403);const dashboard=await request(app).get("/api/v1/admin/dashboard").set("Authorization",`Bearer ${adminToken}`);expect(dashboard.status).toBe(200);expect(dashboard.body.data.cards).toBeTruthy()});
  it("generates downloadable reports and sends in-app campaigns",async()=>{const report=await request(app).post("/api/v1/admin/reports").set("Authorization",`Bearer ${adminToken}`).send({type:"integration-summary",format:"json"});expect(report.status,JSON.stringify(report.body)).toBe(201);const download=await request(app).get(`/api/v1/admin/reports/${report.body.data.id}/download`).set("Authorization",`Bearer ${adminToken}`);expect(download.status).toBe(200);expect(download.headers["content-type"]).toContain("application/json");const campaign=await request(app).post("/api/v1/admin/campaigns").set("Authorization",`Bearer ${adminToken}`).send({title:"Integration notice",audience:"CUSTOMERS_ONLY",channel:"IN_APP",message:"Automated integration test notification"});expect(campaign.status).toBe(201);const sent=await request(app).post(`/api/v1/admin/campaigns/${campaign.body.data.id}/send`).set("Authorization",`Bearer ${adminToken}`).send({});expect(sent.status).toBe(202);expect(sent.body.data.queued).toBeGreaterThan(0)});
  it("executes the guarded booking, payment, wallet, and review lifecycle",async()=>{
    const provider=(await request(app).get("/api/v1/providers")).body.data.items[0];expect(provider).toBeTruthy();
    const created=await request(app).post("/api/v1/bookings").set("Authorization",`Bearer ${customerToken}`).send({providerId:provider.id,scheduledAt:new Date(Date.now()+86400000).toISOString(),addressText:"Makati City, Metro Manila",notes:"Integration test booking"});expect(created.status).toBe(201);const id=created.body.data.id;
    for(const action of["accept","en_route","arrive","start","complete"]){const changed=await request(app).post(`/api/v1/bookings/${id}/transitions`).set("Authorization",`Bearer ${workerToken}`).send({action});expect(changed.status,`${action}: ${JSON.stringify(changed.body)}`).toBe(200)}
    const completed=await request(app).post(`/api/v1/bookings/${id}/transitions`).set("Authorization",`Bearer ${customerToken}`).send({action:"confirm_completion"});expect(completed.body.data.status).toBe("COMPLETED");
    const payment=await request(app).post("/api/v1/payments").set("Authorization",`Bearer ${customerToken}`).send({bookingId:id,method:"development",idempotencyKey:`test-${id}`});expect(payment.status).toBe(201);const confirmed=await request(app).post(`/api/v1/payments/${payment.body.data.id}/confirm`).set("Authorization",`Bearer ${customerToken}`).send({});expect(confirmed.body.data.status).toBe("COMPLETED");
    const review=await request(app).post("/api/v1/reviews").set("Authorization",`Bearer ${customerToken}`).send({bookingId:id,rating:5,comment:"Lifecycle integration test",recommend:true});expect(review.status).toBe(201);
  });
});
