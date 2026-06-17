function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, duration);
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

let modalIdCounter = 0;

function createModal(title, bodyHtml) {
  const id = 'modal-' + (++modalIdCounter);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id;
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" data-close-id="${id}">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `;
  overlay.querySelector('.modal-close').onclick = () => closeModal(id);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('active'), 10);
  const firstInput = overlay.querySelector('input, select, textarea, button:not(.modal-close)');
  if (firstInput) setTimeout(() => firstInput.focus(), 150);
  return id;
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    setTimeout(() => el.remove(), 250);
  }
}

function closeParentModal(btn) {
  const overlay = btn.closest('.modal-overlay');
  if (overlay) closeModal(overlay.id);
}

function confirmModal(message, callback) {
  const id = createModal('Confirm', `
    <p style="margin:0 0 20px;font-size:0.95rem;color:#444;">${message}</p>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-danger" id="confirm-yes-${++modalIdCounter}">Confirm</button>
    </div>
  `);
  const btnId = 'confirm-yes-' + modalIdCounter;
  document.getElementById(btnId).onclick = () => { closeModal(id); setTimeout(callback, 100); };
}

function alertModal(message) {
  const id = createModal('Notice', `
    <p style="margin:0 0 20px;font-size:0.95rem;color:#444;">${message}</p>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-primary" onclick="closeParentModal(this)">OK</button>
    </div>
  `);
}

function promptModal(label, defaultValue, callback, type) {
  const inputType = type || 'text';
  const uid = ++modalIdCounter;
  const id = createModal('Input', `
    <div class="modal-field">
      <label>${label}</label>
      <input type="${inputType}" id="prompt-input-${uid}" value="${escapeHtml(defaultValue || '')}" autocomplete="off">
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="prompt-ok-${uid}">OK</button>
    </div>
  `);
  const input = document.getElementById('prompt-input-' + uid);
  const okBtn = document.getElementById('prompt-ok-' + uid);
  const okHandler = () => {
    const val = input.value;
    closeModal(id);
    setTimeout(() => callback(val), 100);
  };
  okBtn.onclick = okHandler;
  input.onkeydown = (e) => { if (e.key === 'Enter') okHandler(); };
}

function editUserModal(user, callback) {
  const currentUser = getUserData();
  const isSuper = currentUser && currentUser.role === 'superadmin';
  const uid = ++modalIdCounter;
  const id = createModal('Edit User', `
    <div class="modal-field">
      <label>Full Name</label>
      <input type="text" id="edit-name-${uid}" value="${escapeHtml(user.fullName)}">
    </div>
    <div class="modal-field">
      <label>Email</label>
      <input type="email" id="edit-email-${uid}" value="${escapeHtml(user.email)}">
    </div>
    <div class="modal-field">
      <label>Contact Number</label>
      <input type="tel" id="edit-phone-${uid}" value="${escapeHtml(user.contactNumber === '-' ? '' : user.contactNumber)}">
    </div>
    <div class="modal-field">
      <label>Role</label>
      <select id="edit-role-${uid}">
        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        ${isSuper ? '<option value="superadmin" ' + (user.role === 'superadmin' ? 'selected' : '') + '>Superadmin</option>' : ''}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="edit-save-${uid}">Save Changes</button>
    </div>
  `);
  document.getElementById('edit-save-' + uid).onclick = () => {
    const data = {
      fullName: document.getElementById('edit-name-' + uid).value.trim(),
      email: document.getElementById('edit-email-' + uid).value.trim(),
      contactNumber: document.getElementById('edit-phone-' + uid).value.trim(),
      role: document.getElementById('edit-role-' + uid).value
    };
    if (!data.fullName || !data.email) { alertModal('Name and Email are required'); return; }
    closeModal(id);
    setTimeout(() => callback(data), 100);
  };
}

