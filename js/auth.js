function getToken() {
  const user = auth.currentUser;
  return user ? user.uid : null;
}

function getUserData() {
  const data = localStorage.getItem('userData');
  return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
  return !!getUserData();
}

function isAdmin() {
  const user = getUserData();
  return user && (user.role === 'admin' || user.role === 'superadmin');
}

async function refreshUserData() {
  let user = auth.currentUser;
  if (!user) {
    await new Promise(resolve => {
      const unsub = auth.onAuthStateChanged(u => {
        if (u) { unsub(); resolve(); }
      });
      setTimeout(() => { unsub(); resolve(); }, 4000);
    });
    user = auth.currentUser;
  }
  if (!user) { localStorage.removeItem('userData'); return null; }
  try {
    const result = await apiGetUser(user.uid);
    if (result.success) {
      localStorage.setItem('userData', JSON.stringify(result.user));
      return result.user;
    }
  } catch (e) {}
  return null;
}

async function login(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    await cred.user.getIdToken(true);
    const result = await apiGetUser(uid);
    if (!result.success) return result;
    localStorage.setItem('userData', JSON.stringify(result.user));
    return { success: true, user: result.user };
  } catch (err) {
    let msg = err.message;
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      msg = 'Invalid email or password';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Invalid email format';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many attempts. Try again later.';
    }
    return { success: false, error: msg };
  }
}

async function register(fullName, email, password, contactNumber) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    // Force token refresh so Firestore rules see the authenticated user
    await cred.user.getIdToken(true);
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'superadmin' : 'user';
    const isVerified = contactNumber && contactNumber.trim().replace(/\D/g, '').length >= 10;
    const verifiedAt = isVerified ? new Date().toISOString() : '';
    const userData = {
      fullName, email, contactNumber, role,
      isVerified, verifiedAt,
      createdAt: new Date().toISOString()
    };
    await db.collection('users').doc(uid).set(userData);
    localStorage.setItem('userData', JSON.stringify({ id: uid, ...userData }));
    return { success: true, user: { id: uid, ...userData } };
  } catch (err) {
    let msg = err.message;
    if (err.code === 'auth/email-already-in-use') {
      msg = 'Email already registered';
    } else if (err.code === 'auth/weak-password') {
      msg = 'Password must be at least 6 characters';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Invalid email format';
    }
    return { success: false, error: msg };
  }
}

function logout() {
  auth.signOut();
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
}

auth.onAuthStateChanged(user => {
  if (user && !localStorage.getItem('userData')) {
    apiGetUser(user.uid).then(r => {
      if (r.success) localStorage.setItem('userData', JSON.stringify(r.user));
    });
  }
  if (!user) {
    localStorage.removeItem('userData');
  }
});
