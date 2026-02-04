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
    {date: "2026-02-28", title: "Registration closes"},
    {date: "2026-03-06", title: "Trial data release"},
    {date: "2026-04-06", title: "Test data release"},
    {date: "2026-04-13", title: "System outputs submission deadline"},
    {date: "2026-04-27", title: "Evaluation results published"},
    {date: "2026-06-01", title: "Papers due"},
    {date: "2026-06-14", title: "Papers acceptance"},
    {date: "2026-06-21", title: "Camera-ready papers due"},
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

    const items = [...schedule].sort((a, b) => a.date.localeCompare(b.date));
    tbody.innerHTML = items.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td class="mono">${fmtDate(item.date)}</td>
    </tr>
  `).join("");
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
    if (year) year.textContent = String(new Date().getFullYear());
    if (last) last.textContent = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "2-digit"
    });

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
// Boot
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupMenuToggle();
    renderScheduleTable();
    setupCopyDates();
    setupEmailCopy();
    setupMeta();
    setupToTop();
});
