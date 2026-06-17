async function adminCheck() {
  if (!isAdmin()) { window.location.href = '../login.html'; return false; }
  return true;
}

async function loadAdminStats() {
  const result = await apiAdminGetStats();
  if (!result.success) { toast('Failed to load stats: ' + (result.error || 'unknown error'), 'error'); return; }
  const s = result.stats;
  animateNumber('totalUsers', s.totalUsers);
  animateNumber('totalWebsites', s.totalWebsites);
  animateNumber('verifiedUsers', s.verifiedUsers);
  animateNumber('unverifiedUsers', s.unverifiedUsers);

  const tbody = document.getElementById('recentTable');
  if (tbody) {
    tbody.innerHTML = '';
    s.recentRegistrations.forEach(u => {
      const tr = document.createElement('tr');
      const verified = u.isVerified === true;
      const isTargetSuper = u.role === 'superadmin';
      const currentUser = getUserData();
      const canToggle = currentUser && (currentUser.role === 'superadmin' || !isTargetSuper);
      tr.innerHTML = `<td><strong>${escapeHtml(u.fullName)}</strong></td><td>${escapeHtml(u.email)}</td>
        <td><span class="badge-role ${u.role}">${u.role}</span></td>
        <td>${verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
        <td class="text-muted">${u.createdAt ? u.createdAt.split('T')[0] : '-'}</td>
        <td class="action-cell">${canToggle ? '<button onclick="toggleVerify(\'' + u.id + '\',\'' + (!verified) + '\')" class="btn-icon ' + (verified ? 'btn-icon-unverify' : 'btn-icon-verify') + '" title="' + (verified ? 'Unverify' : 'Verify') + '"><i class="fa-solid ' + (verified ? 'fa-user-xmark' : 'fa-user-check') + '"></i></button>' : '<span class="text-muted" style="font-size:0.75rem;">Protected</span>'}</td>`;
      tbody.appendChild(tr);
    });
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = current;
  }, 30);
}

async function loadUsers() {
  const result = await apiAdminGetAllUsers();
  if (!result.success) { toast('Failed to load users: ' + (result.error || 'unknown error'), 'error'); return; }
  const tbody = document.getElementById('usersTable');
  tbody.innerHTML = '';
  const currentUser = getUserData();
  const isSuper = currentUser && currentUser.role === 'superadmin';
  let users = isSuper ? result.users : result.users.filter(u => u.role !== 'superadmin');
  const rank = { superadmin: 0, admin: 1, user: 2 };
  users.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3));
  const countEl = document.getElementById('userCount');
  if (countEl) countEl.textContent = users.length;
  users.forEach(u => {
    const tr = document.createElement('tr');
    const verified = u.isVerified === true;
    const isTargetSuper = u.role === 'superadmin';
    const actionsDisabled = isTargetSuper && !isSuper;
    tr.innerHTML = `
      <td><span class="user-id">${escapeHtml(u.id)}</span></td>
      <td><strong>${escapeHtml(u.fullName)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.contactNumber || '-')}</td>
      <td><span class="badge-role ${u.role}">${u.role}</span></td>
      <td>${verified ? '<span class="badge badge-success">Verified</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
      <td class="text-muted">${u.createdAt ? u.createdAt.split('T')[0] : '-'}</td>
      <td class="action-cell">
        ${actionsDisabled ? '<span class="text-muted" style="font-size:0.75rem;">Protected</span>' : `
        <button onclick="editUser('${u.id}')" class="btn-icon btn-icon-edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button onclick="toggleVerify('${u.id}','${!verified}')" class="btn-icon ${verified ? 'btn-icon-unverify' : 'btn-icon-verify'}" title="${verified ? 'Unverify' : 'Verify'}"><i class="fa-solid ${verified ? 'fa-user-xmark' : 'fa-user-check'}"></i></button>
        <button onclick="resetPw('${u.id}')" class="btn-icon btn-icon-reset" title="Reset Password"><i class="fa-solid fa-key"></i></button>
        <button onclick="deleteUser('${u.id}')" class="btn-icon btn-icon-delete" title="Delete"><i class="fa-solid fa-trash-can"></i></button>`}
      </td>`;
    tbody.appendChild(tr);
  });
}

