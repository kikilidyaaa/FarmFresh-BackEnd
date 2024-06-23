const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://farm-fresh-d8e1b-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "farm-fresh-d8e1b.appspot.com"
});

module.exports = admin;