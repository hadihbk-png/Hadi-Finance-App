// FINORA Financial Advisory - Contact & Consultation Logic
import './nav.js';
import { api, currentUser, toast, escapeHtml, formatAED } from './app.js';

document.addEventListener('DOMContentLoaded', () => {

  // Consultation Form Elements
  const form = document.getElementById('consultation-booking-form');
  const formWrapper = document.getElementById('consultation-form-wrapper');
  const confirmationPanel = document.getElementById('consultation-confirmation');
  const submitBtn = document.getElementById('btn-submit-consultation');
  const generalError = document.getElementById('form-general-error');
  const generalErrorText = document.getElementById('general-error-text');

  // Fields
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const phoneInput = document.getElementById('contact-phone');
  const countrySelect = document.getElementById('contact-country');
  const methodSelect = document.getElementById('contact-method');
  const interestSelect = document.getElementById('contact-interest');
  const dateInput = document.getElementById('contact-date');
  const messageInput = document.getElementById('contact-message');
  const honeyInput = document.getElementById('preferred_nickname');

  // Error spans
  const errName = document.getElementById('error-name');
  const errEmail = document.getElementById('error-email');
  const errPhone = document.getElementById('error-phone');
  const errDate = document.getElementById('error-date');

  // Prevent past dates
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  // Clear errors on input
  [nameInput, emailInput, phoneInput, dateInput].forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => {
      inp.classList.remove('has-error');
      const err = document.getElementById(`error-${inp.id.replace('contact-', '')}`);
      if (err) err.classList.remove('visible');
      if (generalError) generalError.style.display = 'none';
    });
  });

  // Email regex
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Phone validation (optional, but if entered must be at least 7 chars)
  function isValidPhone(phone) {
    if (!phone || phone.trim() === '') return true;
    const clean = phone.replace(/[\s\-\(\)\+\.]/g, '');
    return clean.length >= 7 && clean.length <= 16;
  }

  // Services from the database, pre-selected from ?service=ID
  async function loadServices() {
    try {
      const { services } = await api('/api/services', { quiet: true });
      const wanted = new URLSearchParams(window.location.search).get('service');
      interestSelect.insertAdjacentHTML('beforeend', services.map((s) =>
        `<option value="${s.id}">${escapeHtml(s.name)} (from ${formatAED(s.starting_price)})</option>`).join(''));
      if (wanted && services.some((s) => String(s.id) === wanted)) interestSelect.value = wanted;
    } catch { /* the general enquiry option still works */ }
  }

  // Pre-fill details for logged-in members
  async function prefill() {
    const user = await currentUser();
    if (!user) return;
    if (!nameInput.value) nameInput.value = user.full_name;
    if (!emailInput.value) emailInput.value = user.email;
    if (!phoneInput.value && user.phone) phoneInput.value = user.phone;
  }

  loadServices();
  prefill();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let hasErrors = false;
      if (generalError) generalError.style.display = 'none';

      // 1. Check Anti-spam Honeypot
      if (honeyInput && honeyInput.value.trim() !== '') {
        // Silently simulate success to confound spam bots
        formWrapper.style.display = 'none';
        confirmationPanel.style.display = 'block';
        return;
      }

      // 2. Validate Name
      const nameVal = nameInput.value.trim();
      if (!nameVal || nameVal.length < 2) {
        nameInput.classList.add('has-error');
        errName.classList.add('visible');
        hasErrors = true;
      } else {
        nameInput.classList.remove('has-error');
        errName.classList.remove('visible');
      }

      // 3. Validate Email
      const emailVal = emailInput.value.trim();
      if (!emailVal || !isValidEmail(emailVal)) {
        emailInput.classList.add('has-error');
        errEmail.classList.add('visible');
        hasErrors = true;
      } else {
        emailInput.classList.remove('has-error');
        errEmail.classList.remove('visible');
      }

      // 4. Validate Phone (if entered)
      const phoneVal = phoneInput.value.trim();
      if (phoneVal && !isValidPhone(phoneVal)) {
        phoneInput.classList.add('has-error');
        errPhone.classList.add('visible');
        hasErrors = true;
      } else {
        phoneInput.classList.remove('has-error');
        errPhone.classList.remove('visible');
      }

      // 5. Validate Date (if entered)
      const dateVal = dateInput.value;
      if (dateVal) {
        const selectedDate = new Date(dateVal);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          dateInput.classList.add('has-error');
          errDate.classList.add('visible');
          hasErrors = true;
        } else {
          dateInput.classList.remove('has-error');
          errDate.classList.remove('visible');
        }
      }

      if (hasErrors) {
        if (generalError) {
          generalErrorText.textContent = 'Please correct the highlighted fields before submitting.';
          generalError.style.display = 'flex';
        }
        return;
      }

      // Submit to backend
      const details = [
        `Country of residence: ${countrySelect.value}`,
        `Preferred contact method: ${methodSelect.value}`,
      ];
      const note = messageInput.value.trim();
      const payload = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal || null,
        service_id: interestSelect.value ? Number(interestSelect.value) : null,
        preferred_date: dateVal || null,
        message: [...details, note].filter(Boolean).join('\n'),
        honeypot: honeyInput ? honeyInput.value : ''
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Transmitting Confidential Request...';

        const resData = await api('/api/consultations', { method: 'POST', body: payload, quiet: true });

        // Fill confirmation receipt (reference is the saved request number)
        {
          const refCode = `FIN-${new Date().getFullYear()}-${String(resData.consultation.id).padStart(4, '0')}`;
          document.getElementById('receipt-ref').textContent = refCode;
          document.getElementById('receipt-name').textContent = nameVal;
          document.getElementById('receipt-email').textContent = emailVal;
          document.getElementById('receipt-interest').textContent = interestSelect.options[interestSelect.selectedIndex].text;
          document.getElementById('receipt-method').textContent = methodSelect.options[methodSelect.selectedIndex].text;

          // Transition view
          formWrapper.style.display = 'none';
          confirmationPanel.style.display = 'block';
          window.scrollTo({ top: confirmationPanel.offsetTop - 120, behavior: 'smooth' });
          toast('Your consultation request has been received.', 'success');
        }
      } catch (err) {
        console.error('Submission error:', err);
        if (generalError) {
          generalErrorText.textContent = err.message || 'Unable to submit request. Please try again or contact us directly.';
          generalError.style.display = 'flex';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Confidential Consultation';
      }
    });
  }
});
