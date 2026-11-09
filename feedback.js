'use strict';
(() => {
  const form = document.querySelector('#feedback-form');
  if (!form) return;
  const status = document.querySelector('#feedback-status');
  const send = form.querySelector('button[type="submit"]');
  const another = document.querySelector('#feedback-another');
  const fields = form.querySelector('fieldset');
  const category = form.elements.category;
  const message = form.elements.message;
  const email = form.elements.email;
  const config = window.spellcountFeedback || {};
  const configured = config.enabled === true && /^[a-zA-Z0-9]{6,32}$/.test(config.formId || '');
  const categories = ['Bug Report', 'Feature Request', 'General Feedback'];
  let busy = false;
  let sent = false;
  let reference = '';
  const announce = (text, kind = '') => {
    status.textContent = text;
    status.dataset.kind = kind;
  };
  function validate() {
    message.setCustomValidity(message.value.trim() ? '' : 'Please enter a message.');
    category.setCustomValidity(categories.includes(category.value) ? '' : 'Please choose a category.');
    email.value = email.value.trim();
    return form.reportValidity();
  }
  message.addEventListener('input', () => message.setCustomValidity(''));
  category.addEventListener('change', () => category.setCustomValidity(''));
  if (configured) {
    fields.disabled = false;
    send.disabled = false;
    announce('Choose a category and tell us what happened. No account needed.');
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured) {
      announce('The feedback form is not available yet. Please email cardboardsquire@gmail.com.', 'error');
      return;
    }
    if (busy || sent || !validate()) return;
    if (form.elements._gotcha.value) {
      announce('Submission blocked by spam protection. Please clear the website field and try again.', 'error');
      return;
    }
    reference ||= crypto.randomUUID();
    const payload = new FormData();
    payload.set('category', category.value);
    payload.set('message', message.value.trim());
    if (email.value) payload.set('email', email.value);
    payload.set('_subject', 'SpellCount — ' + category.value);
    payload.set('_gotcha', '');
    payload.set('submitted_at_utc', new Date().toISOString());
    payload.set('submission_reference', reference);
    payload.set('source', 'Cardboard Squire / support.html');
    busy = true;
    fields.disabled = true;
    announce('Sending feedback… Please wait.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('https://formspree.io/f/' + config.formId, {
        method: 'POST', body: payload, headers: { Accept: 'application/json' },
        credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', signal: controller.signal
      });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.ok === true) {
        sent = true;
        announce('Thank you. Formspree accepted your feedback for Cardboard Squire. Reference: ' + reference + '. Email delivery is handled by the service.', 'success');
        another.hidden = false;
      } else if (response.status === 429) {
        announce('The form service is temporarily limiting submissions. Your message is still here. Please email cardboardsquire@gmail.com instead.', 'error');
      } else if (response.status === 400 || response.status === 422 || response.status === 403) {
        announce('The form service did not accept this submission. Check your email and message; spam verification or form setup may require attention. Your message is still here. You can email cardboardsquire@gmail.com instead.', 'error');
      } else {
        announce('Submission could not be confirmed. Keep this reference: ' + reference + '. Your message is still here. Check with cardboardsquire@gmail.com before resending to avoid duplicates.', 'error');
      }
    } catch {
      announce('Submission could not be confirmed because the connection was interrupted. Your message is still here. Reference: ' + reference + '. Check with cardboardsquire@gmail.com before resending to avoid duplicates.', 'error');
    } finally {
      clearTimeout(timer);
      busy = false;
      fields.disabled = sent;
      send.disabled = sent;
    }
  });
  another.addEventListener('click', () => {
    form.reset(); fields.disabled = false; send.disabled = false;
    sent = false; reference = ''; another.hidden = true;
    announce('Ready for a new message.'); category.focus();
  });
})();
