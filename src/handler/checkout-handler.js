const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const checkoutHandler = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

checkoutHandler.get('/checkout', async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const accessToken = authorizationHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const checkoutSnapshot = await admin.firestore().collection('checkout').where('userId', '==', userId).get();
    const checkout = checkoutSnapshot.docs.map(doc => {
      const data = doc.data();
      const formattedTotal = `Rp${data.total.toLocaleString()}`;
      return { checkoutId: doc.id, ...data, total: formattedTotal };
    });

    res.status(200).json(checkout);
  } catch (error) {
    console.error('Kesalahan mengambil checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

checkoutHandler.get('/checkout/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const accessToken = authorizationHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    const checkoutDoc = await admin.firestore().collection('checkout').doc(checkoutId).get();
    if (!checkoutDoc.exists) {
      return res.status(404).json({ error: 'Checkout tidak ditemukan' });
    }

    res.status(200).json(checkoutDoc.data());
  } catch (error) {
    console.error('Kesalahan mengambil data checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

checkoutHandler.post('/checkout', upload.single('image'), async (req, res) => {
  try {
    const { customer, shipping, items, total } = req.body;
    const file = req.file;

    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const accessToken = authorizationHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const fileName = `${Date.now()}_${file.originalname}`;
    const bucket = admin.storage().bucket('farm-fresh-d8e1b.appspot.com');

    const fileUpload = bucket.file(fileName);
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    const formattedTotal = `Rp${total.toLocaleString()}`;

    const newCheckout = {
      userId,
      customer,
      shipping,
      items,
      total: formattedTotal,
      checkoutDate: admin.firestore.Timestamp.now(),
      image: imageUrl
    };

    const checkoutRef = await admin.firestore().collection('checkout').add(newCheckout);

    const cartSnapshot = await admin.firestore().collection('carts').where('userId', '==', userId).get();
    cartSnapshot.forEach(async doc => {
      await admin.firestore().collection('carts').doc(doc.id).delete();
    });
    
    res.status(201).json({ message: 'Checkout berhasil dibuat', checkout: { checkoutId: checkoutRef.id, ...newCheckout } });
  } catch (error) {
    console.error('Kesalahan membuat checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

checkoutHandler.put('/checkout/:checkoutId', upload.single('image'), async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const { customer, shipping, items, total } = req.body;
    const file = req.file;
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const accessToken = authorizationHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const checkoutDoc = await admin.firestore().collection('checkout').doc(checkoutId).get();
    if (!checkoutDoc.exists) {
      return res.status(404).json({ error: 'Checkout tidak ditemukan' });
    }

    if (checkoutDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Tidak diizinkan untuk mengubah checkout ini' });
    }

    let imageUrl;
    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const bucket = admin.storage().bucket('your-bucket-name');

      const fileUpload = bucket.file(fileName);
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }

    const formattedTotal = `Rp${total.toLocaleString()}`;

    const updatedCheckout = {
      customer,
      shipping,
      items,
      total: formattedTotal,
      checkoutDate: admin.firestore.Timestamp.now(),
      image: imageUrl || checkoutDoc.data().image
    };

    await admin.firestore().collection('checkout').doc(checkoutId).update(updatedCheckout);

    res.status(200).json({ message: 'Checkout berhasil diperbarui', checkout: { checkoutId, ...updatedCheckout } });
  } catch (error) {
    console.error('Kesalahan memperbarui checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

checkoutHandler.delete('/checkout/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Token tidak tersedia' });
    }

    const accessToken = authorizationHeader.replace('Bearer ', '');
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const checkoutDoc = await admin.firestore().collection('checkout').doc(checkoutId).get();
    if (!checkoutDoc.exists) {
      return res.status(404).json({ error: 'Checkout tidak ditemukan' });
    }

    if (checkoutDoc.data().userId !== userId) {
      return res.status(403).json({ error: 'Tidak diizinkan untuk menghapus checkout ini' });
    }

    await admin.firestore().collection('checkout').doc(checkoutId).delete();
    res.status(200).json({ message: 'Checkout berhasil dihapus' });
  } catch (error) {
    console.error('Kesalahan menghapus checkout:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

module.exports = checkoutHandler;
