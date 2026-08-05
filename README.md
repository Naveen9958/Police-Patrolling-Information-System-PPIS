# 🚔 PPIS: Police Patrol & Incident System

PPIS is a full-stack web application designed for law enforcement patrol management. It provides an admin command console for managing officers and checkpoints, and a separate officer portal for completing assigned checkpoints — all backed by MongoDB, with no hardcoded accounts.

## ✨ Core Features
* **Two Login Portals:** Separate Admin and Officer sign-in, checked against real accounts in MongoDB (no demo/hardcoded login).
* **Checkpoint Assignment:** Admins assign each checkpoint to a specific officer from the Checkpoints page.
* **Officer Portal:** Officers see only the checkpoints assigned to them and mark them complete. A completed checkpoint automatically reopens 24 hours later.
* **Officer Locations:** Map view (Leaflet) plotting the live coordinates of all officers currently on record, with a refresh action to pull the latest reported positions.
* **Officer Roster:** Admins enroll and remove officer/admin accounts.
* **Patrol Logs:** History of checkpoint completions, recorded automatically when an officer completes an assigned checkpoint.

## 🔑 First-time setup
There's no seeded account out of the box. Before logging in for the first time, create the initial admin account:
```bash
cd backend
npm run seed
```
This creates one Admin account (email/password printed to the console) — log in on the Admin tab and use the Officers page to create real officer/admin accounts, then change the seeded password.

## 🛠️ Tech Stack
* **Frontend:** React.js, Vite, React-Leaflet (Maps), Axios
* **Backend:** Node.js, Express.js (REST API), MongoDB (Mongoose)
* **Styling:** Custom CSS with Glassmorphism/Dark UI elements

## 📂 Project Structure
This repository is organized as a monorepo containing both the frontend and backend codebases:
```text
PPIS/
├── frontend/       # React application (Vite)
├── backend/        # Node.js/Express API server
├── .gitignore
└── README.md
