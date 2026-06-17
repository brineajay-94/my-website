const firebaseConfig = {
  apiKey: "AIzaSyDW5Y_7EFQiyioCSAlvhfdfTF1NFxVS7P0",
  authDomain: "mywebsite-8d14a.firebaseapp.com",
  databaseURL: "https://mywebsite-8d14a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mywebsite-8d14a",
  storageBucket: "mywebsite-8d14a.firebasestorage.app",
  messagingSenderId: "761969544927",
  appId: "1:761969544927:web:c8377ed3d86b50096de36a",
  measurementId: "G-DBK1ZY9XM2"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const ADMIN_EMAIL = 'ajaykafle254@gmail.com';
