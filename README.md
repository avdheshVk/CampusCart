
# Campus Cart — Simple E-Commerce Web App

A full-stack e-commerce website built for a college (CA/BCA) project.

## Tech Stack
- **Backend:** Node.js + Express
- **Views:** EJS templates (server-rendered)
- **Database:** SQLite (via `better-sqlite3` — no separate DB server needed)
- **Auth:** Sessions + bcrypt password hashing

## Features
- Product catalog with search and category filter
- Product detail pages
- Shopping cart (session-based — works even before logging in)
- User registration & login
- Checkout that creates an order, then a **demo payment gateway (CampusPay)**: scan a QR code with your phone and the order is placed automatically (or use a test-card form)
- Order history for each user
- Admin panel to add / edit / delete products
- Dark "liquid glass" UI (frosted glass panels over a gradient backdrop) with
  a page-transition wipe on navigation and click ripples on buttons

## Setup

1. Make sure you have **Node.js** (v18+) installed.
2. Open a terminal in this folder and install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser at **http://localhost:3000**

The SQLite database file (`db/app.db`) is created automatically the first time
you run the app, along with 10 sample products.

## Payment Gateway (Demo)
After **Proceed to Payment**, the order is saved as *awaiting payment* and the
customer lands on `/pay/<order id>`:
- **Scan QR:** the page shows a scannable QR code. Scanning it with a phone (same Wi-Fi as the
  computer) opens `/pay/scan/<secret token>` on the phone, which pays the order automatically.
  The payment page on the computer checks every 2 seconds, sees the order is paid, and moves
  to *My Orders* by itself — no button to press.
- **Card:** validates the card (Luhn check, expiry, CVV). Test card: `4242 4242 4242 4242`,
  any future expiry, any CVV. A card ending in `0002` is always declined (to show the failure case).
- Card details are never stored. A successful payment marks the order *paid* and saves the method,
  a fake reference (e.g. `CP-7F3A9C21B4`) and the time.
- No real money moves. Swapping in Razorpay/Stripe later would only change `routes/payment.js`.

**Demo tips for the QR:** the QR contains this computer's Wi-Fi address (e.g. `http://192.168.1.5:3000/...`),
because a phone can't open `localhost`. If Windows shows a firewall prompt the first time, click *Allow*.
Presenting over the internet or on a different network? Set `PUBLIC_URL` (for example an ngrok link):
`$env:PUBLIC_URL="https://your-link.ngrok-free.app"; npm start`

## Default Admin Login
```
Email:    admin@campuscart.com
Password: admin123
```
Log in with this account and click **Admin** in the navbar to add, edit, or
delete products.

## Project Structure
```
campus-cart/
├── server.js              # App entry point
├── db/
│   └── database.js        # DB connection, table creation, seed data
├── middleware/
│   └── auth.js             # requireLogin / requireAdmin guards
├── lib/qrcode/             # Bundled MIT-licensed QR encoder (no npm package needed)
├── utils/qr.js             # Turns text into an inline SVG QR code
├── utils/network.js        # Finds the LAN address a phone can reach
├── routes/
│   ├── index.js            # Home page + product detail
│   ├── auth.js              # Register / login / logout
│   ├── cart.js               # Cart + checkout
│   ├── orders.js             # Order history
│   ├── payment.js            # Demo payment gateway (QR scan + card)
│   └── admin.js                # Admin product management
├── views/                  # EJS templates
│   ├── partials/            # header/footer
│   └── admin/                 # admin panel views
└── public/css/style.css    # Styling
```

## Ideas to Extend (good for a viva / demo talking points)
- Add product reviews & ratings
- Add pagination on the product listing
- Add a wishlist feature
- Add order status updates (processing → shipped → delivered) from the admin panel
- Deploy it (Render, Railway, or a college server) so it's live for your demo
- Swap the in-memory session store for `connect-sqlite3` for production use
