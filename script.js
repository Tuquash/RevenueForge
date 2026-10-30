```javascript
"use strict";

// ==========================================
// REVENUEFORGE — LEAD MANAGEMENT DASHBOARD
// ==========================================

const $ = (id) => document.getElementById(id);

const year = $("year");
if (year) year.textContent = new Date().getFullYear();

const form = $("lead-form");
const table = $("leads-table");
const searchInput = $("search-leads");
const filterStatus = $("filter-status");
const formTitle = $("form-title");
const saveButton = $("save-button");
const cancelButton = $("cancel-edit");
const formMessage = $("form-message");

const fields = {
  id: $("lead-id"),
  name: $("lead-name"),
  email: $("lead-email"),
  business: $("lead-business"),
  status: $("lead-status")
};

const STORAGE_KEY = "revenueforge_leads_v1";
let leads = loadLeads();

// ==========================================
// STORAGE
// ==========================================

function loadLeads() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return saved.filter(
      (lead) =>
        lead &&
        typeof lead.id === "string" &&
        typeof lead.name === "string" &&
        typeof lead.email === "string" &&
        typeof lead.business === "string" &&
        ["New", "Contacted", "Converted"].includes(lead.status)
    );
  } catch (error) {
    console.error("RevenueForge: Could not load leads.", error);
    return [];
  }
}

function saveLeads() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    return true;
  } catch (error) {
    console.error("RevenueForge: Could not save leads.", error);
    showFormMessage(
      "Could not save data. Check your browser storage settings.",
      true
    );
    return false;
  }
}

// ==========================================
// GENERAL HELPERS
// ==========================================

function showFormMessage(message, isError = false) {
  if (!formMessage) return;

  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function showGeneratorMessage(message, isError = false) {
  const feedback = $("generator-feedback");

  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function updateDashboard() {
  const counters = {
    "total-leads": leads.length,
    "new-leads": leads.filter((lead) => lead.status === "New").length,
    "contacted-leads": leads.filter(
      (lead) => lead.status === "Contacted"
    ).length,
    "converted-leads": leads.filter(
      (lead) => lead.status === "Converted"
    ).length
  };

  Object.entries(counters).forEach(([id, value]) => {
    const element = $(id);
    if (element) element.textContent = value;
  });
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

// ==========================================
// LEAD TABLE
// ==========================================

function renderLeads() {
  if (!table) {
    console.error("RevenueForge: Element #leads-table is missing.");
    updateFollowUpLeads();
    updateDashboard();
    return;
  }

  const query = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  const selectedStatus = filterStatus
    ? filterStatus.value
    : "All";

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = [
      lead.name,
      lead.email,
      lead.business
    ].some((value) => value.toLowerCase().includes(query));

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
  } else {
    filteredLeads.forEach((lead) => {
      const row = document.createElement("tr");

      row.appendChild(createCell(lead.name));
      row.appendChild(createCell(lead.email));
      row.appendChild(createCell(lead.business));

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");

      badge.className =
        `status-badge status-${lead.status.toLowerCase()}`;
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
  }

  updateDashboard();
  updateFollowUpLeads();
}

// ==========================================
// ADD AND EDIT LEADS
// ==========================================

function resetForm() {
  if (!form) return;

  form.reset();

  if (fields.id) fields.id.value = "";
  if (formTitle) formTitle.textContent = "Add a new lead";
  if (saveButton) saveButton.textContent = "Save Lead";
  if (cancelButton) cancelButton.hidden = true;

  showFormMessage("");
}

function editLead(id) {
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;

  fields.id.value = lead.id;
  fields.name.value = lead.name;
  fields.email.value = lead.email;
  fields.business.value = lead.business;
  fields.status.value = lead.status;

  if (formTitle) formTitle.textContent = "Edit lead";
  if (saveButton) saveButton.textContent = "Update Lead";
  if (cancelButton) cancelButton.hidden = false;

  showFormMessage("");

  const section = $("add-lead");

  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

function deleteLead(id) {
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;

  if (
    !window.confirm(
      `Delete the lead "${lead.name}"? This cannot be undone.`
    )
  ) {
    return;
  }

  const previousLeads = leads;
  leads = leads.filter((item) => item.id !== id);

  if (!saveLeads()) {
    leads = previousLeads;
    return;
  }

  if (fields.id && fields.id.value === id) {
    resetForm();
  }

  renderLeads();
  showFormMessage("Lead deleted.");
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = fields.name.value.trim();
    const email = fields.email.value.trim();
    const business = fields.business.value.trim();
    const status = fields.status.value;
    const editingId = fields.id.value;

    if (!name || !email || !business) {
      showFormMessage("Complete all fields before saving.", true);
      return;
    }

    if (!["New", "Contacted", "Converted"].includes(status)) {
      showFormMessage("Choose a valid lead status.", true);
      return;
    }

    const duplicateEmail = leads.some(
      (lead) =>
        lead.email.toLowerCase() === email.toLowerCase() &&
        lead.id !== editingId
    );

    if (duplicateEmail) {
      showFormMessage(
        "A lead with this email address already exists.",
        true
      );
      return;
    }

    const previousLeads = leads;

    if (editingId) {
      leads = leads.map((lead) =>
        lead.id === editingId
          ? { ...lead, name, email, business, status }
          : lead
      );
    } else {
      const id =
        window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      leads.push({
        id,
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

    showFormMessage(
      editingId
        ? "Lead updated successfully."
        : "Lead added successfully."
    );
  });
}

if (searchInput) {
  searchInput.addEventListener("input", renderLeads);
}

if (filterStatus) {
  filterStatus.addEventListener("change", renderLeads);
}

if (cancelButton) {
  cancelButton.addEventListener("click", resetForm);
}

const addLeadButton = $("add-lead-button");

if (addLeadButton) {
  addLeadButton.addEventListener("click", () => {
    resetForm();

    const section = $("add-lead");

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    if (fields.name) {
      fields.name.focus({ preventScroll: true });
    }
  });
}

// ==========================================
// FOLLOW-UP MESSAGE GENERATOR
// ==========================================

const followUpLead = $("follow-up-lead");
const messageType = $("message-type");
const messageService = $("message-service");
const generatedMessage = $("generated-message");
const generateMessageButton = $("generate-message");
const copyMessageButton = $("copy-message");

function updateFollowUpLeads() {
  if (!followUpLead) return;

  const previousSelection = followUpLead.value;

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

  if (leads.some((lead) => lead.id === previousSelection)) {
    followUpLead.value = previousSelection;
  }
}

function generateFollowUpMessage() {
  if (
    !followUpLead ||
    !messageType ||
    !generatedMessage
  ) {
    showGeneratorMessage(
      "The generator is missing an HTML element. Check the page HTML.",
      true
    );
    console.error(
      "RevenueForge: Check IDs follow-up-lead, message-type, and generated-message."
    );
    return;
  }

  const selectedLead = leads.find(
    (lead) => lead.id === followUpLead.value
  );

  if (!selectedLead) {
    showGeneratorMessage("Please select a lead first.", true);
    return;
  }

  const service =
    (messageService ? messageService.value.trim() : "") ||
    selectedLead.business;

  const firstName = selectedLead.name.trim().split(/\s+/)[0];

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

  const message = templates[messageType.value];

  if (!message) {
    showGeneratorMessage("Please select a valid message type.", true);
    return;
  }

  generatedMessage.value = message;
  showGeneratorMessage("Message generated. Review it before sending.");
}

async function copyGeneratedMessage() {
  if (!generatedMessage) {
    showGeneratorMessage("The message text box is missing.", true);
    return;
  }

  const message = generatedMessage.value.trim();

  if (!message) {
    showGeneratorMessage("Generate a message first.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    showGeneratorMessage("Message copied to clipboard.");
  } catch (error) {
    generatedMessage.focus();
    generatedMessage.select();

    try {
      const copied = document.execCommand("copy");

      showGeneratorMessage(
        copied
          ? "Message copied to clipboard."
          : "Copy failed. Select and copy the message manually.",
        !copied
      );
    } catch {
      showGeneratorMessage(
        "Copy failed. Select the message and press Ctrl+C.",
        true
      );
    }
  }
}

if (generateMessageButton) {
  generateMessageButton.addEventListener(
    "click",
    generateFollowUpMessage
  );
} else {
  console.error(
    "RevenueForge: Button #generate-message is missing from index.html."
  );
}

if (copyMessageButton) {
  copyMessageButton.addEventListener(
    "click",
    copyGeneratedMessage
  );
} else {
  console.error(
    "RevenueForge: Button #copy-message is missing from index.html."
  );
}

// ==========================================
// INITIALIZE
// ==========================================

updateFollowUpLeads();
renderLeads();

console.log("RevenueForge loaded successfully.");
```
