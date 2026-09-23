#!/usr/bin/env node
/**
 * E2E test: Gate Pass approval flow (backend API level).
 *
 * Flow covered:
 *   1. Admin login (admin@gmail.com)
 *   2. Create warden + security + mentor accounts (via /api/auth/register)
 *      then login each to verify the role (signup -> login, like the app)
 *      - mentor is registered with dept/year matching the student so the
 *        mentor dashboard can see the student's pass
 *   3. Student login -> apply "Home" gate pass
 *   4. Mentor login (role switch) -> forward pass to admin
 *   5. Admin login (role switch) -> approve forwarded pass
 *   6. Verify pass status === "approved" (admin list + student list)
 *
 * Each role uses a fresh login (logout/login switching), no token reuse
 * across roles — mirroring the emulator test.
 *
 * Configuration (all via environment):
 *   API_BASE          default https://gate-pass-backend-2ccd.onrender.com/api
 *   ADMIN_EMAIL       default admin@gmail.com
 *   ADMIN_PASSWORD    default 123456
 *   STUDENT_EMAIL     default aravind@gmail.com
 *   STUDENT_PASSWORD  default 123456
 *   WARDEN_EMAIL / WARDEN_PASSWORD   defaults warden.e2e@gmail.com / 123456
 *   SECURITY_EMAIL / SECURITY_PASSWORD defaults security.e2e@gmail.com / 123456
 *   MENTOR_EMAIL / MENTOR_PASSWORD   defaults mentor.e2e@gmail.com / 123456
 *
 * Outputs:
 *   - Console log with [e2e] prefixed lines
 *   - test-results/e2e-gatepass-flow.json
 *
 * Exit code: 0 when all steps pass, 1 otherwise.
 *
 * No third-party dependencies — uses Node 18+ built-in fetch/fs.
 */

const fs = require("fs");
const path = require("path");

const RESULTS_DIR = path.join(process.cwd(), "test-results");
const RESULTS_FILE = path.join(RESULTS_DIR, "e2e-gatepass-flow.json");

const config = {
  apiBase:
    process.env.API_BASE || "https://gate-pass-backend-2ccd.onrender.com/api",
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@gmail.com",
    password: process.env.ADMIN_PASSWORD || "123456",
  },
  student: {
    email: process.env.STUDENT_EMAIL || "aravind@gmail.com",
    password: process.env.STUDENT_PASSWORD || "123456",
  },
  warden: {
    email: process.env.WARDEN_EMAIL || "warden.e2e@gmail.com",
    password: process.env.WARDEN_PASSWORD || "123456",
  },
  security: {
    email: process.env.SECURITY_EMAIL || "security.e2e@gmail.com",
    password: process.env.SECURITY_PASSWORD || "123456",
  },
  mentor: {
    email: process.env.MENTOR_EMAIL || "mentor.e2e@gmail.com",
    password: process.env.MENTOR_PASSWORD || "123456",
  },
};

const results = { startedAt: new Date().toISOString(), steps: [] };
let failed = false;

function log(step, ok, detail) {
  const line = `[e2e] ${ok ? "PASS" : "FAIL"} ${step}${
    detail ? ` - ${detail}` : ""
  }`;
  console.log(line);
  results.steps.push({ step, ok, detail: detail || "", at: new Date().toISOString() });
  if (!ok) failed = true;
}

// Render free tier sleeps: retry network errors / 5xx with backoff.
async function api(method, urlPath, { token, body, query } = {}) {
  const url = new URL(config.apiBase + urlPath);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (res.status >= 500 && attempt < 6) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
        continue;
      }
      return { status: res.status, data };
    } catch (err) {
      lastErr = err;
      if (attempt < 6) await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
  throw new Error(`API ${method} ${urlPath} unreachable: ${lastErr?.message}`);
}

async function login(email, password) {
  const { status, data } = await api("POST", "/auth/login", {
    body: { email, password },
  });
  if (status !== 200 || !data?.token) {
    throw new Error(`login failed for ${email}: HTTP ${status} ${JSON.stringify(data)}`);
  }
  return data; // { token, user }
}

// Register a role account. Returns whether it was newly created or
// already existed (verified by message match). Callers must login
// separately to assert the role — signup without login proves nothing.
async function ensureUser({ name, email, password, role, dept, year }) {
  const payload = { name, email, password, role, dept, year };
  const { status, data } = await api("POST", "/auth/register", { body: payload });
  if (status === 200 || status === 201) {
    return { created: true };
  }
  const msg = JSON.stringify(data);
  if (/exist|already|duplicate|taken/i.test(msg)) {
    return { created: false, existed: true };
  }
  throw new Error(`register ${email} failed: HTTP ${status} ${msg}`);
}

function ymdPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function main() {
  // 1. Admin login
  const admin = await login(config.admin.email, config.admin.password);
  log("admin login", admin.user?.role === "admin", `role=${admin.user?.role}`);

  // 2. Create warden / security / mentor
  // Mentor dept+year MUST match the student (ECE / 4) or the mentor
  // dashboard query /mentor/deptyear cannot see the student's pass.
  const toCreate = [
    { name: "E2E Warden", ...config.warden, role: "warden", dept: "ECE", year: "4" },
    { name: "E2E Security", ...config.security, role: "security", dept: "ECE", year: "4" },
    { name: "E2E Mentor", ...config.mentor, role: "mentor", dept: "ECE", year: "4" },
  ];
  for (const u of toCreate) {
    const r = await ensureUser(u);
    // Always login after signup: mirrors the emulator test
    // (register -> login) and asserts the role actually stuck.
    const check = await login(u.email, u.password);
    const roleOk = check.user?.role === u.role;
    log(
      `create ${u.role} (${u.email})`,
      roleOk,
      `${r.created ? "registered" : "already existed"} + login role=${check.user?.role}`
    );
    if (!roleOk) {
      finish();
      return;
    }
  }

  // 3. Student login (fresh login = role switch) + apply Home pass
  const student = await login(config.student.email, config.student.password);
  log("student login", student.user?.role === "student", `role=${student.user?.role}`);

  const passPayload = {
    email: config.student.email,
    date: ymdPlus(1),
    time: "10:00 AM",
    destination: "Home - Chennai",
    reason: "Home",
    reasonForGoingHome: "Family function",
    comingDate: ymdPlus(3),
    parentName: "E2E Parent",
    parentContact: "9876543210",
  };
  const applied = await api("POST", "/gatepass/apply", { body: passPayload });
  if (![200, 201].includes(applied.status)) {
    log("student applies Home gate pass", false, `HTTP ${applied.status} ${JSON.stringify(applied.data)}`);
    finish();
    return;
  }
  const passId =
    applied.data?._id ||
    applied.data?.pass?._id ||
    applied.data?.data?._id ||
    applied.data?.gatePass?._id;
  if (!passId) {
    log("student applies Home gate pass", false, `no _id in ${JSON.stringify(applied.data)}`);
    finish();
    return;
  }
  log("student applies Home gate pass", true, `passId=${passId}`);

  // 4. Mentor login (role switch) -> forward to admin
  const mentor = await login(config.mentor.email, config.mentor.password);
  log("mentor login", mentor.user?.role === "mentor", `role=${mentor.user?.role}`);

  const dept = mentor.user?.dept || "ECE";
  const year = String(mentor.user?.year ?? "4");
  const list = await api("GET", "/mentor/deptyear", {
    token: mentor.token,
    query: { dept, year },
  });
  const visible = Array.isArray(list.data)
    ? list.data.some((p) => p._id === passId)
    : false;
  log("mentor sees student pass", visible, `dept=${dept} year=${year}`);

  const fwd = await api("PUT", `/gatepass/update/${passId}`, {
    token: mentor.token,
    body: { forwarded: true, forwardedAt: new Date() },
  });
  log(
    "mentor forwards pass to admin",
    [200, 201].includes(fwd.status),
    `HTTP ${fwd.status}`
  );

  // 5. Admin login again (role switch) -> approve forwarded pass
  const admin2 = await login(config.admin.email, config.admin.password);
  log("admin re-login (role switch)", admin2.user?.role === "admin");

  const all = await api("GET", "/gatepass/", { token: admin2.token });
  const target = Array.isArray(all.data)
    ? all.data.find((p) => p._id === passId)
    : null;
  log(
    "admin sees forwarded pass",
    !!(target && target.forwarded && target.status === "pending"),
    target ? `forwarded=${target.forwarded} status=${target.status}` : "not found"
  );

  const appr = await api("PUT", `/gatepass/update/${passId}`, {
    token: admin2.token,
    body: {
      status: "approved",
      approvedAt: new Date(),
      approvedBy: "Principal",
      forwarded: false,
    },
  });
  log(
    "admin approves pass",
    [200, 201].includes(appr.status),
    `HTTP ${appr.status}`
  );

  // 6. Verify approved (admin list + student list)
  const verify = await api("GET", "/gatepass/", { token: admin2.token });
  const done = Array.isArray(verify.data)
    ? verify.data.find((p) => p._id === passId)
    : null;
  log(
    "verify pass is approved (admin view)",
    done?.status === "approved",
    done ? `status=${done.status}` : "not found"
  );

  const mine = await api("GET", "/gatepass/email", {
    query: { email: config.student.email },
  });
  const mineApproved = Array.isArray(mine.data)
    ? mine.data.some((p) => p._id === passId && p.status === "approved")
    : false;
  log("verify pass is approved (student view)", mineApproved);

  results.passId = passId;
  finish();
}

function finish() {
  results.finishedAt = new Date().toISOString();
  results.passed = !failed;
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`[e2e] ${failed ? "FAILED" : "ALL STEPS PASSED"} - results: ${RESULTS_FILE}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  log("e2e flow", false, err.message);
  finish();
});
