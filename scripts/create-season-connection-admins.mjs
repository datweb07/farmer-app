import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const usernames = ["AnhTuan", "MinhChau", "DinhQuang", "BachDuong", "DuongNghi"];

function readProjectUrl() {
  const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const line = envText.split(/\r?\n/).find((item) => /^\s*VITE_SUPABASE_URL\s*=/.test(item));
  const value = line?.split("=").slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
  if (!value || value.includes("your-project-id")) throw new Error("Không tìm thấy VITE_SUPABASE_URL hợp lệ trong .env.");
  return value;
}

function readHidden(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Hãy chạy script trong terminal tương tác để nhập bí mật không hiện ký tự.");
  }
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(`${label}: `);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = (error) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") return finish(new Error("Đã hủy."));
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const serviceRoleKey = await readHidden("Supabase service_role key");
  const password = await readHidden("Mật khẩu dùng chung");
  if (!serviceRoleKey || !password) throw new Error("Service-role key và mật khẩu không được để trống.");

  if (serviceRoleKey.startsWith("sb_publishable_") || serviceRoleKey.startsWith("eyJ")) {
    try {
      const payload = serviceRoleKey.startsWith("eyJ")
        ? JSON.parse(Buffer.from(serviceRoleKey.split(".")[1], "base64url").toString("utf8"))
        : null;
      if (serviceRoleKey.startsWith("sb_publishable_") || payload?.role !== "service_role") {
        throw new Error("Đây không phải service_role key.");
      }
    } catch {
      throw new Error("Key không hợp lệ hoặc không phải service_role key. Không dùng anon/publishable key.");
    }
  }

  const supabase = createClient(readProjectUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const username of usernames) {
    const email = `${username.toLowerCase()}@example.com`;
    const { data: existingAuthId, error: lookupError } = await supabase.rpc(
      "find_season_admin_auth_user",
      { p_username: username },
    );
    if (lookupError) {
      throw new Error(`Không tra được tài khoản Auth ${username}. Hãy chạy migration 049_season_admin_auth_lookup.sql trước; đồng thời kiểm tra service_role key và VITE_SUPABASE_URL cùng project. ${lookupError.message}`);
    }

    let authUser;
    let resultLabel = "đã tạo";

    if (existingAuthId) {
      resultLabel = "đã khôi phục/cập nhật mật khẩu và quyền";
      const { data, error } = await supabase.auth.admin.updateUserById(existingAuthId, {
        password,
        email_confirm: true,
        user_metadata: { username, role: "farmer" },
      });
      if (error) throw new Error(`Không cập nhật được tài khoản ${username}: ${error.message}`);
      authUser = data.user;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, role: "farmer" },
      });
      if (error) {
        throw new Error(`Không tạo được ${username}: ${error.message}. Nếu tài khoản đã tồn tại trong Auth nhưng chưa có profile, hãy xử lý tài khoản đó trong Supabase trước.`);
      }
      authUser = data.user;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authUser.id,
      username,
      role: "farmer",
      is_admin: false,
      can_manage_season_connections: true,
    }, { onConflict: "id" });
    if (profileError) throw new Error(`Không thể tạo/khôi phục profile ${username}: ${profileError.message}`);
    process.stdout.write(`${username}: ${resultLabel}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Không thể tạo tài khoản: ${error.message}\n`);
  process.exitCode = 1;
});
