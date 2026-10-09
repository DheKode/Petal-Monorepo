#!/usr/bin/env node
// Gate status: compares TASKS.md gates and target times with the live GitHub
// Project board, so anyone can see whether the plan is on track.
//
// Usage (needs the GitHub CLI, logged in with project read access):
//   node scripts/gate-status.mjs                    # print a markdown report
//   node scripts/gate-status.mjs --json             # machine-readable report
//   node scripts/gate-status.mjs --update-issue 28  # rewrite that issue's body with the report
//   node scripts/gate-status.mjs --now 2026-10-10T02:30+08:00   # evaluate at another time
//
// Status is tracked per issue on the board, not per task. A task counts as done
// when its issue is Done, or when the issue body has a ticked checkbox naming
// the task ID, e.g. "- [x] A03 licence and provenance recorded".
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs} from "node:util";

const {values: args} = parseArgs({
    options: {
        owner: {type: "string", default: "DheKode"},
        project: {type: "string", default: "1"},
        repo: {type: "string", default: "DheKode/Petal-Monorepo"},
        tasks: {type: "string"},
        now: {type: "string"},
        json: {type: "boolean", default: false},
        "update-issue": {type: "string"},
        "stale-hours": {type: "string", default: "2"}
    }
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tasksText = readFileSync(args.tasks ?? path.join(root, "TASKS.md"), "utf8");
const decisionsText = readOptional(path.join(root, "docs", "decisions.md"));
const now = args.now ? new Date(args.now) : new Date();

// ---------- TASKS.md ----------

function parsePlan(text) {
    // "**Code freeze: October 10, 2026, 10:00 AM Asia/Manila.**" — Manila is UTC+8 with no DST.
    const freezeMatch = text.match(/Code freeze:\s*([A-Za-z]+ \d{1,2}, \d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (freezeMatch == null)
        throw new Error("Could not find the code freeze line in TASKS.md");
    const [, day, hh, mm, ampm] = freezeMatch;
    const hour24 = (Number(hh) % 12) + (ampm === "PM" ? 12 : 0);
    const freezeDay = new Date(`${day} 00:00:00 GMT+0800`);
    const freeze = manilaTime(freezeDay, hour24, Number(mm));

    const gates = [];
    let section = null;
    for (const line of text.split("\n")) {
        const heading = line.match(/^###\s+(.+?)\s*$/);
        if (heading) {
            section = {title: heading[1], ...parseGateTimes(heading[1], freezeDay), tasks: []};
            gates.push(section);
            continue;
        }
        if (/^##\s/.test(line) && !/^###/.test(line)) {
            // Top-level sections; the X01 extension table lives under one of these.
            section = /extension/i.test(line) ? {title: line.replace(/^##\s+/, ""), target: null, hardStop: null, tasks: []} : null;
            if (section) gates.push(section);
            continue;
        }
        const row = section && parseTaskRow(line);
        if (row) section.tasks.push(row);
    }

    const decisions = [];
    for (const line of text.split("\n")) {
        const cells = splitRow(line);
        if (cells && /^DEC\d+$/.test(cells[0]))
            decisions.push({id: cells[0], title: cells[1], issues: issueRefs(cells.at(-1))});
    }

    return {freeze, gates: gates.filter((gate) => gate.tasks.length > 0), decisions};
}

// Times before the 23:00 start belong to the freeze day; 23:00 and later to the day before.
function parseGateTimes(title, freezeDay) {
    const times = [...title.matchAll(/(target|hard checkpoint|hard stop)\s+(\d{1,2}):(\d{2})/g)];
    let target = null;
    let hardStop = null;
    for (const [, kind, hh, mm] of times) {
        const hour = Number(hh);
        const dayOffset = hour >= 23 ? -1 : 0;
        const when = manilaTime(new Date(freezeDay.getTime() + dayOffset * 864e5), hour, Number(mm));
        if (kind === "hard stop") hardStop = when;
        else target = when;
        if (kind === "hard checkpoint") hardStop = when;
    }
    const condition = times.length === 0 ? (title.match(/\(([^)]+)\)/)?.[1] ?? null) : null;
    return {target, hardStop, condition};
}

function manilaTime(manilaMidnight, hour, minute) {
    return new Date(manilaMidnight.getTime() + (hour * 60 + minute) * 6e4);
}

function parseTaskRow(line) {
    const cells = splitRow(line);
    if (cells == null || !/^[A-Z]\d{2}$/.test(cells[0]) || !/^P\d$/.test(cells[1]))
        return null;
    return {id: cells[0], priority: cells[1], title: cells[2], issues: issueRefs(cells.at(-1))};
}

function splitRow(line) {
    if (!line.startsWith("|")) return null;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    return cells.length >= 3 ? cells : null;
}

function issueRefs(cell) {
    return [...cell.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

// ---------- GitHub ----------

function gh(cliArgs, input) {
    try {
        return execFileSync("gh", cliArgs, {encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024, stdio: [input == null ? "ignore" : "pipe", "pipe", "pipe"]});
    } catch (error) {
        throw new Error(`gh ${cliArgs.slice(0, 3).join(" ")} failed: ${error.stderr?.trim() || error.message}`);
    }
}

function loadBoard() {
    const items = JSON.parse(gh(["project", "item-list", args.project, "--owner", args.owner, "--format", "json", "--limit", "500"])).items;
    const issues = JSON.parse(gh(["issue", "list", "--repo", args.repo, "--state", "all", "--limit", "500", "--json", "number,title,state,body,updatedAt,assignees"]));

    const byNumber = new Map();
    for (const issue of issues)
        byNumber.set(issue.number, {
            number: issue.number,
            title: issue.title,
            state: issue.state,
            body: issue.body ?? "",
            updatedAt: new Date(issue.updatedAt),
            assignees: issue.assignees.map((assignee) => assignee.login),
            status: null,
            agent: null
        });

    for (const item of items) {
        const issue = byNumber.get(item.content?.number);
        if (issue == null) continue;
        issue.status = item.status ?? null;
        issue.agent = item["agent / Session"] ?? null;
    }
    return byNumber;
}

// ---------- Report ----------

const statusRank = {Done: 5, Review: 4, "In Progress": 3, Blocked: 2, Ready: 1, Backlog: 0};

function buildReport(plan, issues, at) {
    const staleMs = Number(args["stale-hours"]) * 36e5;
    const gates = plan.gates.map((gate) => {
        const tasks = gate.tasks.map((task) => taskStatus(task, issues));
        const p0 = tasks.filter((task) => task.priority === "P0");
        const deadline = gate.hardStop ?? gate.target;
        const overdue = deadline != null && at > deadline;
        return {
            title: gate.title,
            target: gate.target?.toISOString() ?? null,
            hardStop: gate.hardStop?.toISOString() ?? null,
            condition: gate.condition,
            p0Done: p0.filter((task) => task.done).length,
            p0Total: p0.length,
            state: p0.length > 0 && p0.every((task) => task.done) ? "met" : overdue ? "overdue" : "open",
            tasks
        };
    });

    const usedIssues = new Set(plan.gates.flatMap((gate) => gate.tasks.flatMap((task) => task.issues)));
    const warnings = [];
    for (const issue of issues.values()) {
        if (!usedIssues.has(issue.number) && issue.state === "CLOSED") continue;
        if (issue.state === "CLOSED" && issue.status !== "Done")
            warnings.push(`#${issue.number} is closed but the board says ${issue.status ?? "nothing"} (Done needs integrated verification).`);
        if (issue.state === "OPEN" && issue.status === "Done")
            warnings.push(`#${issue.number} is Done on the board but the issue is still open.`);
        if (issue.status === "In Progress" && at - issue.updatedAt > staleMs)
            warnings.push(`#${issue.number} is In Progress with no issue update for ${hoursAgo(issue.updatedAt, at)}.`);
        if (issue.status === "Blocked")
            warnings.push(`#${issue.number} is Blocked: ${issue.title}.`);
        if (issue.state === "OPEN" && issue.assignees.length > 0 && /## Human owner and agent\/session\s*\nUnassigned/.test(issue.body))
            warnings.push(`#${issue.number} has assignees but its body still says "Unassigned".`);
        if (issue.status == null && issue.state === "OPEN")
            warnings.push(`#${issue.number} is not on the project board.`);
    }

    const decisions = plan.decisions.map((decision) => ({
        ...decision,
        recorded: new RegExp(`\\b${decision.id}\\b`).test(decisionsText)
    }));

    const unownedP0 = gates.flatMap((gate) => gate.tasks)
        .filter((task) => task.priority === "P0" && !task.done && task.unowned)
        .map((task) => task.id);

    return {
        generatedAt: at.toISOString(),
        freeze: plan.freeze.toISOString(),
        hoursToFreeze: Number(((plan.freeze - at) / 36e5).toFixed(1)),
        gates,
        unownedP0,
        decisions,
        warnings
    };
}

function taskStatus(task, issues) {
    const linked = task.issues.map((number) => issues.get(number)).filter(Boolean);
    const ticked = linked.some((issue) => new RegExp(`^\\s*[-*] \\[[xX]\\].*\\b${task.id}\\b`, "m").test(issue.body));
    const statuses = linked.map((issue) => issue.status ?? "Not on board");
    const allDone = linked.length > 0 && linked.every((issue) => issue.status === "Done");
    // The least advanced linked issue is the honest status for a multi-issue task.
    const status = statuses.sort((a, b) => (statusRank[a] ?? -1) - (statusRank[b] ?? -1))[0] ?? "No issue";
    return {
        ...task,
        status: allDone ? "Done" : ticked ? `Ticked (${status})` : status,
        done: allDone || ticked,
        unowned: linked.length === 0 || linked.every((issue) => issue.assignees.length === 0),
        owners: [...new Set(linked.flatMap((issue) => issue.assignees))]
    };
}

function hoursAgo(date, at) {
    return `${((at - date) / 36e5).toFixed(1)} h`;
}

const manilaFormat = new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Manila", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false});
const manila = (iso) => (iso == null ? "—" : manilaFormat.format(new Date(iso)));

function renderMarkdown(report) {
    const lines = [];
    const mark = {met: "✅ met", overdue: "🔴 overdue", open: "⏳ open"};
    lines.push("# Gate status");
    lines.push("");
    lines.push(`Generated ${manila(report.generatedAt)} Asia/Manila by \`node scripts/gate-status.mjs\`. Code freeze ${manila(report.freeze)} (${report.hoursToFreeze} h left).`);
    lines.push("");
    lines.push("Status comes from the project board per issue; a task counts as done when its issue is Done or the issue body ticks `- [x] <task ID> …`. Do not edit this text by hand — rerun the script.");
    lines.push("");
    lines.push("| Gate | Target (Manila) | P0 done | State |");
    lines.push("| --- | --- | --- | --- |");
    for (const gate of report.gates) {
        const when = gate.target ?? gate.hardStop ? `${manila(gate.target)}${gate.hardStop && gate.hardStop !== gate.target ? ` (hard ${manila(gate.hardStop)})` : ""}` : (gate.condition ?? "—");
        lines.push(`| ${gate.title.replace(/\s*\(.*\)$/, "")} | ${when} | ${gate.p0Done}/${gate.p0Total} | ${gate.p0Total === 0 ? "—" : mark[gate.state]} |`);
    }
    lines.push("");
    if (report.unownedP0.length > 0)
        lines.push(`**Unowned P0 tasks:** ${report.unownedP0.join(", ")}`, "");

    const notDone = report.gates.flatMap((gate) => gate.tasks.filter((task) => !task.done && task.priority !== "P2").map((task) => ({gate, task})));
    if (notDone.length > 0) {
        lines.push("## Open P0/P1 tasks");
        lines.push("");
        lines.push("| Task | Pri | Gate state | Issue status | Owner |");
        lines.push("| --- | --- | --- | --- | --- |");
        for (const {gate, task} of notDone)
            lines.push(`| ${task.id} ${task.title.slice(0, 60)}${task.title.length > 60 ? "…" : ""} | ${task.priority} | ${gate.p0Total === 0 ? "—" : mark[gate.state]} | ${task.status} (${task.issues.map((n) => `#${n}`).join(", ")}) | ${task.owners.length ? task.owners.map((o) => `@${o}`).join(", ") : "**unowned**"} |`);
        lines.push("");
    }

    const unrecorded = report.decisions.filter((decision) => !decision.recorded);
    if (unrecorded.length > 0)
        lines.push(`**Decisions not referenced by ID in docs/decisions.md:** ${unrecorded.map((decision) => `${decision.id} (${decision.title})`).join(", ")}`, "");

    if (report.warnings.length > 0) {
        lines.push("## Board consistency");
        lines.push("");
        for (const warning of report.warnings) lines.push(`- ${warning}`);
        lines.push("");
    }
    return lines.join("\n");
}

function readOptional(file) {
    try {
        return readFileSync(file, "utf8");
    } catch {
        return "";
    }
}

// Runs last so every module-level constant above is initialised.
const plan = parsePlan(tasksText);
const board = loadBoard();
const report = buildReport(plan, board, now);

if (args.json)
    console.log(JSON.stringify(report, null, 2));
else {
    const markdown = renderMarkdown(report);
    if (args["update-issue"]) {
        gh(["issue", "edit", args["update-issue"], "--repo", args.repo, "--body-file", "-"], markdown);
        console.log(`Updated issue #${args["update-issue"]}`);
    } else
        console.log(markdown);
}
