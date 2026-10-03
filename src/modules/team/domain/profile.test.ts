import assert from "node:assert/strict";
import { test } from "node:test";
import { fallbackDisplayName, initialsOf, isProfileInputError, normalizeProfileFields, sortPeople } from "./profile";

test("initials: two words give two letters, one word gives up to two, empty gives a placeholder", () => {
  assert.equal(initialsOf("Ana María Pérez"), "AM");
  assert.equal(initialsOf("luis"), "LU");
  assert.equal(initialsOf("  éva   gómez "), "ÉG");
  assert.equal(initialsOf("   "), "?");
});

test("fallbackDisplayName uses the start of the email", () => {
  assert.equal(fallbackDisplayName("ana.perez@example.test"), "ana.perez");
  assert.equal(fallbackDisplayName("@example.test"), "Sin nombre");
});

test("normalizeProfileFields trims, collapses spaces and treats an empty job title as none", () => {
  assert.deepEqual(normalizeProfileFields({ displayName: "  Ana   Pérez ", jobTitle: "  " }), { displayName: "Ana Pérez", jobTitle: null });
  assert.deepEqual(normalizeProfileFields({ displayName: "Luis", jobTitle: " Desarrollador  backend " }), {
    displayName: "Luis",
    jobTitle: "Desarrollador backend",
  });
});

test("normalizeProfileFields rejects empty and over-long values", () => {
  const empty = normalizeProfileFields({ displayName: "   " });
  assert.ok(isProfileInputError(empty) && empty.kind === "display_name_required");
  const longName = normalizeProfileFields({ displayName: "x".repeat(81) });
  assert.ok(isProfileInputError(longName) && longName.kind === "display_name_too_long");
  const longTitle = normalizeProfileFields({ displayName: "Ana", jobTitle: "y".repeat(81) });
  assert.ok(isProfileInputError(longTitle) && longTitle.kind === "job_title_too_long");
  assert.ok(!isProfileInputError(normalizeProfileFields({ displayName: "x".repeat(80) })));
});

test("sortPeople orders by name, Spanish collation", () => {
  const people = sortPeople([
    { userId: "3", displayName: "Zoe", jobTitle: null },
    { userId: "1", displayName: "Álvaro", jobTitle: null },
    { userId: "2", displayName: "Beatriz", jobTitle: null },
  ]);
  assert.deepEqual(people.map((p) => p.displayName), ["Álvaro", "Beatriz", "Zoe"]);
});
