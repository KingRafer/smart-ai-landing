// Tampilkan / sembunyikan password (untuk kedua field)
document.querySelectorAll('.toggle-pass').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var input = document.getElementById(btn.dataset.target);
    var hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    btn.querySelector('.eye-open').style.display = hidden ? 'none' : 'block';
    btn.querySelector('.eye-closed').style.display = hidden ? 'block' : 'none';
    btn.setAttribute('aria-label', hidden ? 'Sembunyikan password' : 'Tampilkan password');
  });
});

// Isi kode referral otomatis dari link, mis. daftar.html?ref=ABC123
(function () {
  var p = new URLSearchParams(location.search);
  var ref = p.get('ref') || p.get('referral');
  if (ref) document.getElementById('referral').value = ref.trim().slice(0, 30);
})();

var errorMsg = document.getElementById('error-msg');
function showError(msg, field) {
  document.querySelectorAll('.form-group input.invalid').forEach(function (i) {
    i.classList.remove('invalid');
  });
  errorMsg.textContent = msg;
  errorMsg.classList.add('show');
  if (field) {
    field.classList.add('invalid');
    field.focus();
  }
  errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleSubmit(e) {
  e.preventDefault();
  errorMsg.classList.remove('show');

  var f = e.target;
  var nama = f.nama.value.trim();
  var wa = f.wa.value.trim();
  var email = f.email.value.trim();
  var pass = f.password.value;
  var pass2 = f.password2.value;
  var referral = f.referral.value.trim();

  if (!nama) return showError('Nama lengkap wajib diisi.', f.nama);
  if (!/^[0-9]{10,15}$/.test(wa)) return showError('Nomor WhatsApp harus 10-15 digit angka.', f.wa);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Format email tidak valid.', f.email);
  if (pass.length < 8) return showError('Password minimal 8 karakter.', f.password);
  if (pass !== pass2) return showError('Konfirmasi password tidak sama dengan password.', f.password2);

  var btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';

  // Password sengaja TIDAK dikirim lewat WhatsApp.
  // Penyimpanan akun/password harus lewat backend (lihat catatan integrasi).
  var text = encodeURIComponent(
    'Halo Admin Smart AI, saya ingin registrasi.\n\n' +
    'Nama: ' + nama +
    '\nEmail: ' + email +
    '\nWhatsApp: ' + wa +
    '\nReferral: ' + (referral || '-')
  );

  setTimeout(function () {
    document.getElementById('form-view').style.display = 'none';
    document.getElementById('success-view').classList.add('show');
    window.open('https://wa.me/6282137585596?text=' + text, '_blank');
  }, 600);
}

document.getElementById('interest-form').addEventListener('submit', handleSubmit);
