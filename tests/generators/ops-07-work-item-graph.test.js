// OPS-07 work-item-graph-with-hidden-link: the tracked graph and the team chat
// module 19 maps, one delivery program exported 2026-03-24.
//
// Nothing here imports the builder's own predicates. The co-mention scan is
// rebuilt from scratch over the raw text of each line, the acyclicity check is a
// depth-first colouring rather than the builder's Kahn walk, and every person is
// re-resolved against the CORE-04 roster. The census is what module 19 grades
// against, so a generator that quietly tracks the hidden pair, or quietly leaves
// a second one loose, has to fail somewhere, and this is where.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { loadSpecs } from "../../datagen/src/specLoader.js";
import { loadCanonCompanies } from "../../datagen/src/canon.js";
import { generateArtifact } from "../../datagen/src/engine.js";
import { fileByPath } from "../helpers/csv-table.js";
import { buildRoster } from "../../datagen/src/generators/core-04-people-roster.js";
import { createRng } from "../../datagen/src/seed.js";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const specs = loadSpecs(join(REPO_ROOT, "specs", "artifact-specs.yaml"));
const canon = loadCanonCompanies(join(REPO_ROOT, "canon", "companies.md"));
const spec = specs.byId.get("OPS-07");

const GRAPH_FILE = "work-items.json";
const CHAT_FILE = "chat-messages.txt";

// Retyped rather than imported, so the spec sentence and the generator can
// disagree in front of this file.
const PROGRAM = "customer portal relaunch";
const EXPORTED_AT = "2026-03-24";
const TARGET_NODES = 16;
const TARGET_EDGES = 14;
const TARGET_MESSAGES = 12;
const FIRST_NODE = 301;
const TEAMS = ["Engineering", "Product", "Operations"];
const STATUSES = ["todo", "in_progress", "blocked"];
const CHAT_WINDOW = { start: "2026-03-18", end: "2026-03-24" };
const DUE_WINDOW = { start: "2026-03-25", end: "2026-05-15" };

const roster = buildRoster(createRng("CORE-04", "roster"));
const rosterById = new Map(roster.map((r) => [r.employee_id, r]));
const rosterByName = new Map();
for (const person of roster) {
  const name = `${person.first_name} ${person.last_name}`;
  rosterByName.set(name, [...(rosterByName.get(name) ?? []), person]);
}

// ------------------------------------------------------- independent helpers

/** This file's own line parser, written against the format the spec states. */
function parseLine(line) {
  const match = /^\[(\d{4}-\d{2}-\d{2}) ([0-2]\d:[0-5]\d)\] ([A-Za-z][^:]*): (.+)$/.exec(line);
  if (!match) return null;
  return { date: match[1], time: match[2], speaker: match[3], text: match[4] };
}

/** Every distinct work item id a piece of text names. This file's own scanner. */
function idsIn(text) {
  const found = new Set();
  for (const match of text.matchAll(/WI-\d{3}/g)) found.add(match[0]);
  return [...found].sort();
}

/** Every unordered pair of distinct ids one message co-mentions, rebuilt here. */
function pairsIn(text) {
  const ids = idsIn(text);
  const pairs = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) pairs.push(`${ids[i]}|${ids[j]}`);
  }
  return pairs;
}

function unorderedKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Depth-first three-colour cycle search, deliberately a different algorithm
 * from the builder's Kahn walk: a graph both of them call acyclic is acyclic.
 */
function findCycle(nodeIds, edges) {
  const outgoing = new Map(nodeIds.map((n) => [n, []]));
  for (const edge of edges) outgoing.get(edge.from).push(edge.to);
  const state = new Map(nodeIds.map((n) => [n, "white"]));
  let cycle = null;
  const walk = (node) => {
    state.set(node, "grey");
    for (const next of outgoing.get(node)) {
      if (state.get(next) === "grey") { cycle = `${node} to ${next}`; return; }
      if (state.get(next) === "white") { walk(next); if (cycle) return; }
    }
    state.set(node, "black");
  };
  for (const node of nodeIds) {
    if (state.get(node) === "white") walk(node);
    if (cycle) break;
  }
  return cycle;
}

/** This file's own reading of the delete-an-edge instruction. */
function tellsTheMapperToDelete(text) {
  return /\bdelete\b/i.test(text) && /\b(link|edge|dependenc(y|ies))\b/i.test(text);
}

