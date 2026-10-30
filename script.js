const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const form = document.getElementById("lead-form");
const table = document.getElementById("leads-table");
const searchInput = document.getElementById("search-leads");
const filterStatus = document.getElementById("filter-status");
const formTitle = document.getElementById("form-title");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-edit");
const formMessage = document.getElementById("form-message");

const fields = {
  id: document.getElementById("lead-id"),
  name: document.getElementById("lead-name"),
  email: document.getElementById("lead-email"),
  business: document.getElementById("lead-business"),
  status: document.getElementById("lead-status")
};

const STORAGE_KEY = "revenueforge_leads_v1";
let leads = loadLeads();

function loadLeads() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(saved)) return [];

    return saved.filter(lead =>
      lead &&
      typeof lead.id === "string" &&
      typeof lead.name === "string" &&
      typeof lead.email === "string" &&
      typeof lead.business === "string" &&
      ["New", "Contacted", "Converted"].includes(lead.status)
    );
  } catch {
    return [];
  }
}

function saveLeads() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    return true;
  } catch {
    showMessage(
      "Could not save data. Check your browser storage settings.",
      true
    );
    return false;
  }
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function updateDashboard() {
  document.getElementById("total-leads").textContent = leads.length;

  document.getElementById("new-leads").textContent =
    leads.filter(lead => lead.status === "New").length;

  document.getElementById("contacted-leads").textContent =
    leads.filter(lead => lead.status === "Contacted").length;

  document.getElementById("converted-leads").textContent =
    leads.filter(lead => lead.status === "Converted").length;
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
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

function renderLeads() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterStatus.value;

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = [
      lead.name,
      lead.email,
      lead.business
    ].some(value => value.toLowerCase().includes(query));

    const matchesStatus =
      selectedStatus === "All" || lead.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  table.replaceChildren();

  if (filteredLeads.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell(
      leads.length === 0
        ? "No leads yet. Add your first lead to get started."
        : "No leads match your search or selected filter."
    );

    cell.colSpan = 5;
    cell.className = "empty-state";
    row.appendChild(cell);
    table.appendChild(row);

    updateDashboard();
    updateFollowUpLeads();
    return;
  }

  filteredLeads.forEach(lead => {
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

    const actionsCell = document.createElement("td");

    actionsCell.appendChild(
      createActionButton("Edit", "", () => editLead(lead.id))
    );

    actionsCell.appendChild(
      createActionButton(
        "Delete",
        "delete-button",
        () => deleteLead(lead.id)
      )
    );

    row.appendChild(actionsCell);
    table.appendChild(row);
  });

  updateDashboard();
  updateFollowUpLeads();
}

function resetForm() {
  form.reset();
  fields.id.value = "";
  formTitle.textContent = "Add a new lead";
  saveButton.textContent = "Save Lead";
  cancelButton.hidden = true;
  showMessage("");
}

function editLead(id) {
  const lead = leads.find(item => item.id === id);
  if (!lead) return;

  fields.id.value = lead.id;
  fields.name.value = lead.name;
  fields.email.value = lead.email;
  fields.business.value = lead.business;
  fields.status.value = lead.status;

  formTitle.textContent = "Edit lead";
  saveButton.textContent = "Update Lead";
  cancelButton.hidden = false;

  showMessage("");

  document.getElementById("add-lead").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function deleteLead(id) {
  const lead = leads.find(item => item.id === id);
  if (!lead) return;

  if (!window.confirm(`Delete the lead "${lead.name}"? This cannot be undone.`)) {
    return;
  }

  const previousLeads = leads;
  leads = leads.filter(item => item.id !== id);

  if (!saveLeads()) {
    leads = previousLeads;
    return;
  }

  if (fields.id.value === id) resetForm();

  renderLeads();
  showMessage("Lead deleted.");
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const name = fields.name.value.trim();
  const email = fields.email.value.trim();
  const business = fields.business.value.trim();
  const status = fields.status.value;
  const editingId = fields.id.value;

  if (!name || !email || !business) {
    showMessage("Complete all fields before saving.", true);
    return;
  }

  if (!["New", "Contacted", "Converted"].includes(status)) {
    showMessage("Choose a valid lead status.", true);
    return;
  }

  const duplicateEmail = leads.some(lead =>
    lead.email.toLowerCase() === email.toLowerCase() &&
    lead.id !== editingId
  );

  if (duplicateEmail) {
    showMessage("A lead with this email address already exists.", true);
    return;
  }

  const previousLeads = leads;

  if (editingId) {
    leads = leads.map(lead =>
      lead.id === editingId
        ? { ...lead, name, email, business, status }
        : lead
    );
  } else {
    leads.push({
      id: window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      email,
      business,
      status,
      createdAt: new Date().toISOString()
    });
  }

  if (!saveLeads()) {
    leads = previousLeads;
    return;
  }

  resetForm();
  renderLeads();

  showMessage(
    editingId
      ? "Lead updated successfully."
      : "Lead added successfully."
  );
});

