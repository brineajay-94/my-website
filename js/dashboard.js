function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatMemberSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
  t.innerHTML = '<i class="fa-solid ' + icon + '"></i> ' + escapeHtml(msg);
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

function copyUrl(url) {
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    showToast('URL copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy URL', 'error');
  });
}

function buildSiteCard(site) {
  const card = document.createElement('div');
  card.className = 'site-card';
  let actions = '<a href="' + escapeHtml(site.siteUrl) + '" target="_blank" class="btn btn-primary"><i class="fa-solid fa-arrow-up-right-from-square"></i> Visit</a>';
  if (site.controlPanelUrl) {
    actions += '<button onclick="openPanel(\'' + escapeHtml(site.controlPanelUrl) + '\')" class="btn btn-outline"><i class="fa-solid fa-sliders"></i> Panel</button>';
  }
  actions += '<button onclick="copyUrl(\'' + escapeHtml(site.siteUrl) + '\')" class="btn btn-ghost" title="Copy URL"><i class="fa-solid fa-link"></i></button>';
  const planBadge = site.planName ? '<div class="site-plan"><i class="fa-solid fa-tag"></i> ' + escapeHtml(site.planName) + '</div>' : '';
  card.innerHTML = '<div class="site-info"><h3>' + escapeHtml(site.siteName) + '</h3><a href="' + escapeHtml(site.siteUrl) + '" target="_blank" class="site-url">' + escapeHtml(site.siteUrl) + '</a>' + planBadge + '</div><div class="site-actions">' + actions + '</div>';
  return card;
}

async function loadDashboard() {
  if (!isLoggedIn()) { window.location.href = 'login.html'; return; }

  const user = getUserData();
  const uid = user.id;

  document.getElementById('currentYear').textContent = new Date().getFullYear();

  const result = await apiGetUser(uid);
  let userData = user;
  if (result.success) {
    userData = result.user;
    localStorage.setItem('userData', JSON.stringify(userData));
  }

  const isAdminUser = userData.role === 'admin' || userData.role === 'superadmin';

  document.getElementById('userAvatar').textContent = getInitials(userData.fullName);
  document.getElementById('userName').textContent = userData.fullName;
  document.getElementById('userEmail').textContent = userData.email;

  const sinceStr = formatMemberSince(userData.createdAt);
  let badges = '';
  badges += userData.isVerified === true
    ? '<span class="badge badge-verified"><i class="fa-solid fa-check-circle"></i> Verified</span>'
    : '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> Pending</span>';
  const roleLabel = userData.role === 'superadmin' ? 'Superadmin' : isAdminUser ? 'Admin' : 'User';
  const roleBadgeClass = userData.role === 'superadmin' ? 'badge-admin' : isAdminUser ? 'badge-admin' : 'badge-user';
  badges += '<span class="badge ' + roleBadgeClass + '"><i class="fa-solid fa-shield-halved"></i> ' + roleLabel + '</span>';
  if (sinceStr) badges += '<span class="badge badge-since"><i class="fa-solid fa-calendar"></i> Since ' + sinceStr + '</span>';
  document.getElementById('badgesContainer').innerHTML = badges;

  document.getElementById('statWebsites').textContent = '0';
  document.getElementById('statStatus').textContent = userData.isVerified === true ? 'Verified' : 'Pending';
  document.getElementById('statStatus').style.color = userData.isVerified === true ? '#27ae60' : '#e67e22';
  const displayRole = userData.role === 'superadmin' ? 'Superadmin' : isAdminUser ? 'Admin' : 'User';
  document.getElementById('statRole').textContent = displayRole;
  document.getElementById('statRole').style.color = isAdminUser ? '#e74c3c' : '#3498db';

  if (isAdminUser) {
    document.getElementById('adminLink').style.display = 'inline-flex';
    document.getElementById('actionAdmin').style.display = 'flex';
  }

  const banner = document.getElementById('unverifiedBanner');
  if (banner) {
    if (userData.isVerified === true) {
      banner.style.display = 'none';
    } else {
      banner.style.display = 'flex';
      const msg = banner.querySelector('span');
      if (msg) {
        if (userData.verifiedAt) {
          msg.innerHTML = 'Your verification was revoked by an admin. <a href="account.html">Contact support</a> if you have questions.';
        } else {
          msg.innerHTML = 'Your account is not verified. <a href="account.html">Add a phone number</a> to get verified and unlock all features.';
        }
      }
    }
  }

  const wsResult = await apiGetWebsites(uid);
  const container = document.getElementById('websitesList');
  container.innerHTML = '';
  const sitesHeading = document.getElementById('sitesHeading');
  const sitesSection = document.getElementById('sitesSection');

  if (userData.isVerified !== true) {
    if (sitesSection) sitesSection.style.display = 'none';
  } else {
    if (sitesSection) sitesSection.style.display = 'block';
    if (wsResult.success && wsResult.websites.length > 0) {
      document.getElementById('statWebsites').textContent = wsResult.websites.length;
      wsResult.websites.forEach(site => container.appendChild(buildSiteCard(site)));
    } else {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-globe"></i><h3>No websites assigned</h3><p>Contact the admin to get websites assigned to your account.</p></div>';
    }
  }

  document.getElementById('loadingSkeleton').style.display = 'none';
  document.getElementById('dashboardContent').style.display = 'block';

  loadRecentMessages(uid);
}

function loadRecentMessages(uid) {
  const container = document.getElementById('recentMessages');
  const title = document.getElementById('recentMsgTitle');
  const msgRef = messagesRef(uid);
  msgRef.orderByChild('timestamp').limitToLast(5).once('value', snap => {
    if (!snap.exists() || !snap.hasChildren()) { return; }
    const msgs = [];
    snap.forEach(child => msgs.push({ key: child.key, ...child.val() }));
    msgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const unread = msgs.filter(m => !m.seen && m.sender === 'admin');
    if (unread.length === 0) { return; }
    title.style.display = 'flex';
    container.innerHTML = '';
    unread.forEach(msg => {
      const div = document.createElement('a');
      div.className = 'msg-preview unseen';
      div.href = 'support.html';
      div.innerHTML = '<div class="msg-icon"><i class="fa-solid fa-headset"></i></div><div class="msg-info"><div class="msg-text">' + escapeHtml(msg.text) + '</div><div class="msg-time"><span class="msg-from">Support Team</span> &middot; ' + formatChatTime(msg.timestamp) + '</div></div><div class="msg-arrow"><i class="fa-solid fa-chevron-right"></i></div>';
      container.appendChild(div);
    });
  });
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function openPanel(url) {
  document.getElementById('panelUrl').textContent = url;
  document.getElementById('panelFrame').src = url;
  document.getElementById('panelOpenExt').href = url;
  document.getElementById('panelOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePanel() {
  document.getElementById('panelOverlay').classList.remove('active');
  document.getElementById('panelFrame').src = '';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
});
