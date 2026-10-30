"use strict";

const supabaseClient = window.supabase.createClient(
  window.REVENUEFORGE_SUPABASE_URL,
  window.REVENUEFORGE_SUPABASE_KEY
);

const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const signInButton = document.getElementById("sign-in-button");
const signUpButton = document.getElementById("sign-up-button");
const authMessage = document.getElementById("auth-message");

const dashboardUrl = new URL("index.html", window.location.href).href;

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setLoading(loading) {
  signInButton.disabled = loading;
  signUpButton.disabled = loading;
}

function getCredentials() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !emailInput.checkValidity()) {
    throw new Error("Enter a valid email address.");
  }

  if (password.length < 6) {
    throw new Error("Your password must contain at least 6 characters.");
  }

  return { email, password };
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoading(true);
  showMessage("Signing in...");

  try {
    const { email, password } = getCredentials();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error("Sign-in did not create a session. Please try again.");
    }

    showMessage("Login successful. Opening your workspace...");

    window.location.replace(dashboardUrl);
  } catch (error) {
    showMessage(error.message || "Unable to sign in.", true);
  } finally {
    setLoading(false);
  }
});

signUpButton.addEventListener("click", async () => {
  setLoading(true);
  showMessage("Creating your account...");

  try {
    const { email, password } = getCredentials();

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: dashboardUrl
      }
    });

    if (error) throw error;

    if (data.session) {
      showMessage("Account created. Opening your workspace...");
      window.location.replace(dashboardUrl);
    } else {
      showMessage(
        "Account created. Check your email to confirm your account, then return here and sign in."
      );
    }
  } catch (error) {
    showMessage(error.message || "Unable to create your account.", true);
  } finally {
    setLoading(false);
  }
});

async function checkExistingSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session) {
      window.location.replace(dashboardUrl);
    } else {
      showMessage("Sign in or create an account to continue.");
    }
  } catch (error) {
    showMessage(
      "Connection error. Check your Supabase configuration and try again.",
      true
    );
  }
}

checkExistingSession();
