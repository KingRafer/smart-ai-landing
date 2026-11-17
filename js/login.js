// Toggle password visibility
const togglePass = document.getElementById('toggle-pass');
const passwordInput = document.getElementById('password');
const eyeOpen = togglePass.querySelector('.eye-open');
const eyeClosed = togglePass.querySelector('.eye-closed');

togglePass.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  eyeOpen.style.display = isHidden ? 'none' : 'block';
  eyeClosed.style.display = isHidden ? 'block' : 'none';
});

// Login form handler
const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  errorMsg.classList.remove('show');
  errorMsg.textContent = '';

  if (!email || !password) {
    errorMsg.textContent = 'Email/username dan password wajib diisi.';
    errorMsg.classList.add('show');
    return;
  }

  if (password.length < 6) {
    errorMsg.textContent = 'Password minimal 6 karakter.';
    errorMsg.classList.add('show');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Memproses...';

  // Frontend-only demo: simulasikan login lalu arahkan ke WhatsApp admin
  // (nanti diganti dengan API backend / autentikasi sungguhan)
  setTimeout(() => {
    const text = encodeURIComponent(
      'Halo Admin Smart AI, saya ingin login ke akun member.\n\nEmail/Username: ' + email
    );

    // Reset tombol
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk →';

    // Buka WhatsApp untuk konfirmasi akses (sementara)
    window.open('https://wa.me/6282137585596?text=' + text, '_blank');

    errorMsg.style.background = 'rgba(52,211,153,.1)';
    errorMsg.style.borderColor = 'rgba(52,211,153,.3)';
    errorMsg.style.color = 'var(--green)';
    errorMsg.textContent = 'Permintaan login dikirim. Tim akan menghubungi Anda via WhatsApp untuk verifikasi akses.';
    errorMsg.classList.add('show');
  }, 800);
});

// Lupa password → arahkan ke WhatsApp
document.getElementById('forgot-link').addEventListener('click', (e) => {
  e.preventDefault();
  const text = encodeURIComponent('Halo Admin Smart AI, saya lupa password akun member. Mohon bantu reset.');
  window.open('https://wa.me/6282137585596?text=' + text, '_blank');
});
