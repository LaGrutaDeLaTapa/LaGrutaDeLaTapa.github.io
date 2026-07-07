document.addEventListener('DOMContentLoaded', function () {
  const config = window.siteConfig || {};
  const revealElements = document.querySelectorAll('.reveal');
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const navLinks = document.querySelectorAll('.main-nav a');
  const bookingForm = document.getElementById('reservationForm');
  const bookingMessage = document.getElementById('bookingMessage');
  const submitButton = document.getElementById('submitButton');
  const dateInput = document.getElementById('date');
  const timeInput = document.getElementById('time');

  const pad = function (number) {
    return String(number).padStart(2, '0');
  };

  const toDateKey = function (date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const setMinDate = function () {
    if (!dateInput) return;
    dateInput.min = toDateKey(new Date());
  };

  const updateNavState = function (isOpen) {
    if (!navToggle || !mainNav) return;
    navToggle.classList.toggle('open', isOpen);
    mainNav.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(!!isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  };

  const showMessage = function (message, isError) {
    if (!bookingMessage) return;
    bookingMessage.textContent = message;
    bookingMessage.classList.toggle('error', !!isError);
  };

  const updateButtonState = function (isSubmitting) {
    if (!submitButton) return;
    submitButton.disabled = !!isSubmitting;
    submitButton.classList.toggle('sending', !!isSubmitting);
    submitButton.textContent = isSubmitting ? 'Enviando...' : (config.submitLabel || 'Enviar solicitud');
  };

  const setFieldError = function (field, message) {
    if (!field) return;
    const errorElement = document.getElementById(field.id + 'Error');
    field.classList.add('error');
    if (errorElement) errorElement.textContent = message;
  };

  const clearFieldError = function (field) {
    if (!field) return;
    const errorElement = document.getElementById(field.id + 'Error');
    field.classList.remove('error');
    if (errorElement) errorElement.textContent = '';
  };

  const validateEmail = function (value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePhone = function (value) {
    const digits = value.replace(/[^0-9]/g, '');
    return digits.length >= 6 && digits.length <= 15;
  };

  const minutesFromTime = function (time) {
    const parts = String(time || '').split(':').map(Number);
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
    return (parts[0] * 60) + parts[1];
  };

  const isInRanges = function (time, ranges) {
    const minutes = minutesFromTime(time);
    if (minutes === null || !Array.isArray(ranges)) return false;
    return ranges.some(function (range) {
      const start = minutesFromTime(range[0]);
      const end = minutesFromTime(range[1]);
      if (start === null || end === null) return false;
      if (end <= start) return minutes >= start || minutes <= end;
      return minutes >= start && minutes <= end;
    });
  };

  const getScheduleForDate = function (dateValue) {
    if (!dateValue || !config.bookingRules) return null;
    const date = new Date(`${dateValue}T12:00:00`);
    const day = date.getDay();
    const closedDates = config.bookingRules.closedDates || [];
    const specialClosed = config.bookingRules.specialClosed || [];
    const summer = config.bookingRules.summer || null;

    if (closedDates.includes(dateValue) || specialClosed.includes(dateValue)) {
      return { open: false, reason: 'El restaurante está cerrado por vacaciones o día especial.' };
    }

    if (summer && dateValue >= summer.from && dateValue <= summer.to) {
      const summerRanges = summer.days ? summer.days[String(day)] : null;
      return summerRanges && summerRanges.length
        ? { open: true, ranges: summerRanges }
        : { open: false, reason: 'Ese día no abrimos en horario de verano.' };
    }

    const ranges = config.bookingRules.days ? config.bookingRules.days[String(day)] : null;
    return ranges && ranges.length
      ? { open: true, ranges: ranges }
      : { open: false, reason: 'Ese día el establecimiento permanece cerrado.' };
  };

  const formatRanges = function (ranges) {
    return (ranges || []).map(function (range) {
      return `${range[0]}-${range[1]}`;
    }).join(' / ');
  };

  const resetFormErrors = function () {
    const fields = bookingForm ? bookingForm.querySelectorAll('input, textarea, select') : [];
    fields.forEach(clearFieldError);
    showMessage('', false);
  };

  const validateForm = function () {
    if (!bookingForm) return false;
    resetFormErrors();
    let isValid = true;

    const nameField = bookingForm.querySelector('#name');
    const emailField = bookingForm.querySelector('#email');
    const phoneField = bookingForm.querySelector('#phone');
    const guestsField = bookingForm.querySelector('#guests');
    const commentsField = bookingForm.querySelector('#comments');

    if (!nameField || !nameField.value.trim()) {
      setFieldError(nameField, 'Por favor, indica tu nombre.');
      isValid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'.-]+$/.test(nameField.value.trim())) {
      setFieldError(nameField, 'El nombre solo debe contener letras y espacios.');
      isValid = false;
    }

    if (!emailField || !emailField.value.trim()) {
      setFieldError(emailField, 'El correo electrónico es obligatorio.');
      isValid = false;
    } else if (!validateEmail(emailField.value.trim())) {
      setFieldError(emailField, 'Introduce un correo válido.');
      isValid = false;
    }

    if (!phoneField || !phoneField.value.trim()) {
      setFieldError(phoneField, 'El teléfono es obligatorio.');
      isValid = false;
    } else if (!validatePhone(phoneField.value.trim())) {
      setFieldError(phoneField, 'Introduce un teléfono válido con 6 a 15 dígitos.');
      isValid = false;
    }

    if (!guestsField || !guestsField.value.trim()) {
      setFieldError(guestsField, 'Indica el número de personas.');
      isValid = false;
    } else {
      const guests = Number(guestsField.value);
      const maxGuests = Number(config.maxGuests || 20);
      if (Number.isNaN(guests) || guests < 1 || guests > maxGuests) {
        setFieldError(guestsField, `El número de personas debe estar entre 1 y ${maxGuests}.`);
        isValid = false;
      }
    }

    if (!dateInput || !dateInput.value) {
      setFieldError(dateInput, 'Selecciona una fecha.');
      isValid = false;
    } else {
      const selectedDate = new Date(`${dateInput.value}T12:00:00`);
      const today = new Date(`${toDateKey(new Date())}T12:00:00`);
      if (selectedDate < today) {
        setFieldError(dateInput, 'La fecha no puede ser anterior a hoy.');
        isValid = false;
      }
    }

    if (!timeInput || !timeInput.value) {
      setFieldError(timeInput, 'Selecciona una hora.');
      isValid = false;
    }

    if (dateInput && dateInput.value && timeInput && timeInput.value && config.bookingRules) {
      const schedule = getScheduleForDate(dateInput.value);
      if (!schedule || !schedule.open) {
        setFieldError(dateInput, schedule ? schedule.reason : 'No hay horario disponible para esa fecha.');
        isValid = false;
      } else if (!isInRanges(timeInput.value, schedule.ranges)) {
        setFieldError(timeInput, `Para esa fecha aceptamos reservas en estos tramos: ${formatRanges(schedule.ranges)}.`);
        isValid = false;
      }
    }

    if (!commentsField) isValid = false;
    return isValid;
  };

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      updateNavState(!mainNav.classList.contains('open'));
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      updateNavState(false);
    });
  });

  if (revealElements.length) {
    const observer = new IntersectionObserver(function (entries, observerRef) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observerRef.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    revealElements.forEach(function (element) {
      observer.observe(element);
    });
  }

  setMinDate();

  if (bookingForm) {
    if (window.emailjs && config.emailPublicKey) {
      try {
        emailjs.init({ publicKey: config.emailPublicKey });
      } catch (error) {
        console.error('EmailJS init error:', error);
      }
    }

    bookingForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validateForm()) {
        showMessage('Revisa los campos marcados e inténtalo de nuevo.', true);
        return;
      }

      const templateParams = {
        business: config.businessName || document.title,
        name: bookingForm.querySelector('#name')?.value.trim() || '',
        email: bookingForm.querySelector('#email')?.value.trim() || '',
        phone: bookingForm.querySelector('#phone')?.value.trim() || '',
        guests: bookingForm.querySelector('#guests')?.value.trim() || '',
        date: bookingForm.querySelector('#date')?.value.trim() || '',
        time: bookingForm.querySelector('#time')?.value.trim() || '',
        comments: bookingForm.querySelector('#comments')?.value.trim() || ''
      };

      if (window.emailjs && config.emailService && config.emailTemplate) {
        updateButtonState(true);
        showMessage('Enviando solicitud...', false);
        emailjs.send(config.emailService, config.emailTemplate, templateParams)
          .then(function () {
            showMessage('Solicitud enviada. Te llamaremos para confirmar la reserva.', false);
            bookingForm.reset();
            setMinDate();
            updateButtonState(false);
          })
          .catch(function (error) {
            console.error('EmailJS error:', error);
            showMessage('No se pudo enviar la solicitud. Llámanos o escríbenos por WhatsApp.', true);
            updateButtonState(false);
          });
        return;
      }

      const phone = (config.whatsapp || config.phone || '').replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `Hola, quiero reservar en ${templateParams.business}. Nombre: ${templateParams.name}. Personas: ${templateParams.guests}. Fecha: ${templateParams.date}. Hora: ${templateParams.time}. Teléfono: ${templateParams.phone}. Comentarios: ${templateParams.comments || 'Sin comentarios'}.`
      );
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener');
        showMessage('Hemos abierto WhatsApp para enviar tu solicitud. La reserva queda pendiente de confirmación.', false);
        bookingForm.reset();
        setMinDate();
      } else {
        showMessage('Solicitud validada. Llámanos para confirmarla.', false);
      }
    });
  }
});
