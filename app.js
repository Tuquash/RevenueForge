
(function () {
  const url =
    typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL :
    window.SUPABASE_URL || window.supabaseUrl;

  const key =
    typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY :
    typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY :
    window.SUPABASE_ANON_KEY || window.SUPABASE_KEY || window.supabaseKey;

  if (!url || !key || !window.supabase) {
    console.error("RevenueForge: Supabase configuration missing.");
    return;
  }

  const db = window.supabase.createClient(url, key);
  let leads = [];
  let currentUser = null;

  const $ = id => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#039;"
    })[c]);
  }

  function setText(id, value) {
    if ($(id)) $(id).textContent = value;
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : "—";
  }

  function statusBadge(status) {
    const css = {
      New: "status-new",
      Contacted: "status-contacted",
      Converted: "status-converted"
    }[status] || "status-new";

    return `<span class="status-badge ${css}">${escapeHTML(status)}</span>`;
  }

  async function initialise() {
    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
      location.href = "login.html";
      return;
    }

    currentUser = data.session.user;
    setText("user-email", currentUser.email || "Account");
    setText("settings-email", currentUser.email || "Account");

    await loadLeads();
    setupPage();
  }

  async function loadLeads() {
    const { data, error } = await db
      .from("leads")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load leads:", error);
      showMessage("Unable to load leads. Check your database connection.", true);
      return;
    }

    leads = data || [];
    renderDashboard();
    renderLeadList();
    renderFollowUpOptions();
    renderReports();
  }

  function renderDashboard() {
    const total = leads.length;
    const fresh = leads.filter(x => x.status === "New").length;
    const contacted = leads.filter(x => x.status === "Contacted").length;
    const converted = leads.filter(x => x.status === "Converted").length;
    const rate = total ? Math.round(converted / total * 100) : 0;

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

    if (!leads.length) {
      table.innerHTML = '<tr><td colspan="5" class="empty-state">No leads yet. Add your first lead to get started.</td></tr>';
      return;
    }

    table.innerHTML = leads.slice(0, 5).map(lead => `
      <tr>
        <td>${escapeHTML(lead.name)}</td>
        <td>${escapeHTML(lead.email)}</td>
        <td>${escapeHTML(lead.service || "—")}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${formatDate(lead.created_at)}</td>
      </tr>
    `).join("");
  }

  function renderLeadList() {
    const table = $("leads-list");
    if (!table) return;

    const search = ($("search-leads")?.value || "").toLowerCase();
    const status = $("filter-status")?.value || "";

    const filtered = leads.filter(lead => {
      const matchesSearch = [
        lead.name, lead.email, lead.service
      ].some(value => String(value || "").toLowerCase().includes(search));

      return matchesSearch && (!status || lead.status === status);
    });

    setText("lead-count", `${filtered.length} leads`);

    if (!filtered.length) {
      table.innerHTML = '<tr><td colspan="6" class="empty-state">No matching leads found.</td></tr>';
      return;
    }

    table.innerHTML = filtered.map(lead => `
      <tr>
        <td>${escapeHTML(lead.name)}</td>
        <td>${escapeHTML(lead.email)}</td>
        <td>${escapeHTML(lead.service || "—")}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${formatDate(lead.created_at)}</td>
        <td>
          <a class="action-button" href="add-lead.html?id=${encodeURIComponent(lead.id)}">Edit</a>
          <button class="action-button delete-button" data-delete="${escapeHTML(lead.id)}">Delete</button>
        </td>
      </tr>
    `).join("");
  }

  function renderReports() {
    const total = leads.length;
    const fresh = leads.filter(x => x.status === "New").length;
    const contacted = leads.filter(x => x.status === "Contacted").length;
    const converted = leads.filter(x => x.status === "Converted").length;
    const rate = total ? Math.round(converted / total * 100) : 0;

    setText("report-total", total);
    setText("report-new", fresh);
    setText("report-contacted", contacted);
    setText("report-converted", converted);
    setText("report-rate", rate + "%");

    const progress = $("report-progress");
    if (progress) progress.style.width = rate + "%";

    setText("breakdown-new", fresh);
    setText("breakdown-contacted", contacted);
    setText("breakdown-converted", converted);

    const percentage = count => total ? (count / total * 100) + "%" : "0%";

    if ($("bar-new")) $("bar-new").style.width = percentage(fresh);
    if ($("bar-contacted")) $("bar-contacted").style.width = percentage(contacted);
    if ($("bar-converted")) $("bar-converted").style.width = percentage(converted);
  }

  function renderFollowUpOptions() {
    const select = $("follow-up-lead");
    if (!select) return;

    const previous = select.value;

    select.innerHTML =
      '<option value="">Choose a lead</option>' +
      leads.map(lead => `
        <option value="${escapeHTML(lead.id)}">${escapeHTML(lead.name)} — ${escapeHTML(lead.service || "No service")}</option>
      `).join("");

    if (leads.some(lead => String(lead.id) === previous)) {
      select.value = previous;
    }
  }

  async function deleteLead(id) {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    const { error } = await db
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);

    if (error) {
      alert("Could not delete lead: " + error.message);
      return;
    }

    await loadLeads();
  }

  async function saveLead(event) {
    event.preventDefault();

    const id = $("lead-id")?.value || "";
    const name = $("lead-name")?.value.trim();
    const email = $("lead-email")?.value.trim();
    const service = $("lead-business")?.value.trim();
    const status = $("lead-status")?.value || "New";

    if (!name || !email || !service) {
      showMessage("Please complete all fields.", true);
      return;
    }

    const payload = { name, email, service, status };
    let result;

    if (id) {
      result = await db.from("leads")
        .update(payload)
        .eq("id", id)
        .eq("user_id", currentUser.id);
    } else {
      result = await db.from("leads")
        .insert({ ...payload, user_id: currentUser.id });
    }

    if (result.error) {
      showMessage("Could not save lead: " + result.error.message, true);
      return;
    }

    showMessage(id ? "Lead updated successfully." : "Lead added successfully.");

    setTimeout(() => {
      location.href = "leads.html";
    }, 800);
  }

  function setupAddLead() {
    const form = $("lead-form");
    if (!form) return;

    const id = new URLSearchParams(location.search).get("id");

    if (id) {
      const lead = leads.find(item => String(item.id) === id);

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
      location.href = "leads.html";
    });
  }

  function generateFollowUp() {
    const id = $("follow-up-lead")?.value;
    const type = $("message-type")?.value;
    const channel = $("message-service")?.value;
    const output = $("generated-message");

    const lead = leads.find(item => String(item.id) === id);

    if (!lead) {
      setText("generator-feedback", "Please select a lead first.");
      return;
    }

    const name = lead.name.split(" ")[0];
    const service = lead.service || "your project";

    const templates = {
      initial: `Hi ${name},\n\nI hope you're doing well. I'm following up regarding ${service}. I'd love to know if you're still interested and whether you have any questions I can help answer.\n\nLooking forward to hearing from you.`,
      reminder: `Hi ${name},\n\nJust checking in to see if you've had a chance to review our previous conversation about ${service}. Let me know if there's anything you'd like me to clarify.\n\nThanks!`,
      proposal: `Hi ${name},\n\nI wanted to follow up on the proposal for ${service}. I'd be happy to discuss the details and answer any questions you may have.\n\nPlease let me know what works best for you.`,
      closing: `Hi ${name},\n\nI wanted to check in one last time regarding ${service}. If you're ready to move forward, I'd be glad to discuss the next steps. If your plans have changed, that's completely fine too.\n\nThank you for your time.`
    };

    let message = templates[type] || templates.initial;

    if (channel === "whatsapp") {
      message = message.replace(/\n\n/g, "\n");
    }

    if (channel === "linkedin") {
      message = message.replace("Hi ", "Hello ");
    }

    output.value = message;
    setText("generator-feedback", "Message generated. Review it before sending.");
  }

  function setupPage() {
    $("search-leads")?.addEventListener("input", renderLeadList);
    $("filter-status")?.addEventListener("change", renderLeadList);

    $("leads-list")?.addEventListener("click", event => {
      const button = event.target.closest("[data-delete]");
      if (button) deleteLead(button.dataset.delete);
    });

    setupAddLead();

    $("generate-message")?.addEventListener("click", generateFollowUp);

    $("copy-message")?.addEventListener("click", async () => {
      const message = $("generated-message")?.value || "";

      if (!message) {
        setText("generator-feedback", "Generate a message first.");
        return;
      }

      try {
        await navigator.clipboard.writeText(message);
        setText("generator-feedback", "Message copied.");
      } catch {
        $("generated-message").select();
        document.execCommand("copy");
        setText("generator-feedback", "Message copied.");
      }
    });

    const signOut = async () => {
      const { error } = await db.auth.signOut();

      if (error) {
        alert("Unable to sign out: " + error.message);
        return;
      }

      location.href = "login.html";
    };

    $("sign-out")?.addEventListener("click", signOut);
    $("settings-sign-out")?.addEventListener("click", signOut);
  }

  function showMessage(message, isError = false) {
    const element = $("form-message") || $("page-message");
    if (!element) {
      if (isError) console.error(message);
      return;
    }

    element.textContent = message;
    element.className = isError ? "feedback error" : "feedback";
  }

  window.rf = {
    db,
    getLeads: () => leads,
    refresh: loadLeads
  };

  db.auth.onAuthStateChange(event => {
    if (event === "SIGNED_OUT") location.href = "login.html";
  });

  initialise();
})();
