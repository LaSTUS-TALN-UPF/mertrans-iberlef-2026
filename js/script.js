// ------------------------
// Theme toggle
// ------------------------
const THEME_KEY = "mertrans_theme";

function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function getSavedTheme() {
    return localStorage.getItem(THEME_KEY); // "light" | "dark" | null
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    const btn = document.getElementById("themeToggle");
    if (btn) {
        const isDark = theme === "dark";
        btn.setAttribute("aria-pressed", String(isDark));

        const icon = btn.querySelector(".theme-toggle__icon");
        const text = btn.querySelector(".theme-toggle__text");
        if (icon) icon.textContent = isDark ? "☀️" : "🌙";
        if (text) text.textContent = isDark ? "Light" : "Dark";
    }
}

function initTheme() {
    const saved = getSavedTheme();
    const theme = saved || getSystemTheme();
    applyTheme(theme);

    // If user hasn't chosen a theme, follow OS changes live
    if (!saved && window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        mq.addEventListener?.("change", () => applyTheme(getSystemTheme()));
    }

    const btn = document.getElementById("themeToggle");
    if (btn) {
        btn.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "light";
            const next = current === "dark" ? "light" : "dark";
            localStorage.setItem(THEME_KEY, next);
            applyTheme(next);
        });
    }
}

// ------------------------
// Schedule data
// ------------------------
const schedule = [
    {date: "2026-02-16", title: "Registration opens"},
    {date: "2026-03-05", title: "Registration closes"},
    {date: "2026-03-06", title: "Trial data released"},
    {date: "2026-04-08", title: "Test data released"},
    {date: "2026-04-20", title: "Submission instructions released"},
    {date: "2026-04-22", title: "Evaluation script released"},
    {date: "2026-04-27", title: "System output submission deadline"},
    {date: "2026-05-11", title: "Evaluation results published"},
    {date: "2026-06-01", title: "Paper submission deadline"},
    {date: "2026-06-19", title: "Paper acceptance notification"},
    {date: "2026-06-27", title: "Camera-ready papers due"},
    {date: "2026-09-22", title: "IberLEF 2026 Workshop"},
];

function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, {day: "2-digit", month: "short", year: "numeric"});
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderScheduleTable() {
    const tbody = document.querySelector("#scheduleTable tbody");
    if (!tbody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = [...schedule].sort((a, b) => a.date.localeCompare(b.date));

    tbody.innerHTML = items.map(item => {
        const itemDate = new Date(item.date + "T00:00:00");
        const isPast = itemDate < today;

        return `
        <tr class="${isPast ? "past-deadline" : ""}">
          <td>${escapeHtml(item.title)}</td>
          <td class="mono">${fmtDate(item.date)}</td>
        </tr>
      `;
    }).join("");
}

// ------------------------
// Mobile menu
// ------------------------
function setupMenuToggle() {
    const btn = document.querySelector(".nav-toggle");
    const links = document.querySelector("#nav-links");
    if (!btn || !links) return;

    btn.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
    });

    links.addEventListener("click", (e) => {
        const t = e.target;
        if (t && t.tagName === "A") {
            links.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
        }
    });
}

// ------------------------
// Copy schedule as text
// ------------------------
function setupCopyDates() {
    const btn = document.getElementById("copyScheduleBtn");
    if (!btn) return;

    const DEFAULT_LABEL = "Copy dates as text";
    const COPIED_LABEL = "Copied!";
    const RESET_MS = 1200;

    const buildLines = () =>
        [...schedule]
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(({date, title}) => `${title}: ${fmtDate(date)}`)
            .join("\n");

    const setTempLabel = (text) => {
        btn.textContent = text;
        window.clearTimeout(setTempLabel._t);
        setTempLabel._t = window.setTimeout(() => {
            btn.textContent = DEFAULT_LABEL;
        }, RESET_MS);
    };

    const copyText = async (text) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }

        // Fallback: select/copy via a temporary textarea
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("Copy failed");
    };

    btn.addEventListener("click", async () => {
        const lines = buildLines();

        try {
            await copyText(lines);
            setTempLabel(COPIED_LABEL);
        } catch {
            alert(lines);
        }
    });
}

