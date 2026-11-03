
"use strict";

(() => {
  // ==========================================
  // REVENUEFORGE - APPLICATION CORE
  // ==========================================

  const $ = (id) => document.getElementById(id);

  const SUPABASE_URL = window.REVENUEFORGE_SUPABASE_URL;
  const SUPABASE_KEY = window.REVENUEFORGE_SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY || !window.supabase) {
    console.error("RevenueForge: Supabase configuration is missing.");
    showMessage("Connection configuration is missing. Contact support.", true);
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;
  let leads = [];
  let isLoading = false;

  const VALID_STATUSES = ["New", "Contacted", "Converted"];

  // ==========================================
  // GENERAL HELPERS
  // ==========================================

  function showMessage(message, isError = false, target = null) {
    const element =
      (target && $(target)) ||
      $("form-message") ||
      $("page-message") ||
      $("generator-feedback");

    if (!element) {
      if (isError) console.error(message);
      return;
    }

    element.textContent = message;
    element.className = isError ? "feedback error" : "feedback";
    element.setAttribute("role", "status");
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function getStatusClass(status) {
    return {
      New: "status-new",
      Contacted: "status-contacted",
      Converted: "status-converted"
    }[status] || "status-new";
  }

  function statusBadge(status) {
    return `<span class="status-badge ${getStatusClass(status)}">${escapeHTML(status)}</span>`;
  }

  function getLeadById(id) {
    return leads.find((lead) => String(lead.id) === String(id));
  }

  function getFirstName(name) {
    return String(name || "").trim().split(/\s+/)[0] || "there";
  }

  // ==========================================
  // USER AUTHENTICATION
  // ==========================================

  async function initialise() {
    try {
      const { data, error } = await db.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        window.location.replace("login.html");
        return;
      }

      currentUser = data.session.user;

      setText("user-email", currentUser.email || "Account");
      setText("settings-email", currentUser.email || "Account");

      await loadLeads();
      setupPage();

    } catch (error) {
      console.error("RevenueForge initialization error:", error);

      showMessage(
        "Unable to load your workspace. Please refresh and try again.",
        true
      );
    }
  }

  async function signOut() {
    const buttons = [
      $("sign-out"),
      $("settings-sign-out")
    ].filter(Boolean);

    buttons.forEach((button) => {
      button.disabled = true;
      button.textContent = "Signing out...";
    });

    try {
      const { error } = await db.auth.signOut();

      if (error) throw error;

      window.location.replace("login.html");

    } catch (error) {
      console.error("Sign-out error:", error);

      showMessage(
        "Unable to sign out: " + error.message,
        true
      );

      buttons.forEach((button) => {
        button.disabled = false;
        button.textContent = "Sign Out";
      });
    }
  }

  // ==========================================
  // DATABASE
  // ==========================================

  async function loadLeads() {
    if (!currentUser || isLoading) return;

    isLoading = true;

    const table = $("leads-list");

    if (table) {
      table.innerHTML =
        '<tr><td colspan="6" class="empty-state">Loading leads...</td></tr>';
    }

    try {
      const { data, error } = await db
        .from("leads")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      leads = Array.isArray(data) ? data : [];

      renderDashboard();
      renderLeadList();
      renderFollowUpOptions();
      renderReports();

      return leads;

    } catch (error) {
      console.error("Lead loading error:", error);

      showMessage(
        "Unable to load leads. Check your connection and try again.",
        true
      );

      throw error;

    } finally {
      isLoading = false;
    }
  }

  async function saveLeadToDatabase(lead, id = null) {
    if (!currentUser) {
      throw new Error("Please sign in before saving a lead.");
    }

    if (id) {
      const { error } = await db
        .from("leads")
        .update({
          name: lead.name,
          email: lead.email,
          service: lead.service,
          status: lead.status
        })
        .eq("id", id)
        .eq("user_id", currentUser.id);

      if (error) throw error;

    } else {
      const { error } = await db
        .from("leads")
        .insert({
          user_id: currentUser.id,
          name: lead.name,
          email: lead.email,
          service: lead.service,
          status: lead.status
        });

      if (error) throw error;
    }
  }

  async function deleteLead(id) {
    const lead = getLeadById(id);

    if (!lead) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${lead.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error } = await db
        .from("leads")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      leads = leads.filter(
        (item) => String(item.id) !== String(id)
      );

      renderDashboard();
      renderLeadList();
      renderFollowUpOptions();
      renderReports();

      showMessage("Lead deleted successfully.");

    } catch (error) {
      console.error("Delete error:", error);

      showMessage(
        "Could not delete lead: " + error.message,
        true
      );
    }
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  function renderDashboard() {
    const total = leads.length;

    const fresh = leads.filter(
      (lead) => lead.status === "New"
    ).length;

    const contacted = leads.filter(
      (lead) => lead.status === "Contacted"
    ).length;

    const converted = leads.filter(
      (lead) => lead.status === "Converted"
    ).length;

    const rate = total
      ? Math.round((converted / total) * 100)
      : 0;

    setText("total-leads", total);
    setText("new-leads", fresh);
    setText("contacted-leads", contacted);
    setText("converted-leads", converted);

    setText("pipeline-new", fresh);
    setText("pipeline-contacted", contacted);
    setText("pipeline-converted", converted);
    setText("conversion-rate", rate + "%");

    const table = $("recent-leads");

    if (!table) return;

    if (!total) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            No leads yet. Add your first lead to get started.
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = leads.slice(0, 5).map((lead) => `
      <tr>
        <td>${escapeHTML(lead.name)}</td>
        <td>${escapeHTML(lead.email)}</td>
        <td>${escapeHTML(lead.service || "—")}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${formatDate(lead.created_at)}</td>
      </tr>
    `).join("");
  }

  // ==========================================
  // LEADS PAGE
  // ==========================================

  function renderLeadList() {
    const table = $("leads-list");

    if (!table) return;

    const search = ($("search-leads")?.value || "")
      .trim()
      .toLowerCase();

    const selectedStatus = $("filter-status")?.value || "";

    const filtered = leads.filter((lead) => {
      const searchable = [
        lead.name,
        lead.email,
        lead.service
      ];

      const matchesSearch = searchable.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );

      const matchesStatus =
        !selectedStatus || lead.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    setText("lead-count", `${filtered.length} of ${leads.length} leads`);

    if (!filtered.length) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            ${leads.length
              ? "No leads match your search or filter."
              : "No leads yet. Add your first lead to get started."}
          </td>
        </tr>
      `;
      return;
    }

    table.innerHTML = filtered.map((lead) => `
      <tr>
        <td>${escapeHTML(lead.name)}</td>
        <td>${escapeHTML(lead.email)}</td>
        <td>${escapeHTML(lead.service || "—")}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${formatDate(lead.created_at)}</td>
        <td>
          <a
            class="action-button"
            href="add-lead.html?id=${encodeURIComponent(lead.id)}"
          >Edit</a>

          <button
            type="button"
            class="action-button delete-button"
            data-delete="${escapeHTML(lead.id)}"
          >Delete</button>
        </td>
      </tr>
    `).join("");
  }

  // ==========================================
  // ADD AND EDIT LEADS
  // ==========================================

  function setupAddLead() {
    const form = $("lead-form");

    if (!form) return;

    const id = new URLSearchParams(window.location.search).get("id");

    if (id) {
      const lead = getLeadById(id);

      if (!lead) {
        showMessage("Lead not found.", true);
        return;
      }

      $("lead-id").value = lead.id;
      $("lead-name").value = lead.name || "";
      $("lead-email").value = lead.email || "";
      $("lead-business").value = lead.service || "";
      $("lead-status").value = lead.status || "New";

      setText("form-title", "Edit Lead");
      setText("form-description", "Update the details of this lead.");
      setText("save-button", "Save Changes");
    }

    form.addEventListener("submit", saveLead);

    $("cancel-edit")?.addEventListener("click", () => {
      window.location.href = "leads.html";
    });
  }

  async function saveLead(event) {
    event.preventDefault();

    if (!currentUser) {
      showMessage("Please sign in before saving leads.", true);
      return;
    }

    const id = $("lead-id")?.value || null;

    const lead = {
      name: $("lead-name")?.value.trim() || "",
      email: $("lead-email")?.value.trim() || "",
      service: $("lead-business")?.value.trim() || "",
      status: $("lead-status")?.value || "New"
    };

    if (!lead.name || !lead.email || !lead.service) {
      showMessage("Please complete all fields.", true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      showMessage("Enter a valid email address.", true);
      return;
    }

    if (!VALID_STATUSES.includes(lead.status)) {
      showMessage("Choose a valid lead status.", true);
      return;
    }

    const duplicate = leads.some((item) =>
      item.email.toLowerCase() === lead.email.toLowerCase() &&
      String(item.id) !== String(id)
    );

    if (duplicate) {
      showMessage("A lead with this email already exists.", true);
      return;
    }

    const button = $("save-button");

    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }

    try {
      await saveLeadToDatabase(lead, id);

      showMessage(
        id ? "Lead updated successfully." : "Lead added successfully."
      );

      window.setTimeout(() => {
        window.location.href = "leads.html";
      }, 700);

    } catch (error) {
      console.error("Save error:", error);

      showMessage(
        "Could not save lead: " + error.message,
        true
      );

      if (button) {
        button.disabled = false;
        button.textContent = id ? "Save Changes" : "Save Lead";
      }
    }
  }

  // ==========================================
  // REPORTS
  // ==========================================

  function renderReports() {
    const total = leads.length;

    const fresh = leads.filter(
      (lead) => lead.status === "New"
    ).length;

    const contacted = leads.filter(
      (lead) => lead.status === "Contacted"
    ).length;

    const converted = leads.filter(
      (lead) => lead.status === "Converted"
    ).length;

    const rate = total
      ? Math.round((converted / total) * 100)
      : 0;

    setText("report-total", total);
    setText("report-new", fresh);
    setText("report-contacted", contacted);
    setText("report-converted", converted);
    setText("report-rate", rate + "%");

    const progress = $("report-progress");

    if (progress) {
      progress.style.width = rate + "%";
      progress.setAttribute("aria-valuenow", String(rate));
    }

    setText("breakdown-new", fresh);
    setText("breakdown-contacted", contacted);
    setText("breakdown-converted", converted);

    const percentage = (count) =>
      total ? `${(count / total) * 100}%` : "0%";

    if ($("bar-new")) {
      $("bar-new").style.width = percentage(fresh);
    }

    if ($("bar-contacted")) {
      $("bar-contacted").style.width = percentage(contacted);
    }

    if ($("bar-converted")) {
      $("bar-converted").style.width = percentage(converted);
    }
  }

  // ==========================================
  // FOLLOW-UP GENERATOR
  // ==========================================

  function renderFollowUpOptions() {
    const select = $("follow-up-lead");

    if (!select) return;

    const previous = select.value;

    select.innerHTML = '<option value="">Choose a lead</option>';

    leads.forEach((lead) => {
      const option = document.createElement("option");

      option.value = lead.id;
      option.textContent =
        `${lead.name} — ${lead.service || "No service"}`;

      select.appendChild(option);
    });

    if (leads.some((lead) => String(lead.id) === previous)) {
      select.value = previous;
    }
  }

  function generateFollowUp() {
    const id = $("follow-up-lead")?.value;
    const type = $("message-type")?.value || "initial";
    const channel = $("message-service")?.value || "email";
    const output = $("generated-message");

    const lead = getLeadById(id);

    if (!lead) {
      showMessage(
        "Please select a lead first.",
        true,
        "generator-feedback"
      );
      return;
    }

    const name = getFirstName(lead.name);
    const service = lead.service || "your project";

    const templates = {
      initial: `Hello ${name},

I hope you're doing well. I'm reaching out regarding ${service}. I'd like to understand your needs and discuss how we could help.

Would you be available for a brief conversation?

Best regards`,

      reminder: `Hello ${name},

I wanted to check whether you've had a chance to review our previous conversation about ${service}.

Please let me know if you have any questions or need further information.

Best regards`,

      proposal: `Hello ${name},

I'm following up on the proposal regarding ${service}.

I'd be happy to clarify any details, discuss your requirements and answer any questions you may have.

Please let me know what works best for you.

Best regards`,

      closing: `Hello ${name},

I'm checking in regarding ${service} to see whether you're ready to discuss the next steps.

If you're still interested, I'd be happy to move the conversation forward.

Thank you for your time.

Best regards`
    };

    let message = templates[type] || templates.initial;

    if (channel === "whatsapp") {
      message = message.replace(/^Hello /, "Hi ");
      message = message.replace(/\n\n/g, "\n");
    }

    if (channel === "linkedin") {
      message = message.replace(/^Hello /, "Hello ");
    }

    output.value = message;

    showMessage(
      "Message generated. Review and personalize it before sending.",
      false,
      "generator-feedback"
    );
  }

  async function copyFollowUp() {
    const output = $("generated-message");
    const message = output?.value.trim() || "";

    if (!message) {
      showMessage(
        "Generate a message first.",
        true,
        "generator-feedback"
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(message);

      showMessage(
        "Message copied to clipboard.",
        false,
        "generator-feedback"
      );

    } catch (error) {
      output.focus();
      output.select();

      const copied = document.execCommand("copy");

      showMessage(
        copied
          ? "Message copied to clipboard."
          : "Select the message and press Ctrl+C to copy.",
        !copied,
        "generator-feedback"
      );
    }
  }

  // ==========================================
  // PAGE EVENT LISTENERS
  // ==========================================

  function setupPage() {
    $("search-leads")?.addEventListener("input", renderLeadList);

    $("filter-status")?.addEventListener("change", renderLeadList);

    $("leads-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete]");

      if (button) {
        deleteLead(button.dataset.delete);
      }
    });

    $("generate-message")?.addEventListener(
      "click",
      generateFollowUp
    );

    $("copy-message")?.addEventListener(
      "click",
      copyFollowUp
    );

    $("sign-out")?.addEventListener("click", signOut);

    $("settings-sign-out")?.addEventListener("click", signOut);

    setupAddLead();
  }

  // ==========================================
  // AUTHENTICATION STATE CHANGES
  // ==========================================

  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      leads = [];

      window.location.replace("login.html");
    }
  });

  // ==========================================
  // START APPLICATION
  // ==========================================

  initialise();

})();
