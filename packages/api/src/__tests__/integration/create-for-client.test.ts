import request from "supertest";
import app from "../../app";
import { testPrisma, TEST_IDS, clinicianAuthHeader, participantAuthHeader } from "./setup";

describe("POST /api/programs/for-client (integration)", () => {
  const createdProgramIds: string[] = [];
  let clientUserId: string;

  beforeAll(async () => {
    // Create a ClinicianClient relationship for the test participant
    const existing = await testPrisma.clinicianClient.findFirst({
      where: {
        clinicianId: TEST_IDS.clinicianProfileId,
        clientId: TEST_IDS.participantUserId,
      },
    });
    if (!existing) {
      await testPrisma.clinicianClient.create({
        data: {
          clinicianId: TEST_IDS.clinicianProfileId,
          clientId: TEST_IDS.participantUserId,
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      });
    }
    clientUserId = TEST_IDS.participantUserId;
  });

  afterAll(async () => {
    for (const id of createdProgramIds) {
      await testPrisma.enrollment.deleteMany({ where: { programId: id } });
      await testPrisma.module.deleteMany({ where: { programId: id } });
      await testPrisma.program.delete({ where: { id } }).catch(() => {});
    }
    await testPrisma.clinicianClient.deleteMany({
      where: {
        clinicianId: TEST_IDS.clinicianProfileId,
        clientId: TEST_IDS.participantUserId,
      },
    });
  });

  it("creates program, module, and enrollment in one transaction", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...clinicianAuthHeader())
      .send({ title: "Custom Client Program", clientId: clientUserId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const programId = res.body.data.program.id;
    createdProgramIds.push(programId);

    // Verify program
    const program = await testPrisma.program.findUnique({ where: { id: programId } });
    expect(program).not.toBeNull();
    expect(program!.title).toBe("Custom Client Program");
    expect(program!.isTemplate).toBe(false);
    expect(program!.status).toBe("PUBLISHED");
    expect(program!.templateSourceId).toBe(programId); // self-referencing

    // Verify module
    const modules = await testPrisma.module.findMany({ where: { programId } });
    expect(modules).toHaveLength(1);
    expect(modules[0].title).toBe("Module 1");
    expect(modules[0].sortOrder).toBe(0);

    // Verify enrollment
    const enrollment = await testPrisma.enrollment.findFirst({ where: { programId } });
    expect(enrollment).not.toBeNull();
    expect(enrollment!.status).toBe("ACTIVE");
    expect(enrollment!.participantId).toBe(TEST_IDS.participantProfileId);
  });

  it("generates audit log entries", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...clinicianAuthHeader())
      .send({ title: "Audit Test Program", clientId: clientUserId });

    expect(res.status).toBe(201);
    const programId = res.body.data.program.id;
    createdProgramIds.push(programId);

    // Check audit logs for this program
    const auditLogs = await testPrisma.auditLog.findMany({
      where: { resourceId: programId },
      orderBy: { timestamp: "asc" },
    });

    // Should have at least: Program CREATE, Program UPDATE (templateSourceId)
    const actions = auditLogs.map((l: any) => l.action);
    expect(actions).toContain("CREATE");
    expect(actions).toContain("UPDATE");
  });

  it("returns 403 for non-client user", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...clinicianAuthHeader())
      .send({ title: "Should Fail", clientId: "nonexistent-user" });

    expect(res.status).toBe(403);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .send({ title: "No Auth", clientId: clientUserId });

    expect(res.status).toBe(401);
  });

  it("returns 403 for participant role", async () => {
    const res = await request(app)
      .post("/api/programs/for-client")
      .set(...participantAuthHeader())
      .send({ title: "Wrong Role", clientId: clientUserId });

    expect(res.status).toBe(403);
  });

  it("program appears in client-programs list", async () => {
    const createRes = await request(app)
      .post("/api/programs/for-client")
      .set(...clinicianAuthHeader())
      .send({ title: "Visible in Client Programs", clientId: clientUserId });

    expect(createRes.status).toBe(201);
    createdProgramIds.push(createRes.body.data.program.id);

    const listRes = await request(app)
      .get("/api/programs/client-programs")
      .set(...clinicianAuthHeader());

    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((p: any) => p.id === createRes.body.data.program.id);
    expect(found).toBeDefined();
    expect(found.title).toBe("Visible in Client Programs");
  });

  it("program does NOT appear in My Programs list", async () => {
    const createRes = await request(app)
      .post("/api/programs/for-client")
      .set(...clinicianAuthHeader())
      .send({ title: "Hidden from My Programs", clientId: clientUserId });

    expect(createRes.status).toBe(201);
    createdProgramIds.push(createRes.body.data.program.id);

    const listRes = await request(app)
      .get("/api/programs")
      .set(...clinicianAuthHeader());

    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((p: any) => p.id === createRes.body.data.program.id);
    expect(found).toBeUndefined();
  });
});