searchInput.addEventListener("input", renderLeads);
filterStatus.addEventListener("change", renderLeads);
cancelButton.addEventListener("click", resetForm);

document.getElementById("add-lead-button").addEventListener("click", () => {
  resetForm();

  document.getElementById("add-lead").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  fields.name.focus({ preventScroll: true });
});

// FOLLOW-UP MESSAGE GENERATOR

const followUpLead = document.getElementById("follow-up-lead");
const messageType = document.getElementById("message-type");
const messageService = document.getElementById("message-service");
const generatedMessage = document.getElementById("generated-message");
const generateMessageButton = document.getElementById("generate-message");
const copyMessageButton = document.getElementById("copy-message");
const generatorFeedback = document.getElementById("generator-feedback");

function updateFollowUpLeads() {
  if (!followUpLead) return;

  const previousSelection = followUpLead.value;

  followUpLead.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a lead";

  followUpLead.appendChild(placeholder);

  leads.forEach(lead => {
    const option = document.createElement("option");

    option.value = lead.id;
    option.textContent = `${lead.name} — ${lead.business}`;

    followUpLead.appendChild(option);
  });

  if (leads.some(lead => lead.id === previousSelection)) {
    followUpLead.value = previousSelection;
  }
}

generateMessageButton.addEventListener("click", () => {
  const selectedLead = leads.find(
    lead => lead.id === followUpLead.value
  );

  if (!selectedLead) {
    generatorFeedback.textContent = "Please select a lead first.";
    return;
  }

  const service =
    messageService.value.trim() || selectedLead.business;

  const firstName = selectedLead.name.trim().split(/\s+/)[0];
  const type = messageType.value;

  let message = "";

  if (type === "first") {
    message = `Hello ${firstName},

I hope you're doing well. I'm reaching out regarding ${service}. I'd be happy to learn more about your needs and discuss how we might help.

Would you be available for a brief conversation?

Best regards`;
  } else if (type === "followup") {
    message = `Hello ${firstName},

I'm following up on my previous message regarding ${service}. I understand you're busy, so I wanted to check whether this is something you'd still like to discuss.

Please let me know if you have any questions.

Best regards`;
  } else if (type === "closing") {
    message = `Hello ${firstName},

Thank you for considering our ${service} service. I'd be glad to discuss the next steps and answer any remaining questions.

Would you be ready to move forward, or is there anything else you'd like clarified first?

Best regards`;
  }

  generatedMessage.value = message;
  generatorFeedback.textContent =
    "Message generated. Review it before sending.";
});

copyMessageButton.addEventListener("click", async () => {
  const message = generatedMessage.value.trim();

  if (!message) {
    generatorFeedback.textContent = "Generate a message first.";
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    generatorFeedback.textContent = "Message copied to clipboard.";
  } catch {
    generatedMessage.focus();
    generatedMessage.select();

    const copied = document.execCommand("copy");

    generatorFeedback.textContent = copied
      ? "Message copied to clipboard."
      : "Copy failed. Select and copy the message manually.";
  }
});

// INITIALIZE DASHBOARD

updateFollowUpLeads();
renderLeads();
