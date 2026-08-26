import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readEnvironment() {
  const contents = await readFile(new URL("../.env", import.meta.url), "utf8");
  const values = new Map();

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);

    if (match) {
      values.set(match[1], match[2].trim());
    }
  }

  return values;
}

async function request(path, options = {}) {
  const headers = new Headers({ Accept: "application/json" });

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let body;

  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (options.expectedStatus) {
    assert(
      response.status === options.expectedStatus,
      `${options.method ?? "GET"} ${path}: ${response.status} beklenmiyordu.`,
    );
  } else if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${path}: ${response.status} ${text}`,
    );
  }

  return data;
}

function logStep(message) {
  console.log(`✓ ${message}`);
}

const env = await readEnvironment();
const smtpUser = env.get("SMTP_USER");

assert(smtpUser?.endsWith("@gmail.com"), "SMTP_USER geçerli bir Gmail adresi olmalı.");

const [localPart, domain] = smtpUser.split("@");
const runId = Date.now();
const email = `${localPart}+taskflow-smoke-${runId}@${domain}`;
const password = `Smoke-${randomUUID()}-A1`;
let accessToken;
let refreshToken;
let workspaceId;

try {
  const registeredUser = await request("/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      name: "Smoke",
      surname: "Test",
    },
  });
  assert(registeredUser?.id, "Kayıt cevabında kullanıcı kimliği yok.");
  logStep("Kullanıcı kaydı");

  const login = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  accessToken = login?.access_token;
  refreshToken = login?.refresh_token;
  assert(accessToken && refreshToken, "Giriş cevabında token çifti yok.");
  logStep("Giriş ve access/refresh token üretimi");

  const profile = await request("/auth/profile", { token: accessToken });
  assert(profile?.email === email, "Profil e-postası test kullanıcısıyla eşleşmiyor.");
  logStep("Korumalı profil endpointi");

  const workspace = await request("/workspaces", {
    method: "POST",
    token: accessToken,
    body: {
      name: `Smoke Workspace ${runId}`,
      description: "Otomatik üretim smoke testi",
    },
  });
  workspaceId = workspace?.id;
  assert(workspaceId && workspace.role === "owner", "Workspace oluşturulamadı.");
  logStep("Workspace oluşturma ve owner rolü");

  const workspaces = await request("/workspaces", { token: accessToken });
  assert(
    Array.isArray(workspaces) && workspaces.some((item) => item.id === workspaceId),
    "Workspace liste sonucunda bulunamadı.",
  );
  logStep("Workspace listeleme");

  const project = await request(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    token: accessToken,
    body: {
      name: `Smoke Project ${runId}`,
      description: "Otomatik smoke testi projesi",
      status: "active",
    },
  });
  assert(project?.id, "Proje oluşturulamadı.");
  logStep("Proje oluşturma");

  const projectList = await request(`/workspaces/${workspaceId}/projects`, {
    token: accessToken,
  });
  assert(
    projectList?.data?.some((item) => item.id === project.id),
    "Proje liste sonucunda bulunamadı.",
  );
  logStep("Proje listeleme ve sayfalama cevabı");

  const task = await request(`/projects/${project.id}/tasks`, {
    method: "POST",
    token: accessToken,
    body: {
      title: `Smoke Task ${runId}`,
      description: "Otomatik smoke testi görevi",
      status: "todo",
      priority: "high",
      assignedTo: registeredUser.id,
    },
  });
  assert(task?.id && task.assignedTo === registeredUser.id, "Görev oluşturulamadı.");
  logStep("Görev oluşturma ve kullanıcıya atama");

  const updatedTask = await request(`/tasks/${task.id}`, {
    method: "PATCH",
    token: accessToken,
    body: { status: "in_progress" },
  });
  assert(updatedTask?.status === "in_progress", "Görev durumu güncellenemedi.");
  logStep("Görev/Kanban durumu güncelleme");

  const comment = await request(`/tasks/${task.id}/comments`, {
    method: "POST",
    token: accessToken,
    body: { content: "Smoke test yorumu" },
  });
  assert(comment?.id, "Yorum oluşturulamadı.");

  const updatedComment = await request(`/comments/${comment.id}`, {
    method: "PATCH",
    token: accessToken,
    body: { content: "Güncellenmiş smoke test yorumu" },
  });
  assert(updatedComment?.content.startsWith("Güncellenmiş"), "Yorum güncellenemedi.");
  logStep("Yorum oluşturma ve güncelleme");

  const attachmentForm = new FormData();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  attachmentForm.append("file", new Blob([png], { type: "image/png" }), "smoke.png");
  const attachment = await request(`/tasks/${task.id}/attachments`, {
    method: "POST",
    token: accessToken,
    form: attachmentForm,
  });
  assert(attachment?.id, "Attachment yüklenemedi.");

  const attachments = await request(`/tasks/${task.id}/attachments`, {
    token: accessToken,
  });
  assert(
    Array.isArray(attachments) && attachments.some((item) => item.id === attachment.id),
    "Attachment liste sonucunda bulunamadı.",
  );
  await request(`/attachments/${attachment.id}`, {
    method: "DELETE",
    token: accessToken,
  });
  logStep("Dosya yükleme, listeleme ve silme");

  const csvForm = new FormData();
  const csv = [
    "title,description,status,priority,due_date,assigned_email",
    "Imported smoke task,Valid row,todo,medium,,",
    "Broken smoke task,Invalid row,wrong_status,medium,,",
  ].join("\n");
  csvForm.append("file", new Blob([csv], { type: "text/csv" }), "smoke.csv");
  const importJob = await request(`/projects/${project.id}/import/upload`, {
    method: "POST",
    token: accessToken,
    form: csvForm,
  });
  assert(importJob?.id, "CSV import işi oluşturulamadı.");

  let importStatus;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    importStatus = await request(`/imports/${importJob.id}/status`, {
      token: accessToken,
    });

    if (["completed", "failed"].includes(importStatus.status)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(importStatus?.status === "completed", "CSV import tamamlanmadı.");
  assert(
    importStatus.successfulRows === 1 && importStatus.failedRows === 1,
    "CSV satır izolasyonu beklenen sonucu vermedi.",
  );
  const failedRows = await request(`/imports/${importJob.id}/failed-rows`, {
    token: accessToken,
  });
  assert(failedRows?.data?.length === 1, "Hatalı CSV satırı raporlanmadı.");
  logStep("CSV import, worker, ilerleme ve hatalı satır izolasyonu");

  const dashboard = await request("/dashboard/summary", { token: accessToken });
  assert(dashboard?.counts?.totalWorkspaces >= 1, "Dashboard özeti üretilemedi.");
  logStep("Dashboard özeti");

  const refreshed = await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  accessToken = refreshed?.access_token;
  refreshToken = refreshed?.refresh_token;
  assert(accessToken && refreshToken, "Token yenileme başarısız.");
  logStep("Refresh token rotasyonu");

  await request("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
  logStep("Şifre sıfırlama e-postasını kuyruğa ekleme");

  await new Promise((resolve) => setTimeout(resolve, 2_000));
} finally {
  if (workspaceId && accessToken) {
    try {
      await request(`/workspaces/${workspaceId}`, {
        method: "DELETE",
        token: accessToken,
      });
      logStep("Smoke workspace temizliği");
    } catch (error) {
      console.error(`Temizlik uyarısı: ${error.message}`);
    }
  }

  if (refreshToken) {
    try {
      await request("/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
      logStep("Oturum kapatma");
    } catch (error) {
      console.error(`Oturum kapatma uyarısı: ${error.message}`);
    }
  }
}

console.log("\nTaskFlow smoke testi başarıyla tamamlandı.");