// ------------------------
// Email copy
// ------------------------
function setupEmailCopy() {
    const btn = document.getElementById("emailBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const email = btn.textContent.trim();
        try {
            await navigator.clipboard.writeText(email);
            btn.textContent = "Copied email ✓";
            setTimeout(() => (btn.textContent = email), 1300);
        } catch {
            window.location.href = `mailto:${email}`;
        }
    });
}

// ------------------------
// ICS calendar download
// ------------------------
function escapeICS(s) {
    return String(s)
        .replaceAll("\\", "\\\\")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,")
        .replaceAll("\n", "\\n");
}

function makeICS() {
    const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const events = [...schedule]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item, idx) => {
            const dt = item.date.replaceAll("-", "");
            const uid = `mertrans-iberlef-2026-${dt}-${idx}@example.local`;
            return [
                "BEGIN:VEVENT",
                `UID:${uid}`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART;VALUE=DATE:${dt}`,
                `SUMMARY:${escapeICS(`MER-TRANS: ${item.title}`)}`,
                "END:VEVENT"
            ].join("\r\n");
        })
        .join("\r\n");

    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MER-TRANS//IberLef 2026//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        events,
        "END:VCALENDAR"
    ].join("\r\n") + "\r\n";
}

function downloadICS() {
    const blob = new Blob([makeICS()], {type: "text/calendar;charset=utf-8"});
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "MER-TRANS_IberLef_2026_schedule.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

// ------------------------
// Footer meta
// ------------------------
function setupMeta() {
    const year = document.getElementById("year");
    const last = document.getElementById("lastUpdated");

    if (year) year.textContent = "2026";
    if (last) last.textContent = "12 May";

    const icsBtn = document.getElementById("icsBtn");
    if (icsBtn) icsBtn.addEventListener("click", downloadICS);
}

function setupToTop() {
    const btn = document.getElementById("toTopBtn");
    if (!btn) return;

    const onScroll = () => {
        btn.classList.toggle("show", window.scrollY > 400);
    };

    window.addEventListener("scroll", onScroll, {passive: true});
    onScroll();

    btn.addEventListener("click", () => {
        window.scrollTo({top: 0, behavior: "smooth"});
    });
}

// ------------------------
// Results Table
// ------------------------
let resultsData = [];

let resultsState = {
    teamFilter: "",
    langFilter: "",
    sortKey: "sari",
    sortDir: "desc",
};

function parseCSVLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const next = line[i + 1];

        if (ch === '"' && inQuotes && next === '"') {
            cur += '"';
            i++;
        } else if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            out.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

function parseCSV(text) {
    const lines = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter(line => line.trim() !== "");

    if (!lines.length) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row = {};

        headers.forEach((header, idx) => {
            row[header] = (values[idx] ?? "").trim();
        });

        return row;
    });
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function formatScore(value, digits = 4) {
    const n = toNumber(value);
    return n === null ? "—" : n.toFixed(digits);
}

function getFilteredAndSortedResults() {
    let rows = [...resultsData];

    const teamQuery = resultsState.teamFilter.trim().toLowerCase();

    if (teamQuery) {
        rows = rows.filter(row =>
            String(row.team_name || "").toLowerCase().includes(teamQuery)
        );
    }

    const langQuery = resultsState.langFilter.trim().toLowerCase();

    if (langQuery) {
        rows = rows.filter(row =>
            String(row.lang || "").trim().toLowerCase() === langQuery
        );
    }

    if (resultsState.sortKey) {
        const {sortKey, sortDir} = resultsState;

        rows.sort((a, b) => {
            const av = toNumber(a[sortKey]);
            const bv = toNumber(b[sortKey]);

            if (av === null && bv === null) return 0;
            if (av === null) return 1;
            if (bv === null) return -1;

            return sortDir === "asc" ? av - bv : bv - av;
        });
    }

    return rows;
}

function updateSortIndicators() {
    document.querySelectorAll(".sort-indicator").forEach(el => {
        const key = el.getAttribute("data-indicator-for");

        if (key !== resultsState.sortKey) {
            el.textContent = "↕";
            return;
        }

        el.textContent = resultsState.sortDir === "asc" ? "↑" : "↓";
    });
}

function renderResultsTable() {
    const tbody = document.querySelector("#resultsTable tbody");
    const count = document.getElementById("resultsCount");

    if (!tbody) return;

    const rows = getFilteredAndSortedResults();

    if (count) {
        count.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"}`;
    }

    if (!rows.length) {
        tbody.innerHTML = `
            <tr class="results-empty">
                <td colspan="7">No matching results found.</td>
            </tr>
        `;
        updateSortIndicators();
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td>${escapeHtml(row.team_name || "")}</td>
            <td>${escapeHtml(row.lang || "")}</td>
            <td class="mono">${escapeHtml(row.method || "")}</td>
            <td>${formatScore(row.bleu_orig)}</td>
            <td>${formatScore(row.bleu_gold)}</td>
            <td>${formatScore(row.sari)}</td>
            <td>${formatScore(row.bert)}</td>
        </tr>
    `).join("");

    updateSortIndicators();
}

function populateLanguageFilter() {
    const select = document.getElementById("langFilter");

    if (!select) return;

    const langs = [...new Set(
        resultsData
            .map(row => String(row.lang || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    select.innerHTML = `
        <option value="">All languages</option>
        ${langs.map(lang => `<option value="${escapeHtml(lang)}">${escapeHtml(lang)}</option>`).join("")}
    `;

    select.value = resultsState.langFilter || "";
}

async function loadResultsCSV() {
    const tbody = document.querySelector("#resultsTable tbody");

    try {
        const res = await fetch("assets/data/scores/evaluation_summary.csv", {
            cache: "no-store"
        });

        if (!res.ok) {
            throw new Error(`Could not load CSV: HTTP ${res.status}`);
        }

        const text = await res.text();
        const parsed = parseCSV(text);

        resultsData = parsed.map(row => ({
            team_name: row.team_name || "",
            lang: row.lang || "",
            method: row.method || "",
            bleu_orig: row.bleu_orig || "",
            bleu_gold: row.bleu_gold || "",
            sari: row.sari || "",
            bert: row.bert || "",
        }));

        populateLanguageFilter();
        renderResultsTable();

    } catch (err) {
        console.error("Failed to load results CSV:", err);

        if (tbody) {
            tbody.innerHTML = `
                <tr class="results-empty">
                    <td colspan="7">${escapeHtml(String(err.message || err))}</td>
                </tr>
            `;
        }
    }
}

function setupResultsTable() {
    const filterInput = document.getElementById("teamFilter");
    const langSelect = document.getElementById("langFilter");
    const sortButtons = document.querySelectorAll(".sort-btn");

    if (filterInput) {
        filterInput.addEventListener("input", () => {
            resultsState.teamFilter = filterInput.value;
            renderResultsTable();
        });
    }

    if (langSelect) {
        langSelect.addEventListener("change", () => {
            resultsState.langFilter = langSelect.value;
            renderResultsTable();
        });
    }

    sortButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-sort");

            if (!key) return;

            if (resultsState.sortKey === key) {
                resultsState.sortDir = resultsState.sortDir === "asc" ? "desc" : "asc";
            } else {
                resultsState.sortKey = key;
                resultsState.sortDir = "desc";
            }

            renderResultsTable();
        });
    });
    loadResultsCSV();
}

// ------------------------
// Boot
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupMenuToggle();
    renderScheduleTable();
    setupResultsTable();
    setupCopyDates();
    setupEmailCopy();
    setupMeta();
    setupToTop();
});