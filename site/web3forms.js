(() => {
  const accessKey = '81cac36f-b95e-490a-b1c0-6b339f6a4302';
  const endpoint = 'https://api.web3forms.com/submit';
  const root = document.getElementById('root');

  function updatePageCopy() {
    const replacements = new Map([
      [
        'Die Anfrage ist der erste Schritt. Ein verbindlicher Kontaktweg wird vor der Veröffentlichung ergänzt.',
        'Erzählt uns von eurem Vorhaben. Wir melden uns bei euch zurück.',
      ],
      [
        'Du möchtest einen Rudel Abend planen oder hast eine Frage? Schreib uns – die Anfrage wird lokal vorgemerkt, bis der verbindliche Kontaktweg ergänzt ist.',
        'Du möchtest einen Rudel Abend planen oder hast eine Frage? Schreib uns – wir melden uns bei dir zurück.',
      ],
    ]);

    for (const paragraph of root.querySelectorAll('p')) {
      const replacement = replacements.get(paragraph.textContent.trim());
      if (replacement) paragraph.textContent = replacement;
    }
  }

  function enhanceForm(form) {
    const nameInput = form.querySelector('[name="name"]');
    if (nameInput) {
      nameInput.placeholder = 'Z. B. Anna Müller oder euer Verein';
      nameInput.autocomplete = 'name';
    }

    const locationInput = form.querySelector('[name="termin"], [name="ort"]');
    if (locationInput) {
      form.dataset.eventRequest = 'true';
      locationInput.name = 'ort';
      locationInput.placeholder = 'Z. B. Echem oder euer Veranstaltungsort';

      const locationLabel = locationInput.closest('label');
      if (locationLabel?.firstChild?.nodeType === Node.TEXT_NODE) {
        locationLabel.firstChild.textContent = 'Wo soll es stattfinden?';
      }

      if (!form.querySelector('[name="wunschdatum"]')) {
        const dateLabel = document.createElement('label');
        dateLabel.textContent = 'Wann soll es stattfinden? (optional)';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.name = 'wunschdatum';
        dateLabel.append(dateInput);
        locationLabel.after(dateLabel);
      }

      const messageInput = form.querySelector('[name="nachricht"]');
      if (messageInput) {
        messageInput.placeholder = 'Erzähl uns kurz von eurem Anlass und was ihr euch für den Abend wünscht.';
      }
    }

    if (!form.querySelector('[name="email"]')) {
      const label = document.createElement('label');
      label.textContent = 'Deine E-Mail-Adresse';

      const input = document.createElement('input');
      input.type = 'email';
      input.name = 'email';
      input.required = true;
      input.autocomplete = 'email';
      input.placeholder = 'name@beispiel.de';
      label.append(input);

      const messageLabel = form.querySelector('[name="nachricht"]')?.closest('label');
      form.insertBefore(label, messageLabel || form.querySelector('button[type="submit"]'));
    }

    if (!form.querySelector('[name="botcheck"]')) {
      const botcheck = document.createElement('input');
      botcheck.type = 'checkbox';
      botcheck.name = 'botcheck';
      botcheck.tabIndex = -1;
      botcheck.setAttribute('aria-hidden', 'true');
      botcheck.style.display = 'none';
      form.append(botcheck);
    }

    const button = form.querySelector('button[type="submit"]');
    if (button && button.textContent !== 'Anfrage senden' && !button.disabled) {
      button.textContent = 'Anfrage senden';
    }

    if (!form.querySelector('.form-send-status')) {
      const status = document.createElement('p');
      status.className = 'notice form-send-status';
      status.setAttribute('role', 'status');
      status.hidden = true;
      form.append(status);
    }
  }

  function enhancePage() {
    updatePageCopy();
    root.querySelectorAll('.booking-form').forEach(enhanceForm);
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('.booking-form')) return;

    event.preventDefault();
    event.stopPropagation();
    if (form.dataset.sending === 'true') return;

    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.form-send-status');
    const isEventRequest = form.dataset.eventRequest === 'true';
    const formData = new FormData(form);
    formData.set('access_key', accessKey);
    formData.set('subject', isEventRequest ? 'Rudelbar: Event-Anfrage' : 'Rudelbar: Kontaktanfrage');
    formData.set('from_name', 'Rudelbar Website');
    formData.set('message', String(formData.get('nachricht') || ''));
    formData.delete('nachricht');
    if (isEventRequest) {
      const location = String(formData.get('ort') || '').trim();
      if (location) formData.set('Ort', location);
      formData.delete('ort');

      const date = String(formData.get('wunschdatum') || '');
      if (date) {
        const [year, month, day] = date.split('-');
        formData.set('Wunschtermin', `${day}.${month}.${year}`);
      }
      formData.delete('wunschdatum');
    }

    form.dataset.sending = 'true';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    button.textContent = 'Wird gesendet …';
    status.hidden = false;
    status.textContent = 'Deine Anfrage wird gesendet …';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        throw new Error(result.message || 'Die Anfrage konnte nicht gesendet werden.');
      }
      form.reset();
      status.textContent = 'Danke! Deine Anfrage wurde gesendet. Wir melden uns bei dir zurück.';
    } catch (error) {
      status.textContent = 'Das Senden hat nicht geklappt. Bitte versuche es erneut.';
      console.error('Rudelbar form submission failed:', error);
    } finally {
      clearTimeout(timeout);
      delete form.dataset.sending;
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = 'Anfrage senden';
    }
  }, true);

  new MutationObserver(enhancePage).observe(root, { childList: true, subtree: true });
  enhancePage();
})();
