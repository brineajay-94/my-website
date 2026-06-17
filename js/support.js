const rtdb = firebase.database();
const CHATS_REF = rtdb.ref('support/chats');

function chatIdFromUser(uid) {
  return uid;
}

function chatRef(chatId) {
  return CHATS_REF.child(chatId);
}

function messagesRef(chatId) {
  return CHATS_REF.child(chatId + '/messages');
}

async function createOrGetChat(uid, userName, userEmail) {
  const ref = chatRef(uid);
  const snap = await ref.once('value');
  if (snap.exists()) return uid;
  await ref.set({
    userId: uid,
    userName: userName,
    userEmail: userEmail,
    lastMessage: '',
    lastTimestamp: Date.now(),
    unreadAdmin: 0,
    unreadUser: 0
  });
  return uid;
}

function sendMessage(chatId, senderId, senderName, text) {
  const msgRef = messagesRef(chatId).push();
  const msg = {
    sender: senderId,
    senderName: senderName,
    text: text,
    timestamp: Date.now(),
    seen: false
  };
  return msgRef.set(msg).then(() => {
    return chatRef(chatId).update({
      lastMessage: text,
      lastTimestamp: Date.now()
    });
  });
}

function deleteMessage(chatId, msgKey) {
  return messagesRef(chatId).child(msgKey).remove();
}

function deleteChat(chatId) {
  return chatRef(chatId).remove();
}

function formatChatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
  if (isYesterday) return 'Yesterday ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom(el) {
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}
