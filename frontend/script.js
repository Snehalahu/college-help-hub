console.log("Script loaded");

// ================= API BASE =================
const API = "http://localhost:5000/api";

// ================= SAFE DOM LOAD =================
document.addEventListener("DOMContentLoaded", () => {

  // ================= NAVBAR =================
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // ================= SHOW USER =================
  const userBtn = document.getElementById("userBtn");

  if (userBtn) {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user) {
      userBtn.innerText = "Hi, " + user.username;
      userBtn.href = "#";

      const modal = document.getElementById("logoutModal");
      const confirmBtn = document.getElementById("confirmLogout");
      const cancelBtn = document.getElementById("cancelLogout");

      userBtn.addEventListener("click", () => {
        modal.style.display = "flex";
      });

      if (confirmBtn && cancelBtn) {
        confirmBtn.addEventListener("click", () => {
          localStorage.removeItem("user");
          window.location.reload();
        });

        cancelBtn.addEventListener("click", () => {
          modal.style.display = "none";
        });
      }
    }
  }

  // ================= SCROLL ANIMATIONS =================
  const animatedElements = document.querySelectorAll(
    '.feature-card, .note-card, .internship-card, .doubt-card, .event-card'
  );

  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    });

    animatedElements.forEach(el => observer.observe(el));
  }

  // ================= SIGNUP FORM =================
  // FIX: This handler was completely missing — signup did nothing on submit.
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("username").value;
      const email    = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (res.ok) {
          alert("Account created successfully! Please login.");
          window.location.href = "login.html";
        } else {
          alert(data.message || "Signup failed ❌");
        }

      } catch (err) {
        console.error("Signup error:", err);
        alert("Server not responding ❌");
      }
    });
  }

  // ================= LOGIN FORM =================
  // FIX: Removed the broken loginForm handler that was here.
  //
  // The old handler had two problems:
  //   1. It tried to read getElementById("username") which does NOT exist in
  //      login.html — causing a null crash before the fetch even ran.
  //   2. login.html already has its own inline <script> that correctly handles
  //      the login form. Having two listeners on the same form caused a double
  //      submission race, and the script.js one always crashed first.
  //
  // Solution: login.html's inline script handles login entirely. Nothing to do here.

  // ================= LOAD NOTES =================
  const notesContainer = document.getElementById("notesContainer");

  if (notesContainer) {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      // Show a friendly prompt instead of a blank section
      notesContainer.innerHTML = `
        <p style="color:var(--text-secondary);font-size:0.9rem;">
          <a href="login.html" style="color:var(--primary);font-weight:700;">Login</a>
          to view your notes.
        </p>`;
    } else {
      fetch(`${API}/notes/user/${user.id}`)
        .then(res => res.json())
        .then(data => {
          notesContainer.innerHTML = "";

          data.forEach(note => {
            const card = document.createElement("div");
            card.className = "note-card";

            card.innerHTML = `
              <div class="note-thumb purple-bg">
                <i class="fas fa-book"></i>
              </div>
              <span class="note-subject">${note.subject}</span>
              <h4>${note.title}</h4>
              <p>${note.content}</p>
              <button class="btn-download">Download</button>
            `;

            notesContainer.appendChild(card);
            setTimeout(() => card.classList.add("visible"), 100);
          });
        })
        .catch(err => {
          console.error("Error loading notes:", err);
        });
    }
  }

}); // end DOMContentLoaded

// ===== SUCCESS MODAL FUNCTIONS =====
function showSuccessModal() {
  const modal = document.getElementById("successModal");
  if (modal) modal.style.display = "flex";
}

function closeSuccessModal() {
  const modal = document.getElementById("successModal");
  if (modal) modal.style.display = "none";
  window.location.href = "index.html";
}

console.log("✅ College Help Hub loaded successfully!");