"use strict";

// ========================================
// REVENUEFORGE - CLOUD DASHBOARD
// ========================================

const $ = (id) => document.getElementById(id);

const supabaseClient = window.supabase.createClient(
  window.REVENUEFORGE_SUPABASE_URL,
  window.REVENUEFORGE_SUPABASE_KEY
);

let currentUser = null;
let leads = [];
let editingId = null;

// Dashboard elements
const signOutButton = $("sign-out-button");
const form = $("lead-form");
const table = $("leads-table");
const searchInput = $("search-leads");
const filterStatus = $("filter-status");
const followUpLead = $("follow-up-lead");
const messageType = $("message-type");
const messageService = $("message-service");
const generatedMessage = $("generated-message");

$("year").textContent = new Date().getFullYear();

// ========================================
// MESSAGE HELPERS
// ========================================

function showFormMessage(message, isError = false) {
  const element = $("form-message");

  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", isError);
}

function showGeneratorMessage(message, isError = false) {
  const element = $("generator-feedback");

  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", isError);
}

// ========================================
// AUTHENTICATION
// ========================================

async function signOut() {
  signOutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    window.location.replace("login.html");
  } catch (error) {
    console.error("Sign-out error:", error.message);
    alert("Could not sign out: " + error.message);
    signOutButton.disabled = false;
  }
}

signOutButton.addEventListener("click", signOut);

// ========================================
// CLOUD DATABASE
// ========================================

async function loadLeads() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  leads = data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    business: row.service || "",
    status: row.status,
    createdAt: row.created_at
  }));

  renderLeads();
}

async function addLead(lead) {
  const { data, error } = await supabaseClient
    .from("leads")
    .insert({
      user_id: currentUser.id,
      name: lead.name,
      email: lead.email,
      service: lead.business,
      status: lead.status
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateLead(id, lead) {
  const { error } = await supabaseClient
    .from("leads")
    .update({
      name: lead.name,
      email: lead.email,
      service: lead.business,
      status: lead.status
    })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    throw error;
  }
}

async function deleteLeadFromDatabase(id) {
  const { error } = await supabaseClient
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    throw error;
  }
}

// ========================================
// DASHBOARD STATISTICS
// ========================================

function updateDashboard() {
  $("total-leads").textContent = leads.length;

  $("new-leads").textContent = leads.filter(
    (lead) => lead.status === "New"
  ).length;

  $("contacted-leads").textContent = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;

  $("converted-leads").textContent = leads.filter(
    (lead) => lead.status === "Converted"
  ).length;
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function createActionButton(label, className, handler) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;
  button.className = `action-button ${className || ""}`.trim();

  button.addEventListener("click", handler);

  return button;
}

// ========================================
// RENDER LEADS
// ========================================

function renderLeads() {
  if (!table) return;

  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterStatus.value;

  const filtered = leads.filter((lead) => {
    const matchesSearch = [
      lead.name,
      lead.email,
      lead.business
    ].some((value) => value.toLowerCase().includes(query));

    return (
      matchesSearch &&
      (selectedStatus === "All" || lead.status === selectedStatus)
    );
  });

  table.replaceChildren();

  if (filtered.length === 0) {
    const row = document.createElement("tr");

    const cell = createCell(
      leads.length === 0
        ? "No leads yet. Add your first lead to get started."
        : "No leads match your search or filter."
    );

    cell.colSpan = 5;
    cell.className = "empty-state";

    row.appendChild(cell);
    table.appendChild(row);
  }

  filtered.forEach((lead) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(lead.name));
    row.appendChild(createCell(lead.email));
    row.appendChild(createCell(lead.business));

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = `status-badge status-${lead.status.toLowerCase()}`;
    badge.textContent = lead.status;

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actions = document.createElement("td");

    // Edit lead
    actions.appendChild(
      createActionButton("Edit", "", () => {
        editingId = lead.id;

        $("lead-name").value = lead.name;
        $("lead-email").value = lead.email;
        $("lead-business").value = lead.business;
        $("lead-status").value = lead.status;

        $("form-title").textContent = "Edit lead";
        $("save-button").textContent = "Update Lead";
        $("cancel-edit").hidden = false;

        $("add-lead").scrollIntoView({
          behavior: "smooth"
        });
      })
    );

    // Delete lead
    actions.appendChild(
      createActionButton("Delete", "delete-button", async () => {
        const confirmed = confirm(
          `Delete the lead "${lead.name}"? This cannot be undone.`
        );

        if (!confirmed) return;

        try {
          await deleteLeadFromDatabase(lead.id);

          leads = leads.filter((item) => item.id !== lead.id);

          renderLeads();
          showFormMessage("Lead deleted successfully.");
        } catch (error) {
          showFormMessage(error.message, true);
        }
      })
    );

    row.appendChild(actions);
    table.appendChild(row);
  });

  updateDashboard();
  updateFollowUpLeads();
}

// ========================================
// ADD AND EDIT LEADS
// ========================================

