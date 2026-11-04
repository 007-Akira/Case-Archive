// Uses only public credentials and two already-provisioned disposable test accounts.
// node --env-file=.env.test supabase/tests/isolation.mjs
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const {
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
  TEST_A_EMAIL,
  TEST_A_PASSWORD,
  TEST_B_EMAIL,
  TEST_B_PASSWORD,
} = process.env;
if (
  ![
    url,
    key,
    TEST_A_EMAIL,
    TEST_A_PASSWORD,
    TEST_B_EMAIL,
    TEST_B_PASSWORD,
  ].every(Boolean)
)
  throw new Error(
    "Configure URL, public key and TEST_A/TEST_B_EMAIL/PASSWORD in an ignored .env.test",
  );
const a = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const b = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function login(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  assert.ifError(error);
  return data.user.id;
}
const aid = await login(a, TEST_A_EMAIL, TEST_A_PASSWORD),
  bid = await login(b, TEST_B_EMAIL, TEST_B_PASSWORD);
assert.notEqual(aid, bid, "Two distinct users required");
const ids = [];
try {
  const id = crypto.randomUUID();
  ids.push(id);
  const create = await b
    .from("cases")
    .insert({ id, user_id: bid, patient_alias: "RLS TEST" })
    .select()
    .single();
  assert.ifError(create.error);
  assert.equal(create.data.status, "draft");
  const read = await a.from("cases").select("*").eq("id", id);
  assert.ifError(read.error);
  assert.equal(read.data.length, 0, "A cannot read B");
  for (const action of ["update", "delete"]) {
    const q =
      action === "update"
        ? a.from("cases").update({ patient_alias: "forbidden" })
        : a.from("cases").delete();
    const result = await q.eq("id", id).select();
    assert.ifError(result.error);
    assert.equal(result.data.length, 0, `A cannot ${action} B`);
  }
  const forged = await a
    .from("cases")
    .insert({ user_id: bid, patient_alias: "forged" });
  assert.ok(forged.error, "A cannot insert for B");
  const transfer = await b.from("cases").update({ user_id: aid }).eq("id", id);
  assert.ok(transfer.error, "Owner cannot transfer ownership");
  const profile = await a.from("profiles").select("*").eq("id", bid);
  assert.ifError(profile.error);
  assert.equal(profile.data.length, 0, "Profile isolation");
  const counter = await a.from("case_counters").select("*");
  assert.ok(counter.error, "Counters are not client accessible");
  const stored = await b.from("cases").select("*").eq("id", id).single();
  assert.ifError(stored.error);
  assert.equal(stored.data.patient_alias, "RLS TEST");
  const concurrent = await Promise.all(
    Array.from({ length: 5 }, async () => {
      const cid = crypto.randomUUID();
      ids.push(cid);
      const result = await b
        .from("cases")
        .insert({ id: cid, user_id: bid })
        .select("case_number")
        .single();
      assert.ifError(result.error);
      return result.data.case_number;
    }),
  );
  assert.equal(new Set(concurrent).size, 5, "Concurrent numbers unique");
  const retry = await b
    .from("cases")
    .upsert({ id, user_id: bid, patient_alias: "retry" })
    .select("case_number")
    .single();
  assert.ifError(retry.error);
  assert.equal(
    retry.data.case_number,
    create.data.case_number,
    "Idempotent retries preserve number",
  );
  const incomplete = await b
    .from("cases")
    .update({ status: "completed" })
    .eq("id", id);
  assert.ok(incomplete.error, "Incomplete completion rejected");
  console.log(
    "PASS: read/update/delete/insert isolation, immutable ownership, profiles, private counters, concurrent numbering, idempotent retry, completion constraint",
  );
} finally {
  const result = await b.from("cases").delete().in("id", ids);
  assert.ifError(result.error);
  await Promise.all([
    a.auth.signOut({ scope: "local" }),
    b.auth.signOut({ scope: "local" }),
  ]);
}
