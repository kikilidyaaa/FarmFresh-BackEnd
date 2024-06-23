const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const loginHandler = require('./handler/login-handler');
const registerHandler = require('./handler/register-handler');
const userHandler = require('./handler/user-handler');
const productHandler = require('./handler/product-handler');
const farmHandler = require('./handler/farm-handler');
const cartHandler = require('./handler/cart-handler');
const checkoutHandler = require('./handler/checkout-handler');
const historyHandler = require('./handler/history-handler');

const app = express();
const PORT = process.env.PORT || 'https://farm-fresh-d8e1b.web.app/';

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to Farm Fresh API</h1>
    <p>Base URL: <code>https://farmfresh-backend.vercel.app</code></p>
    <h2>Available Endpoints:</h2>
    <h3>Authentication</h3>
    <ul>
      <li><strong>POST</strong> /api/login</li>
      <li><strong>POST</strong> /api/register</li>
    </ul>
    <h3>User</h3>
    <ul>
      <li><strong>GET</strong> /api/user</li>
      <li><strong>GET</strong> /api/user/profiles (Membutuhkan Authorization)</li>
      <li><strong>PUT</strong> /api/user/profiles (Membutuhkan Authorization)</li>
      <li><strong>DELETE</strong> /api/user/profiles (Membutuhkan Authorization)</li>
    </ul>
    <h3>Products</h3>
    <ul>
      <li><strong>GET</strong> /api/products</li>
      <li><strong>GET</strong> /api/products/:id</li>
      <li><strong>GET</strong> /api/products/type/:type</li>
      <li><strong>POST</strong> /api/products (Membutuhkan Authorization)</li>
      <li><strong>PUT</strong> /api/products/:id (Membutuhkan Authorization)</li>
      <li><strong>DELETE</strong> /api/products/:id (Membutuhkan Authorization)</li>
    </ul>
    <h3>Farms</h3>
    <ul>
      <li><strong>GET</strong> /api/farms</li>
      <li><strong>GET</strong> /api/farms/:id</li>
      <li><strong>POST</strong> /api/farms (Membutuhkan Authorization)</li>
      <li><strong>PUT</strong> /api/farms/:id (Membutuhkan Authorization)</li>
      <li><strong>DELETE</strong> /api/farms/:id (Membutuhkan Authorization)</li>
      <li><strong>POST</strong> /api/farms/uploadImage (Membutuhkan Authorization)</li>
    </ul>
    <h3>Cart</h3>
    <ul>
      <li><strong>GET</strong> /api/cart/carts</li>
      <li><strong>POST</strong> /api/cart/carts</li>
      <li><strong>PUT</strong> /api/cart/carts/:itemId</li>
      <li><strong>DELETE</strong> /api/cart/carts/:itemId</li>
      <li><strong>DELETE</strong> /api/cart/carts</li>
    </ul>
    <h3>Checkout</h3>
    <ul>
      <li><strong>GET</strong> /api/checkout/checkout</li>
      <li><strong>GET</strong> /api/checkout/checkout/:checkoutId</li>
      <li><strong>POST</strong> /api/checkout/checkout</li>
      <li><strong>PUT</strong> /api/checkout/checkout/:checkoutId</li>
      <li><strong>DELETE</strong> /api/checkout/checkout/:checkoutId</li>
    </ul>
    <h3>Order History</h3>
    <ul>
      <li><strong>GET</strong> /api/history (Membutuhkan Authorization)</li>
    </ul>
  `);
});

app.use('/api', loginHandler);
app.use('/api', registerHandler);
app.use('/api', userHandler);
app.use('/api', productHandler);
app.use('/api', farmHandler);
app.use('/api', cartHandler);
app.use('/api', checkoutHandler);
app.use('/api', historyHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
