/* Sidebar toggle */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

/* Toast notifications */
function toast(message, type, duration) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  type = type || 'info';
  duration = duration || 4000;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i> ' + message +
    '<button class="toast-close" onclick="this.parentElement.classList.add(\'toast-exit\');setTimeout(()=>this.parentElement.remove(),300)">&times;</button>';
  container.appendChild(t);
  setTimeout(() => { if (t.parentElement) { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300); } }, duration);
}

/* Table search/filter */
function initTableSearch(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);
  if (!input || !table) return;
  input.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const rows = table.querySelectorAll('tbody tr');
    let visible = 0;
    rows.forEach(row => {
      const match = Array.from(row.querySelectorAll('td')).some(cell => cell.textContent.toLowerCase().includes(q));
      row.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    const empty = table.querySelector('.empty-search');
    if (empty) { empty.style.display = visible === 0 ? '' : 'none'; }
  });
}

/* Loading state helpers */
function showLoading(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

/* Copy to clipboard */
function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    toast((label || 'Text') + ' copied!', 'success', 2000);
  }).catch(() => {
    toast('Failed to copy', 'error');
  });
}

/* Support unread badge */
let supportBadgeListener = null;

function initSupportBadge() {
  if (supportBadgeListener) return;
  if (typeof firebase === 'undefined' || !firebase.database) return;
  const rtdb = firebase.database();
  const chatsRef = rtdb.ref('support/chats');
  supportBadgeListener = chatsRef.on('value', snap => {
    let total = 0;
    snap.forEach(child => { total += child.val().unreadAdmin || 0; });
    const badge = document.getElementById('sidebarUnread');
    if (!badge) return;
    if (total > 0) { badge.textContent = total > 99 ? '99+' : total; badge.style.display = 'inline'; }
    else { badge.style.display = 'none'; }
  });
}

/* Refresh button */
function initRefresh(btnId, callback) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', function() {
    const icon = this.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
    Promise.resolve(callback()).finally(() => {
      if (icon) setTimeout(() => icon.className = 'fa-solid fa-rotate', 500);
    });
  });
}

/* Export table as CSV */
function exportCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = [];
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const vals = Array.from(cells).map(c => '"' + c.textContent.replace(/"/g, '""') + '"');
    csv.push(vals.join(','));
  });
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename || 'export') + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Exported as CSV', 'success', 2000);
}
