
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
  const page = document.body.dataset.page;
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

  async function initialise() {
    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
      location.href = "login.html";
      return;
    }

    currentUser = data.session.user;
    setText("user-email", currentUser.email || "Account");

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

  function statusBadge(status) {
    const css = {
      New: "status-new",
      Contacted: "status-contacted",
      Converted: "status-converted"
    }[status] || "status-new";

    return `<span class="status-badge ${css}">${escapeHTML(status)}</span>`;
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleDateString() : "—";
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

  async function setupAddLead() {
    const form = $("lead-form");
    if (!form) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

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

  function showMessage(message, isError = false) {
    const element = $("form-message") || $("page-message");
    if (!element) {
      if (isError) console.error(message);
      return;
    }

    element.textContent = message;
    element.className = isError ? "feedback error" : "feedback";
  }

  function setupPage() {
    $("search-leads")?.addEventListener("input", renderLeadList);
    $("filter-status")?.addEventListener("change", renderLeadList);

    $("leads-list")?.addEventListener("click", event => {
      const button = event.target.closest("[data-delete]");
      if (button) deleteLead(button.dataset.delete);
    });

    setupAddLead();

    $("sign-out")?.addEventListener("click", async () => {
      const { error } = await db.auth.signOut();

      if (error) {
        alert("Unable to sign out. Please try again.");
        return;
      }

      location.href = "login.html";
    });
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