function corpus() {
  assert.ok(spec, "OPS-07 not found in specs/artifact-specs.yaml");
  const files = generateArtifact(spec, canon);
  const graph = JSON.parse(fileByPath(files, GRAPH_FILE).content);
  const chat = fileByPath(files, CHAT_FILE).content;
  // Parses counted against raw lines: a message the parser silently dropped
  // would otherwise leave the census looking clean.
  const rawLines = chat.split("\n").filter((line) => line !== "");
  const messages = rawLines.map(parseLine);
  assert.equal(
    messages.filter((m) => m !== null).length, rawLines.length,
    "OPS-07: a chat line does not read as [YYYY-MM-DD HH:MM] First Last: text"
  );
  return { graph, rawLines, messages };
}

// ------------------------------------------------------------------ the shape

test("OPS-07: the export carries its four keys, sixteen items and fourteen edges", () => {
  const { graph } = corpus();
  assert.deepEqual(
    Object.keys(graph).sort(), ["edges", "exported_at", "nodes", "program"],
    "work-items.json does not carry exactly program, exported_at, nodes and edges"
  );
  assert.equal(graph.program, PROGRAM, `the export belongs to "${graph.program}"`);
  assert.equal(graph.exported_at, EXPORTED_AT, `the export is dated ${graph.exported_at}`);
  assert.equal(graph.nodes.length, TARGET_NODES, `the graph carries ${graph.nodes.length} items, expected ${TARGET_NODES}`);
  assert.equal(graph.edges.length, TARGET_EDGES, `the graph carries ${graph.edges.length} edges, expected ${TARGET_EDGES}`);
  for (const [index, node] of graph.nodes.entries()) {
    assert.equal(node.id, `WI-${FIRST_NODE + index}`, "the work item id sequence has a hole in it");
    assert.ok(node.title !== "", `${node.id} has no title`);
    assert.ok(TEAMS.includes(node.team), `${node.id} sits on "${node.team}", not a roster department on this program`);
    assert.ok(STATUSES.includes(node.status), `${node.id} is "${node.status}", not a tracker status`);
    if (node.due_date !== "") {
      assert.ok(
        node.due_date >= DUE_WINDOW.start && node.due_date <= DUE_WINDOW.end,
        `${node.id} is due ${node.due_date}, outside ${DUE_WINDOW.start} to ${DUE_WINDOW.end}`
      );
    }
  }
  for (const team of TEAMS) {
    assert.ok(graph.nodes.some((n) => n.team === team), `${team} owns nothing, so the team field decides nothing`);
  }
  for (const status of STATUSES) {
    assert.ok(graph.nodes.some((n) => n.status === status), `nothing is "${status}"`);
  }
});

test("OPS-07: every owner is an active CORE-04 row of the team its item sits on", () => {
  const { graph } = corpus();
  for (const node of graph.nodes) {
    const person = rosterById.get(node.owner_employee_id);
    assert.ok(person, `${node.id}: ${node.owner_employee_id} is not on the CORE-04 roster`);
    assert.equal(person.employment_status, "active", `${node.id} is owned by a departed employee`);
    assert.equal(
      node.owner_name, `${person.first_name} ${person.last_name}`,
      `${node.id} calls its owner someone the roster does not`
    );
    assert.equal(person.department, node.team, `${node.id} sits on ${node.team} and its owner works in ${person.department}`);
  }
});

test("OPS-07: the tracked graph resolves, carries no pair twice, and is acyclic", () => {
  const { graph } = corpus();
  const ids = graph.nodes.map((n) => n.id);
  const idSet = new Set(ids);
  const seen = new Set();
  for (const edge of graph.edges) {
    assert.equal(edge.type, "depends_on", `the edge ${edge.from} to ${edge.to} is typed "${edge.type}"`);
    assert.ok(idSet.has(edge.from), `${edge.from} is not a work item in this export`);
    assert.ok(idSet.has(edge.to), `${edge.to} is not a work item in this export`);
    assert.notEqual(edge.from, edge.to, `${edge.from} depends on itself`);
    const key = unorderedKey(edge.from, edge.to);
    assert.equal(seen.has(key), false, `the pair ${key} is tracked more than once, in one direction or the other`);
    seen.add(key);
  }
  assert.equal(seen.size, TARGET_EDGES, "the edge list collapses to fewer distinct pairs than it has rows");
  assert.equal(findCycle(ids, graph.edges), null, "the tracked graph carries a cycle");
});

test("OPS-07: twelve chat messages, in the window, from active roster rows on the three teams", () => {
  const { rawLines, messages } = corpus();
  assert.equal(rawLines.length, TARGET_MESSAGES, `the channel carries ${rawLines.length} lines, expected ${TARGET_MESSAGES}`);
  assert.equal(messages.length, TARGET_MESSAGES, "the parsed message count and the raw line census disagree");
  for (const [index, message] of messages.entries()) {
    assert.ok(
      message.date >= CHAT_WINDOW.start && message.date <= CHAT_WINDOW.end,
      `message ${index + 1} is dated ${message.date}, outside ${CHAT_WINDOW.start} to ${CHAT_WINDOW.end}`
    );
    assert.ok(message.date <= EXPORTED_AT, `message ${index + 1} was sent after the graph was exported`);
    const candidates = rosterByName.get(message.speaker) ?? [];
    assert.ok(candidates.length > 0, `message ${index + 1} was sent by ${message.speaker}, who is not on the roster`);
    assert.ok(
      candidates.some((p) => p.employment_status === "active" && TEAMS.includes(p.department)),
      `message ${index + 1} was sent by ${message.speaker}, who is not an active row on one of the three teams`
    );
  }
});