function addWebsiteModal(callback) {
  const uid = ++modalIdCounter;
  const id = createModal('Add Website', `
    <div class="modal-field">
      <label>Verified User</label>
      <select id="web-userId-${uid}"><option value="">Loading users...</option></select>
    </div>
    <div class="modal-field">
      <label>Site Name</label>
      <input type="text" id="web-name-${uid}" placeholder="My Website">
    </div>
    <div class="modal-field">
      <label>Site URL</label>
      <input type="url" id="web-url-${uid}" placeholder="https://example.com">
    </div>
    <div class="modal-field">
      <label>Control Panel URL (optional)</label>
      <input type="url" id="web-cpurl-${uid}" placeholder="https://example.com/admin">
    </div>
    <div class="modal-field">
      <label>Plan</label>
      <select id="web-plan-${uid}"><option value="">Loading plans...</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="web-save-${uid}">Add Website</button>
    </div>
  `);
  apiAdminGetVerifiedUsers().then(r => {
    const sel = document.getElementById('web-userId-' + uid);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Verified User --</option>';
    if (r.success) {
      const rank = { superadmin: 0, admin: 1, user: 2 };
      r.users.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3));
      r.users.forEach(u => {
        sel.innerHTML += '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.fullName) + ' (' + escapeHtml(u.email) + ')' + '</option>';
      });
    }
  });
  apiGetPlans(true).then(r => {
    const sel = document.getElementById('web-plan-' + uid);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Plan --</option>';
    if (r.success) r.plans.forEach(p => {
      sel.innerHTML += '<option value="' + p.id + '" data-name="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) + ' - ' + escapeHtml(p.currency) + ' ' + p.price + '</option>';
    });
  });
  document.getElementById('web-save-' + uid).onclick = () => {
    const planSel = document.getElementById('web-plan-' + uid);
    const planId = planSel ? planSel.value : '';
    const planName = planId && planSel.selectedOptions[0] ? planSel.selectedOptions[0].getAttribute('data-name') : '';
    const data = {
      userId: document.getElementById('web-userId-' + uid).value,
      siteName: document.getElementById('web-name-' + uid).value.trim(),
      siteUrl: document.getElementById('web-url-' + uid).value.trim(),
      cpUrl: document.getElementById('web-cpurl-' + uid).value.trim(),
      planId: planId,
      planName: planName
    };
    if (!data.userId || !data.siteName || !data.siteUrl) { alertModal('Please select a user, and enter Site Name and Site URL'); return; }
    closeModal(id);
    setTimeout(() => callback(data), 100);
  };
}

function editWebsiteModal(website, callback) {
  const uid = ++modalIdCounter;
  const id = createModal('Edit Website', `
    <div class="modal-field">
      <label>Site Name</label>
      <input type="text" id="web-edit-name-${uid}" value="${escapeHtml(website.siteName)}">
    </div>
    <div class="modal-field">
      <label>Site URL</label>
      <input type="url" id="web-edit-url-${uid}" value="${escapeHtml(website.siteUrl)}">
    </div>
    <div class="modal-field">
      <label>Control Panel URL (optional)</label>
      <input type="url" id="web-edit-cpurl-${uid}" value="${escapeHtml(website.controlPanelUrl || '')}">
    </div>
    <div class="modal-field">
      <label>Plan</label>
      <select id="web-edit-plan-${uid}"><option value="">Loading plans...</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="web-edit-save-${uid}">Save Changes</button>
    </div>
  `);
  apiGetPlans(false).then(r => {
    const sel = document.getElementById('web-edit-plan-' + uid);
    if (!sel) return;
    const currentId = website.planId || '';
    const currentName = website.planName || '';
    sel.innerHTML = '<option value="">-- No Plan --</option>';
    if (r.success) r.plans.forEach(p => {
      const selected = p.id === currentId || (!currentId && p.name === currentName) ? ' selected' : '';
      sel.innerHTML += '<option value="' + escapeHtml(p.id) + '" data-name="' + escapeHtml(p.name) + '"' + selected + '>' + escapeHtml(p.name) + ' - ' + escapeHtml(p.currency) + ' ' + p.price + '</option>';
    });
  });
  document.getElementById('web-edit-save-' + uid).onclick = () => {
    const planSel = document.getElementById('web-edit-plan-' + uid);
    const planId = planSel ? planSel.value : '';
    const planName = planId && planSel.selectedOptions[0] ? planSel.selectedOptions[0].getAttribute('data-name') : '';
    const data = {
      siteName: document.getElementById('web-edit-name-' + uid).value.trim(),
      siteUrl: document.getElementById('web-edit-url-' + uid).value.trim(),
      cpUrl: document.getElementById('web-edit-cpurl-' + uid).value.trim(),
      planId: planId,
      planName: planName
    };
    if (!data.siteName || !data.siteUrl) { alertModal('Site Name and Site URL are required'); return; }
    closeModal(id);
    setTimeout(() => callback(data), 100);
  };
}
