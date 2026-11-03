
(function () {
  const configUrl =
    typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL :
    window.SUPABASE_URL ||
    window.supabaseUrl;

  const configKey =
    typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY :
    typeof SUPABASE_KEY !== "undefined" ? SUPABASE_KEY :
    window.SUPABASE_ANON_KEY ||
    window.SUPABASE_KEY ||
    window.supabaseKey;

  if (!configUrl || !configKey || !window.supabase) {
    console.error("RevenueForge: Supabase configuration is missing.");
    return;
  }

  const db = window.supabase.createClient(configUrl, configKey);
  const page = document.body.dataset.page;

  let leads = [];

  window.rf = {
    db,
    getLeads: () => leads,
    setLeads: (items) => {
      leads = items;
      renderDashboard();
    },
    refresh: loadLeads
  };

  async function checkSession() {
    const { data, error } = await db.auth.getSession();

    if (error || !data.session) {
      window.location.href = "login.html";
      return null;
    }

    const user = data.session.user;

    const email = document.getElementById("user-email");
    if (email) email.textContent = user.email || "Account";

    return user;
  }

  async function loadLeads() {
    const user = await checkSession();
    if (!user) return;

    const { data, error } = await db
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load leads:", error);
      const table = document.getElementById("recent-leads");
      if (table) {
        table.innerHTML =
          '<tr><td colspan="5" class="empty-state">Unable to load leads. Check your database connection.</td></tr>';
      }
      return;
    }

    leads = data || [];
    renderDashboard();
  }

  function renderDashboard() {
    const total = leads.length;
    const fresh = leads.filter(x => x.status === "New").length;
    const contacted = leads.filter(x => x.status === "Contacted").length;
    const converted = leads.filter(x => x.status === "Converted").length;
    const rate = total ? Math.round((converted / total) * 100) : 0;

    setText("total-leads", total);
    setText("new-leads", fresh);
    setText("contacted-leads", contacted);
    setText("converted-leads", converted);

    setText("pipeline-new", fresh);
    setText("pipeline-contacted", contacted);
    setText("pipeline-converted", converted);
    setText("conversion-rate", rate + "%");

    const table = document.getElementById("recent-leads");

    if (!table) return;

    if (!leads.length) {
      table.innerHTML =
        '<tr><td colspan="5" class="empty-state">No leads yet. Add your first lead to get started.</td></tr>';
      return;
    }

    table.innerHTML = leads.slice(0, 5).map(lead => {
      const date = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString()
        : "—";

      const statusClass = {
        New: "status-new",
        Contacted: "status-contacted",
        Converted: "status-converted"
      }[lead.status] || "status-new";

      return `
        <tr>
          <td>${escapeHTML(lead.name)}</td>
          <td>${escapeHTML(lead.email)}</td>
          <td>${escapeHTML(lead.service || "—")}</td>
          <td><span class="status-badge ${statusClass}">${escapeHTML(lead.status)}</span></td>
          <td>${date}</td>
        </tr>
      `;
    }).join("");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  const signOutButton = document.getElementById("sign-out");

  if (signOutButton) {
    signOutButton.addEventListener("click", async () => {
      const { error } = await db.auth.signOut();

      if (error) {
        alert("Unable to sign out. Please try again.");
        return;
      }

      window.location.href = "login.html";
    });
  }

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" && page !== "login") {
      window.location.href = "login.html";
    }
  });

  loadLeads();
})();