async function loadVerifiedUsers() {
  const result = await apiAdminGetVerifiedUsers();
  if (!result.success) { toast('Failed to load verified users: ' + (result.error || 'unknown error'), 'error'); return; }
  const tbody = document.getElementById('verifiedUsersTable');
  tbody.innerHTML = '';
  const rank = { superadmin: 0, admin: 1, user: 2 };
  result.users.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3));
  result.users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="user-id">${escapeHtml(u.id)}</span></td>
      <td><strong>${escapeHtml(u.fullName)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.contactNumber || '-')}</td>
      <td><span class="badge-role ${u.role}">${u.role}</span></td>
      <td class="text-muted">${u.createdAt ? u.createdAt.split('T')[0] : '-'}</td>
      <td class="action-cell">
        <button onclick="showUserSites(this)" data-userid="${u.id}" data-username="${u.fullName.replace(/"/g,'&quot;')}" class="btn-icon btn-icon-sites" title="View Sites"><i class="fa-solid fa-globe"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function showUserSites(btn) {
  const userId = btn.getAttribute('data-userid');
  const userName = btn.getAttribute('data-username');
  const uid = ++modalIdCounter;
  const id = createModal('Sites — ' + escapeHtml(userName), `
    <div id="usites-loading-${uid}" style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>
    <div id="usites-content-${uid}" style="display:none;"></div>
  `);
  const result = await apiAdminGetAllWebsites();
  const contentEl = document.getElementById('usites-content-' + uid);
  const loadingEl = document.getElementById('usites-loading-' + uid);
  if (!result.success) {
    if (loadingEl) loadingEl.innerHTML = '<span class="text-muted">Failed to load websites</span>';
    return;
  }
  const userSites = result.websites.filter(w => w.userId === userId);
  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';
  if (!contentEl) return;
  if (!userSites.length) {
    contentEl.innerHTML = '<div style="text-align:center;padding:20px;color:#999;"><i class="fa-solid fa-circle-info"></i> No websites assigned to this user.</div>';
    return;
  }
  contentEl.innerHTML = userSites.map(w => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);">
      <div>
        <strong>${escapeHtml(w.siteName)}</strong>
        <div style="font-size:0.8rem;color:#888;">${escapeHtml(w.siteUrl)}</div>
        <div style="font-size:0.75rem;color:#aaa;margin-top:2px;">Plan: ${escapeHtml(w.planName || '-')} &middot; ${w.createdAt ? w.createdAt.split('T')[0] : '-'}</div>
      </div>
      <button onclick="unassignWebsite('${w.id}','${escapeHtml(w.siteName)}','${uid}')" class="btn-modal btn-modal-danger" style="font-size:0.8rem;padding:6px 14px;">Unassign</button>
    </div>
  `).join('');
  contentEl.innerHTML += '<div class="modal-actions" style="margin-top:16px;"><button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Close</button></div>';
}

async function unassignWebsite(websiteId, siteName, modalUid) {
  const result = await apiUpdateWebsite(websiteId, { userId: '', userName: '' });
  if (result.success) {
    toast('"' + siteName + '" unassigned', 'success');
    apiLogActivity('website_unassigned', 'Unassigned website ' + siteName, siteName);
    closeModal(modalUid);
  } else {
    toast('Failed: ' + result.error, 'error');
  }
}

async function isSuperAdminUser(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists && doc.data().role === 'superadmin';
  } catch (e) { return false; }
}

async function toggleVerify(userId, newVal) {
  const current = getUserData();
  if (current.role !== 'superadmin' && await isSuperAdminUser(userId)) { toast('Cannot modify a superadmin', 'error'); return; }
  const val = newVal === 'true';
  const result = await apiAdminUpdateUser(userId, { isVerified: val });
  if (result.success) {
    toast('Verification status updated', 'success');
    apiLogActivity('user_verified', 'Set verified=' + val, userId);
    if (document.getElementById('usersTable')) loadUsers();
    if (document.getElementById('recentTable')) loadAdminStats();
  } else {
    toast('Failed to update verification status', 'error');
  }
}
async function resetPw(userId) {
  const current = getUserData();
  if (current.role !== 'superadmin' && await isSuperAdminUser(userId)) { toast('Cannot modify a superadmin', 'error'); return; }
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) { toast('User not found', 'error'); return; }
  const email = userDoc.data().email;
  confirmModal(`Send password reset email to ${email}?`, async () => {
    try {
      await auth.sendPasswordResetEmail(email);
      toast('Password reset email sent', 'success');
      apiLogActivity('password_reset', 'Sent password reset to ' + email, email);
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    }
  });
}

async function deleteUser(userId) {
  const current = getUserData();
  if (current.role !== 'superadmin' && await isSuperAdminUser(userId)) { toast('Cannot modify a superadmin', 'error'); return; }
  const uid = ++modalIdCounter;
  const id = createModal('Delete User', `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:3rem;color:#e74c3c;margin-bottom:12px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <p style="font-size:1rem;color:#444;margin:0 0 6px;">Are you sure you want to delete this user?</p>
      <p style="font-size:0.85rem;color:#999;margin:0;">This will also remove all their websites. This action cannot be undone.</p>
    </div>
    <div class="modal-actions" style="margin-top:20px;">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-danger" id="del-confirm-${uid}">Delete</button>
    </div>
  `);
  document.getElementById('del-confirm-' + uid).onclick = async () => {
    closeModal(id);
    const result = await apiAdminDeleteUser(userId);
    if (result.success) { toast('User deleted', 'success'); apiLogActivity('user_deleted', 'Deleted user', userId); loadUsers(); } else { toast('Failed to delete user', 'error'); }
  };
}

function editUser(userId) {
  const current = getUserData();
  const rows = document.querySelectorAll('#usersTable tr');
  let userData = null;
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7 && cells[0].textContent.trim() === userId) {
      userData = {
        id: userId,
        fullName: cells[1].textContent.trim(),
        email: cells[2].textContent.trim(),
        contactNumber: cells[3].textContent.trim(),
        role: cells[4].textContent.trim()
      };
      break;
    }
  }
  if (!userData) { toast('User not found', 'error'); return; }
  if (current.role !== 'superadmin' && userData.role === 'superadmin') { toast('Cannot modify a superadmin', 'error'); return; }
  editUserModal(userData, (data) => {
    apiAdminUpdateUser(userId, {
      fullName: data.fullName, email: data.email, contactNumber: data.contactNumber || '', role: data.role
    }).then(r => { if (r.success) { toast('User updated', 'success'); apiLogActivity('user_updated', 'Updated user ' + data.fullName, data.fullName); loadUsers(); } else { toast('Failed to update user', 'error'); } });
  });
}

function openAddWebsite() {
  addWebsiteModal(async (data) => {
    const result = await apiAddWebsite({
      userId: data.userId,
      siteName: data.siteName,
      siteUrl: data.siteUrl,
      controlPanelUrl: data.cpUrl,
      planId: data.planId,
      planName: data.planName
    });
    if (result.success) {
      toast('Website added successfully', 'success');
      apiLogActivity('website_added', 'Added website ' + data.siteName, data.siteName);
      loadWebsites();
    } else {
      toast('Failed: ' + result.error, 'error');
    }
  });
}

async function loadWebsites() {
  const result = await apiAdminGetAllWebsites();
  if (!result.success) { toast('Failed to load websites: ' + (result.error || 'unknown error'), 'error'); return; }
  const tbody = document.getElementById('websitesTable');
  tbody.innerHTML = '';
  const countEl = document.getElementById('webCount');
  if (countEl) countEl.textContent = result.websites.length;
  result.websites.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="user-id">${escapeHtml(w.id)}</span></td>
      <td><strong>${escapeHtml(w.siteName)}</strong></td>
      <td><a href="${escapeHtml(w.siteUrl)}" target="_blank" class="link">${escapeHtml(w.siteUrl)}</a></td>
      <td>${w.controlPanelUrl ? '<a href="'+escapeHtml(w.controlPanelUrl)+'" target="_blank" class="link">Link</a>' : '<span class="text-muted">-</span>'}</td>
      <td><span class="badge-role user">${escapeHtml(w.userName)}</span></td>
      <td>${w.planName ? '<span class="badge badge-info" data-planid="' + escapeHtml(w.planId || '') + '">' + escapeHtml(w.planName) + '</span>' : '<span class="text-muted" data-planid="">-</span>'}</td>
      <td class="text-muted">${w.createdAt ? w.createdAt.split('T')[0] : '-'}</td>
      <td class="action-cell">
        <button onclick="editWebsite('${w.id}')" class="btn-icon btn-icon-edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button onclick="transferWebsite('${w.id}','${w.userId}','${escapeHtml(w.userName)}')" class="btn-icon btn-icon-transfer" title="Transfer"><i class="fa-solid fa-right-left"></i></button>
        <button onclick="deleteWebsite('${w.id}')" class="btn-icon btn-icon-delete" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function editWebsite(websiteId) {
  const rows = document.querySelectorAll('#websitesTable tr');
  let siteData = null;
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7 && cells[0].textContent.trim() === websiteId) {
      const linkCell = cells[2].querySelector('a');
      const cpCell = cells[3];
      const cpLink = cpCell.querySelector('a');
      const planBadge = cells[5].querySelector('[data-planid]');
      siteData = {
        id: websiteId,
        siteName: cells[1].textContent.trim(),
        siteUrl: linkCell ? linkCell.textContent.trim() : '',
        controlPanelUrl: cpLink ? cpLink.textContent.trim() : '',
        planId: planBadge ? planBadge.getAttribute('data-planid') : '',
        planName: cells[5].textContent.trim()
      };
      if (siteData.planName === '-') siteData.planName = '';
      break;
    }
  }
  if (!siteData) { toast('Website not found', 'error'); return; }
  editWebsiteModal(siteData, (data) => {
    const update = {
      siteName: data.siteName, siteUrl: data.siteUrl, controlPanelUrl: data.cpUrl
    };
    if (data.planId !== undefined) { update.planId = data.planId; update.planName = data.planName || ''; }
    apiUpdateWebsite(websiteId, update).then(r => { if (r.success) { toast('Website updated', 'success'); apiLogActivity('website_updated', 'Updated ' + data.siteName, data.siteName); loadWebsites(); } else { toast('Failed: ' + r.error, 'error'); } });
  });
}

async function deleteWebsite(websiteId) {
  const uid = ++modalIdCounter;
  const id = createModal('Delete Website', `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:3rem;color:#e74c3c;margin-bottom:12px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
      <p style="font-size:1rem;color:#444;margin:0 0 6px;">Delete this website?</p>
      <p style="font-size:0.85rem;color:#999;margin:0;">This action cannot be undone.</p>
    </div>
    <div class="modal-actions" style="margin-top:20px;">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-danger" id="del-web-${uid}">Delete</button>
    </div>
  `);
  document.getElementById('del-web-' + uid).onclick = async () => {
    closeModal(id);
    const rows = document.querySelectorAll('#websitesTable tr');
    let delName = 'Unknown';
    for (const row of rows) { const c = row.querySelectorAll('td'); if (c.length >= 7 && c[0].textContent.trim() === websiteId) { delName = c[1].textContent.trim(); break; } }
    const result = await apiDeleteWebsite(websiteId);
    if (result.success) { toast('Website deleted', 'success'); apiLogActivity('website_deleted', 'Deleted website ' + delName, delName); loadWebsites(); } else { toast('Failed: ' + result.error, 'error'); }
  };
}

function transferWebsite(websiteId, currentUserId, currentUserName) {
  const uid = ++modalIdCounter;
  const id = createModal('Transfer Ownership', `
    <div style="background:var(--primary-light);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.85rem;">
      <i class="fa-solid fa-right-left"></i> Transferring <strong id="tw-name-${uid}">...</strong><br>
      <span class="text-muted" style="font-size:0.8rem;">Current: <span id="tw-current-${uid}">${escapeHtml(currentUserName)}</span></span>
    </div>
    <div class="modal-field">
      <label>Transfer to Verified User</label>
      <select id="tw-user-${uid}"><option value="">Loading users...</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn-modal btn-modal-secondary" onclick="closeParentModal(this)">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="tw-save-${uid}"><i class="fa-solid fa-right-left"></i> Transfer</button>
    </div>
  `);
  const rows = document.querySelectorAll('#websitesTable tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 7 && cells[0].textContent.trim() === websiteId) {
      document.getElementById('tw-name-' + uid).textContent = cells[1].textContent.trim();
      break;
    }
  }
  apiAdminGetVerifiedUsers().then(r => {
    const sel = document.getElementById('tw-user-' + uid);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select User --</option>';
    if (r.success) {
      const rank = { superadmin: 0, admin: 1, user: 2 };
      r.users.sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3));
      r.users.forEach(u => {
        sel.innerHTML += '<option value="' + escapeHtml(u.id) + '" data-name="' + escapeHtml(u.fullName) + '">' + escapeHtml(u.fullName) + ' (' + escapeHtml(u.email) + ')</option>';
      });
    }
  });
  document.getElementById('tw-save-' + uid).onclick = async () => {
    const sel = document.getElementById('tw-user-' + uid);
    const newUserId = sel ? sel.value : '';
    const newUserName = newUserId && sel.selectedOptions[0] ? sel.selectedOptions[0].getAttribute('data-name') : '';
    if (!newUserId) { toast('Select a user to transfer to', 'error'); return; }
    closeModal(id);
    const result = await apiUpdateWebsite(websiteId, { userId: newUserId, userName: newUserName });
    if (result.success) { toast('Ownership transferred to ' + newUserName, 'success'); apiLogActivity('website_transferred', 'Transferred to ' + newUserName, newUserName); loadWebsites(); }
    else { toast('Failed: ' + result.error, 'error'); }
  };
}
