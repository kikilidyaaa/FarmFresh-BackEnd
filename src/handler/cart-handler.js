const express = require('express');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const cartHandler = express.Router();

cartHandler.get('/carts', async (req, res) => {
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

    const cartId = userDoc.data().cartId;
    const cartSnapshot = await admin.firestore().collection('carts').doc(cartId).collection('items').get();
    const cartItems = await Promise.all(cartSnapshot.docs.map(async doc => {
      const item = doc.data();
      const productDoc = await admin.firestore().collection('products').doc(item.productId).get();
      const productData = productDoc.data();
      const price = parseFloat(productData.price.replace("Rp", "").replace(".", "").replace(",", "."));
      const totalPrice = price * item.quantity;
      const formattedTotalPrice = `Rp${totalPrice.toLocaleString()}`;
      return {
        ...item,
        itemId: doc.id,
        name: productData.name,
        price: productData.price,
        totalPrice: formattedTotalPrice
      };
    }));

    const formattedTotalCartPrice = cartItems.reduce((total, item) => total + parseFloat(item.totalPrice.replace("Rp", "").replace(".", "").replace(",", ".")), 0);
    const totalCartPrice = `Rp${formattedTotalCartPrice.toLocaleString()}`;

    res.status(200).json({ cartItems, totalCartPrice });
  } catch (error) {
    console.error('Kesalahan mengambil item di keranjang:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

cartHandler.post('/carts', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
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

    const cartId = userDoc.data().cartId;
    const productDoc = await admin.firestore().collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const productData = productDoc.data();
    const price = parseFloat(productData.price.replace("Rp", "").replace(".", "").replace(",", "."));
    const totalPrice = price * quantity;
    const formattedTotalPrice = `Rp${totalPrice.toLocaleString()}`;

    const cartItemRef = admin.firestore().collection('carts').doc(cartId).collection('items');
    const existingCartItem = await cartItemRef.where('productId', '==', productId).get();

    if (!existingCartItem.empty) {
      const existingItem = existingCartItem.docs[0];
      const newQuantity = existingItem.data().quantity + quantity;
      const newTotalPrice = price * newQuantity;
      const formattedNewTotalPrice = `Rp${newTotalPrice.toLocaleString()}`;

      await existingItem.ref.update({ quantity: newQuantity, totalPrice: formattedNewTotalPrice });
      res.status(200).json({ message: 'Quantity item berhasil diperbarui', cartItem: { ...existingItem.data(), quantity: newQuantity, totalPrice: formattedNewTotalPrice, id: existingItem.id } });
    } else {
      const cartItem = {
        productId,
        quantity,
        addedAt: new Date().toISOString(),
        totalPrice: formattedTotalPrice
      };

      const newCartItemRef = cartItemRef.doc();
      await newCartItemRef.set(cartItem);

      res.status(201).json({ message: 'Item berhasil ditambahkan ke keranjang', cartItem: { ...cartItem, id: newCartItemRef.id } });
    }
  } catch (error) {
    console.error('Kesalahan menambahkan item ke keranjang:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

cartHandler.put('/carts/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;
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

    const cartId = userDoc.data().cartId;
    const cartItemRef = admin.firestore().collection('carts').doc(cartId).collection('items').doc(itemId);
    const cartItemDoc = await cartItemRef.get();

    if (!cartItemDoc.exists) {
      return res.status(404).json({ error: 'Item tidak ditemukan di keranjang' });
    }

    const productDoc = await admin.firestore().collection('products').doc(cartItemDoc.data().productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    const productData = productDoc.data();
    const price = parseFloat(productData.price.replace("Rp", "").replace(".", "").replace(",", "."));
    const totalPrice = price * quantity;
    const formattedTotalPrice = `Rp${totalPrice.toLocaleString()}`;

    await cartItemRef.update({ quantity, totalPrice: formattedTotalPrice });

    res.status(200).json({ message: 'Quantity item berhasil diperbarui', cartItem: { ...cartItemDoc.data(), quantity, totalPrice: formattedTotalPrice, id: itemId }});
  } catch (error) {
    console.error('Kesalahan memperbarui quantity item di keranjang:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

cartHandler.delete('/carts/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
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

    const cartId = userDoc.data().cartId;
    const cartItemDoc = await admin.firestore().collection('carts').doc(cartId).collection('items').doc(itemId).get();
    if (!cartItemDoc.exists) {
      return res.status(404).json({ error: 'Item tidak ditemukan di keranjang' });
    }

    await admin.firestore().collection('carts').doc(cartId).collection('items').doc(itemId).delete();
    res.status(200).json({ message: 'Item berhasil dihapus dari keranjang' });
  } catch (error) {
    console.error('Kesalahan menghapus item dari keranjang:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

cartHandler.delete('/carts', async (req, res) => {
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

    const cartId = userDoc.data().cartId;
    const cartItemsSnapshot = await admin.firestore().collection('carts').doc(cartId).collection('items').get();

    if (cartItemsSnapshot.empty) {
      return res.status(404).json({ error: 'Keranjang kosong atau tidak ditemukan' });
    }

    const batch = admin.firestore().batch();
    cartItemsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.status(200).json({ message: 'Semua item berhasil dihapus dari keranjang' });
  } catch (error) {
    console.error('Kesalahan menghapus semua item dari keranjang:', error);
    res.status(500).json({ error: 'Kesalahan Server Internal' });
  }
});

module.exports = cartHandler;
