
"use strict";

// ==========================================
// REVENUEFORGE - AUTHENTICATION
// ==========================================

// Check Supabase configuration before creating the client.
if (
  !window.supabase ||
  !window.REVENUEFORGE_SUPABASE_URL ||
  !window.REVENUEFORGE_SUPABASE_KEY
) {
  console.error("RevenueForge: Supabase configuration is missing.");

  const message = document.getElementById("auth-message");

  if (message) {
    message.textContent =
      "Connection error. Please contact support.";
    message.classList.add("error");
  }
} else {
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

  const dashboardUrl = new URL(
    "index.html",
    window.location.href
  ).href;

  // ==========================================
  // HELPERS
  // ==========================================

  function showMessage(message, isError = false) {
    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.classList.toggle("error", isError);
    authMessage.setAttribute("role", "status");
  }

  function setLoading(loading, action = "signin") {
    if (signInButton) {
      signInButton.disabled = loading;
      signInButton.textContent =
        loading && action === "signin"
          ? "Signing In..."
          : "Sign In";
    }

    if (signUpButton) {
      signUpButton.disabled = loading;
      signUpButton.textContent =
        loading && action === "signup"
          ? "Creating Account..."
          : "Create Account";
    }
  }

  function getCredentials() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !emailInput.checkValidity()) {
      throw new Error("Enter a valid email address.");
    }

    if (password.length < 6) {
      throw new Error(
        "Your password must contain at least 6 characters."
      );
    }

    return { email, password };
  }

  // ==========================================
  // SIGN IN
  // ==========================================

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    setLoading(true, "signin");
    showMessage("Signing in...");

    try {
      const { email, password } = getCredentials();

      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (!data.session) {
        throw new Error(
          "Sign-in did not create a session. Please try again."
        );
      }

      showMessage("Login successful. Opening your workspace...");

      window.location.replace(dashboardUrl);

    } catch (error) {
      console.error("Sign-in error:", error);

      showMessage(
        error.message || "Unable to sign in. Please try again.",
        true
      );

    } finally {
      setLoading(false);
    }
  });

  // ==========================================
  // CREATE ACCOUNT
  // ==========================================

  signUpButton?.addEventListener("click", async () => {
    setLoading(true, "signup");
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
        showMessage(
          "Account created successfully. Opening your workspace..."
        );

        window.location.replace(dashboardUrl);

      } else {
        showMessage(
          "Account created. Check your email to confirm your account, then return here and sign in."
        );
      }

    } catch (error) {
      console.error("Sign-up error:", error);

      showMessage(
        error.message || "Unable to create your account.",
        true
      );

    } finally {
      setLoading(false);
    }
  });

  // ==========================================
  // EXISTING SESSION CHECK
  // ==========================================

  async function checkExistingSession() {
    try {
      const { data, error } =
        await supabaseClient.auth.getSession();

      if (error) throw error;

      if (data.session) {
        window.location.replace(dashboardUrl);
      } else {
        showMessage(
          "Sign in or create an account to continue."
        );
      }

    } catch (error) {
      console.error("Session check error:", error);

      showMessage(
        "Connection error. Check your internet connection and try again.",
        true
      );
    }
  }

  // ==========================================
  // START AUTHENTICATION
  // ==========================================

  checkExistingSession();
}
