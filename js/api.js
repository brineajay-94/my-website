function docData(id, doc) {
  return doc.exists ? { id, ...doc.data() } : null;
}

function collectionData(snapshot) {
  const arr = [];
  snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
  return arr;
}

async function apiGetUser(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return { success: false, error: 'User not found' };
    return { success: true, user: { id: uid, ...doc.data() } };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiUpdateSelf(uid, data) {
  try {
    const update = {};
    if (data.fullName !== undefined) update.fullName = data.fullName;
    if (data.contactNumber !== undefined) update.contactNumber = data.contactNumber;
    if (data.isVerified !== undefined) { update.isVerified = data.isVerified; if (data.isVerified) { update.verifiedAt = new Date().toISOString(); } else { update.verifiedAt = firebase.firestore.FieldValue.delete(); } }
    await db.collection('users').doc(uid).update(update);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiGetWebsites(uid) {
  try {
    const snapshot = await db.collection('websites').where('userId', '==', uid).get();
    return { success: true, websites: collectionData(snapshot) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAddWebsite(data) {
  try {
    const userDoc = await db.collection('users').doc(data.userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    const user = userDoc.data();
    if (user.isVerified !== true) return { success: false, error: 'User is not verified' };
    const ref = await db.collection('websites').add({
      userId: data.userId,
      userName: user.fullName,
      siteName: data.siteName,
      siteUrl: data.siteUrl,
      controlPanelUrl: data.controlPanelUrl || '',
      planId: data.planId || '',
      planName: data.planName || '',
      createdAt: new Date().toISOString()
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiDeleteWebsite(websiteId) {
  try {
    await db.collection('websites').doc(websiteId).delete();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiUpdateWebsite(websiteId, data) {
  try {
    const update = {};
    if (data.siteName !== undefined) update.siteName = data.siteName;
    if (data.siteUrl !== undefined) update.siteUrl = data.siteUrl;
    if (data.controlPanelUrl !== undefined) update.controlPanelUrl = data.controlPanelUrl;
    if (data.planId !== undefined) update.planId = data.planId;
    if (data.planName !== undefined) update.planName = data.planName;
    if (data.userId !== undefined) update.userId = data.userId;
    if (data.userName !== undefined) update.userName = data.userName;
    await db.collection('websites').doc(websiteId).update(update);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminGetAllUsers() {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    return { success: true, users: collectionData(snapshot) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminGetVerifiedUsers() {
  try {
    const snapshot = await db.collection('users').where('isVerified', '==', true).get();
    return { success: true, users: collectionData(snapshot) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminGetStats() {
  try {
    const usersSnap = await db.collection('users').get();
    const websitesSnap = await db.collection('websites').get();
    const users = collectionData(usersSnap);
    const verified = users.filter(u => u.isVerified === true);
    const unverified = users.filter(u => u.isVerified !== true);
    const recent = users.slice(-10).reverse().map(u => ({
      id: u.id, fullName: u.fullName, email: u.email,
      role: u.role, isVerified: u.isVerified, createdAt: u.createdAt
    }));
    return {
      success: true,
      stats: {
        totalUsers: users.length,
        totalWebsites: websitesSnap.size,
        verifiedUsers: verified.length,
        unverifiedUsers: unverified.length,
        recentRegistrations: recent
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminUpdateUser(userId, data) {
  try {
    const update = {};
    if (data.fullName !== undefined) update.fullName = data.fullName;
    if (data.email !== undefined) update.email = data.email;
    if (data.contactNumber !== undefined) update.contactNumber = data.contactNumber;
    if (data.role !== undefined) update.role = data.role;
    if (data.isVerified !== undefined) { update.isVerified = data.isVerified; if (data.isVerified) update.verifiedAt = new Date().toISOString(); }
    await db.collection('users').doc(userId).update(update);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminDeleteUser(userId) {
  try {
    await db.collection('users').doc(userId).delete();
    const sites = await db.collection('websites').where('userId', '==', userId).get();
    const batch = db.batch();
    sites.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAdminGetAllWebsites() {
  try {
    const snapshot = await db.collection('websites').orderBy('createdAt', 'desc').get();
    const websites = collectionData(snapshot);
    const usersSnap = await db.collection('users').get();
    const userMap = {};
    usersSnap.forEach(d => { userMap[d.id] = d.data().fullName; });
    websites.forEach(w => { w.userName = userMap[w.userId] || 'Unknown'; });
    return { success: true, websites };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiGetPlans(activeOnly) {
  try {
    let query = db.collection('plans');
    if (activeOnly) query = query.where('isActive', '==', true);
    const snapshot = await query.get();
    const plans = collectionData(snapshot);
    plans.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return { success: true, plans };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiAddPlan(data) {
  try {
    const ref = await db.collection('plans').add({
      name: data.name,
      price: Number(data.price),
      currency: data.currency || 'NPR',
      duration: data.duration || 'monthly',
      maxWebsites: Number(data.maxWebsites) || 0,
      features: data.features || [],
      isActive: data.isActive !== false,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiUpdatePlan(planId, data) {
  try {
    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.price !== undefined) update.price = Number(data.price);
    if (data.currency !== undefined) update.currency = data.currency;
    if (data.duration !== undefined) update.duration = data.duration;
    if (data.maxWebsites !== undefined) update.maxWebsites = Number(data.maxWebsites);
    if (data.features !== undefined) update.features = data.features;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    await db.collection('plans').doc(planId).update(update);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiDeletePlan(planId) {
  try {
    await db.collection('plans').doc(planId).delete();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiLogActivity(type, detail, targetName) {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Not authenticated' };
    await db.collection('activity').add({
      type,
      detail,
      targetName: targetName || '',
      performedBy: getUserData()?.fullName || user.email || 'Unknown',
      performedById: user.uid,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiGetRecentActivities(limitCount) {
  try {
    limitCount = limitCount || 20;
    const snapshot = await db.collection('activity').orderBy('createdAt', 'desc').limit(limitCount).get();
    return { success: true, activities: collectionData(snapshot) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function apiClearActivity() {
  try {
    const snapshot = await db.collection('activity').get();
    if (snapshot.empty) return { success: true };
    const docs = [];
    snapshot.forEach(d => docs.push(d.ref));
    while (docs.length) {
      const batch = db.batch();
      const chunk = docs.splice(0, 499);
      chunk.forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