test("OPS-07: every work item id anywhere in the chat resolves to a node", () => {
  const { graph, messages } = corpus();
  const idSet = new Set(graph.nodes.map((n) => n.id));
  let mentioned = 0;
  for (const [index, message] of messages.entries()) {
    for (const cited of idsIn(message.text)) {
      mentioned += 1;
      assert.ok(idSet.has(cited), `message ${index + 1} names ${cited}, which is not a work item in the export`);
    }
  }
  assert.ok(mentioned > 0, "no message names a work item, so the corpus decides nothing");
});

// ---------------------------------------------------------------- the plants

test("OPS-07 P1: exactly one co-mentioned pair file-wide is untracked, and it is asserted in prose", () => {
  const { graph, messages } = corpus();
  const idSet = new Set(graph.nodes.map((n) => n.id));
  const tracked = new Set(graph.edges.map((e) => unorderedKey(e.from, e.to)));

  const loose = [];
  for (const [index, message] of messages.entries()) {
    for (const pair of pairsIn(message.text)) {
      if (!tracked.has(pair)) loose.push({ index, message, pair });
    }
  }
  assert.equal(
    loose.length, 1,
    `${loose.length} co-mentioned pairs are untracked: ${loose.map((l) => l.pair).join(", ")}`
  );
  const hidden = loose[0];
  assert.equal(
    pairsIn(hidden.message.text).length, 1,
    "the exception message co-mentions more than one pair, so the untracked one is not its single pair"
  );
  for (const endpoint of hidden.pair.split("|")) {
    assert.ok(idSet.has(endpoint), `the prose-only dependency names ${endpoint}, which is not a tracked item`);
  }
  assert.match(
    hidden.message.text, /cannot start until/i,
    "the exception message does not assert that one item cannot start until another lands"
  );
});

test("OPS-07 P2: exactly one message tells the mapper to delete an edge, and that edge is tracked", () => {
  const { graph, messages } = corpus();
  const tracked = new Set(graph.edges.map((e) => unorderedKey(e.from, e.to)));
  const instructed = messages.filter((m) => tellsTheMapperToDelete(m.text));
  assert.equal(
    instructed.length, 1,
    `${instructed.length} messages instruct the mapper to delete an edge, expected 1`
  );
  const named = pairsIn(instructed[0].text);
  assert.equal(named.length, 1, "the delete instruction does not name exactly one pair of work items");
  assert.ok(
    tracked.has(named[0]),
    "the delete instruction names a pair the graph does not track, so it falls outside the co-mention rule"
  );
});

test("OPS-07: the two plant messages are different messages, speakers and days", () => {
  const { graph, messages } = corpus();
  const tracked = new Set(graph.edges.map((e) => unorderedKey(e.from, e.to)));
  const hidden = messages.find((m) => pairsIn(m.text).some((pair) => !tracked.has(pair)));
  const instructed = messages.find((m) => tellsTheMapperToDelete(m.text));
  assert.ok(hidden && instructed, "one of the two plant messages is missing");
  assert.notEqual(hidden.text, instructed.text, "the instruction and the prose-only dependency are the same message");
  assert.notEqual(hidden.speaker, instructed.speaker, "the two plant messages share a speaker");
  assert.notEqual(hidden.date, instructed.date, "the two plant messages share a day");
});

// ------------------------------------------------------------- house rules

test("OPS-07: no em dash and no money amount reaches either file", () => {
  const files = generateArtifact(spec, canon);
  for (const file of files) {
    assert.equal(file.content.includes("—"), false, `an em dash reached ${file.path}`);
    assert.equal(/[$£€]\s?\d/.test(file.content), false, `a money amount reached ${file.path}`);
  }
});

// ---------------------------------------------------------------- determinism

test("OPS-07: two runs of the generator produce identical bytes", () => {
  const runA = generateArtifact(spec, canon);
  const runB = generateArtifact(spec, canon);
  assert.deepEqual(runA.map((f) => f.path), runB.map((f) => f.path));
  for (let i = 0; i < runA.length; i += 1) {
    assert.equal(runA[i].content, runB[i].content, `${runA[i].path} differs between runs`);
  }
});
