import test from "node:test";
import assert from "node:assert/strict";
import {
  getUserRoles,
  hasAnyRole,
  isAdminRole,
  selectPrimaryRole,
  validateAdminRoleCombination,
  canPerformAction,
} from "../utils/rbac.js";

test("multi-role users inherit access from any assigned role", () => {
  const user = { role: "DISBURSED", roles: ["LOAN_OPERATIONS", "DISBURSED", "PAYMENT_VERIFIER", "REPORTING_MIS"] };
  assert.equal(hasAnyRole(user, ["PAYMENT_VERIFIER"]), true);
  assert.equal(hasAnyRole(user, ["AUDITOR"]), false);
  assert.equal(isAdminRole(user), true);
});

test("primary role remains deterministic for backwards compatibility", () => {
  assert.equal(selectPrimaryRole(["REPORTING_MIS", "VERIFIER", "CUSTOMER_SERVICE"]), "VERIFIER");
  assert.equal(selectPrimaryRole(["AUTHORIZED", "SUPER_ADMIN"]), "SUPER_ADMIN");
});

test("auditor cannot be combined with operational roles", () => {
  const invalid = validateAdminRoleCombination(["APPROVAL", "AUDITOR"]);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "AUDITOR_ROLE_CONFLICT");
  const valid = validateAdminRoleCombination(["AUDITOR", "REPORTING_MIS"]);
  assert.equal(valid.ok, true);
});

test("workflow permissions evaluate all roles", () => {
  const user = { roles: ["CUSTOMER_SERVICE", "AUTHORIZED"] };
  assert.equal(canPerformAction(user, "AUTHORIZED"), true);
  assert.equal(canPerformAction(user, "APPROVED"), false);
});

test("customer role is not an admin role", () => {
  assert.deepEqual(getUserRoles({ role: "user", roles: [] }), ["user"]);
  assert.equal(isAdminRole({ role: "user" }), false);
});