function resetForm() {
  form.reset();

  editingId = null;

  $("form-title").textContent = "Add a new lead";
  $("save-button").textContent = "Save Lead";
  $("cancel-edit").hidden = true;

  showFormMessage("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showFormMessage("Please sign in before saving leads.", true);
    return;
  }

  const lead = {
    name: $("lead-name").value.trim(),
    email: $("lead-email").value.trim(),
    business: $("lead-business").value.trim(),
    status: $("lead-status").value
  };

  if (!lead.name || !lead.email || !lead.business) {
    showFormMessage("Complete all fields before saving.", true);
    return;
  }

  if (
    !["New", "Contacted", "Converted"].includes(lead.status)
  ) {
    showFormMessage("Choose a valid lead status.", true);
    return;
  }

  const duplicate = leads.some(
    (item) =>
      item.email.toLowerCase() === lead.email.toLowerCase() &&
      item.id !== editingId
  );

  if (duplicate) {
    showFormMessage(
      "A lead with this email address already exists.",
      true
    );
    return;
  }

  const saveButton = $("save-button");
  saveButton.disabled = true;

  try {
    if (editingId) {
      await updateLead(editingId, lead);

      leads = leads.map((item) =>
        item.id === editingId
          ? { ...item, ...lead }
          : item
      );

      showFormMessage("Lead updated successfully.");
    } else {
      const saved = await addLead(lead);

      leads.unshift({
        id: saved.id,
        name: saved.name,
        email: saved.email,
        business: saved.service || "",
        status: saved.status,
        createdAt: saved.created_at
      });

      showFormMessage("Lead saved to the cloud.");
    }

    resetForm();
    renderLeads();
  } catch (error) {
    showFormMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

$("cancel-edit").addEventListener("click", resetForm);

searchInput.addEventListener("input", renderLeads);
filterStatus.addEventListener("change", renderLeads);

$("add-lead-button").addEventListener("click", () => {
  resetForm();

  $("add-lead").scrollIntoView({
    behavior: "smooth"
  });

  $("lead-name").focus({
    preventScroll: true
  });
});

$("add-lead-button-secondary").addEventListener("click", () => {
  $("add-lead-button").click();
});

// ========================================
// FOLLOW-UP MESSAGE GENERATOR
// ========================================

function updateFollowUpLeads() {
  const previous = followUpLead.value;

  followUpLead.replaceChildren();

  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = "Select a lead";

  followUpLead.appendChild(placeholder);

  leads.forEach((lead) => {
    const option = document.createElement("option");

    option.value = lead.id;
    option.textContent = `${lead.name} — ${lead.business}`;

    followUpLead.appendChild(option);
  });

  if (leads.some((lead) => lead.id === previous)) {
    followUpLead.value = previous;
  }
}

$("generate-message").addEventListener("click", () => {
  const lead = leads.find(
    (item) => item.id === followUpLead.value
  );

  if (!lead) {
    showGeneratorMessage("Please select a lead first.", true);
    return;
  }

  const service =
    messageService.value.trim() || lead.business;

  const firstName = lead.name.trim().split(/\s+/)[0];

  const templates = {
    first: `Hello ${firstName},

I hope you're doing well. I'm reaching out regarding ${service}. I'd be happy to learn more about your needs and discuss how we might help.

Would you be available for a brief conversation?

Best regards`,

    followup: `Hello ${firstName},

I'm following up on my previous message regarding ${service}. I wanted to check whether this is something you'd still like to discuss.

Please let me know if you have any questions.

Best regards`,

    closing: `Hello ${firstName},

Thank you for considering our ${service} service. I'd be glad to discuss the next steps and answer any remaining questions.

Would you be ready to move forward, or is there anything else you'd like clarified first?

Best regards`
  };

  generatedMessage.value = templates[messageType.value];

  showGeneratorMessage(
    "Message generated. Review it before sending."
  );
});

$("copy-message").addEventListener("click", async () => {
  if (!generatedMessage.value.trim()) {
    showGeneratorMessage("Generate a message first.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(
      generatedMessage.value
    );

    showGeneratorMessage("Message copied to clipboard.");
  } catch {
    generatedMessage.focus();
    generatedMessage.select();

    showGeneratorMessage(
      "Press Ctrl+C to copy the selected message."
    );
  }
});

// ========================================
// INITIALIZE DASHBOARD
// ========================================

async function initialize() {
  signOutButton.hidden = true;

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    currentUser = data.session?.user || null;

    // Send signed-out visitors to the separate login page.
    if (!currentUser) {
      window.location.replace("login.html");
      return;
    }

    signOutButton.hidden = false;

    await loadLeads();
  } catch (error) {
    console.error(
      "RevenueForge initialization failed:",
      error
    );

    alert(
      "Could not load your workspace: " + error.message
    );
  }
}

// Redirect to login if the user signs out in another tab.
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT" || !session) {
    currentUser = null;
    leads = [];

    window.location.replace("login.html");
  }
});

initialize();
