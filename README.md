# PSG iTech Alumni Association Portal - Backend

This repository contains the **Express/MongoDB backend** for the PSG iTech Alumni Portal application.  
It exposes RESTful APIs for authentication, alumni data, donations and admin dashboards.

## 📁 Project Structure

\`\`\`
config/
controllers/
middleware/
models/
routes/
Server.js
setupAdmin.js
package.json
\`\`\`


## 🚀 Getting Started

### Prerequisites

- Node.js v16+  
- MongoDB (local or Atlas)  
- npm (comes with Node)

### Environment setup

Create a `.env` file in the backend directory using `.env.example` as a template:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/psg_itech_alumni
PORT=5000
```

Use your MongoDB Atlas connection string instead if the database is hosted remotely. Then start the backend with `npm start`.

## 🛠 Core Features

- **Admin authentication & management**  
- **Alumni CRUD operations**  
- **Donation tracking**  
- **Protected routes with JWT**

## 📦 Models

- **Admin** – admin users  
- **Alumni** – alumni records  
- **Donation** – donation entries  