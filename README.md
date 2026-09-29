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
- Checkout that creates a real order in the database
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
├── routes/
│   ├── index.js            # Home page + product detail
│   ├── auth.js              # Register / login / logout
│   ├── cart.js               # Cart + checkout
│   ├── orders.js             # Order history
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
