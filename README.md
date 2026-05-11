# BeaconPort: School-Student Management System

A modern **MERN stack** platform with **Tailwind CSS**, role-based dashboards, and scalable architecture.

## 📌 Project Overview

### 🔴 Problem  
Managing large-scale student data, classes, and communication within schools is often inefficient and scattered across multiple tools.

### 🟢 Solution  
**BeaconPort** provides a centralized digital system for school administrators, teachers, and students with **role-based access** and enhanced privacy.

## ✨ Key Features

- **Role-Based Dashboards** → Separate portals for administrators, teachers, and students.
- **Classroom Management Tools** → Attendance tracking, grading, notices, and more.
- **Modern UI** → Developed using **Tailwind CSS**, featuring a **dark theme** with shades of orange and reddish-yellow.
- **Secure Authentication** → JWT-based login system for all roles.

## 🏗️ Tech Stack

| Category       | Technology Used                          |
|---------------|------------------------------------------|
| **Frontend**  | React.js (Vite), Tailwind CSS, Context API, React Router, Material UI |
| **Backend**   | Express.js (ESM), Node.js               |
| **Database**  | MongoDB Atlas                           |
| **Auth**      | JWT with role-based middleware         |
| **Deployment** | Vercel (Frontend) + Render (Backend)  |
| **UI Enhancements** | GSAP animations                   |

---

## 🗓️ 45-Day Development Plan  

### 🏗️ Phase 1: Core Setup (Days 1-7)  

| Day | Task                                          | Deliverable                   | Testing                  |
|-----|----------------------------------------------|------------------------------|--------------------------|
| 1   | Initialize Vite, React, Tailwind.           | Project scaffolded.          | `npm run dev`            |
| 2   | Setup MongoDB and Express (ESM).           | Backend connected.           | API testing.             |
| 3   | Implement JWT authentication.              | Login & protected routes.    | Manual login flow.       |
| 4   | Create admin dashboard & school code generation. | Unique code stored in DB. | UI & database verification. |
| 5   | Develop teacher onboarding system.         | Role-based school join flow. | Validation tests.        |
| 6   | Implement student onboarding via school/class codes. | Verified class joins. | Database checks.        |
| 7   | Deploy backend to Render.                  | Live API functionality.      | Smoke testing.           |

### ⚙️ Phase 2: Core Functionality (Days 8-21)  

| Day | Task                                        | Deliverable                   | Testing                  |
|-----|--------------------------------------------|------------------------------|--------------------------|
| 8   | Admin: Create & view schools.             | School list in dashboard.    | DB verification.         |
| 9   | Teacher: Create & manage classes.         | Unique 4-digit class codes.  | Join validation.         |
| 10  | Student: Join classes using codes.        | Appears in class student list. | Manual testing.        |
| 11  | Implement notice board functionality.     | Posting/retrieval of notices. | Notice validation.      |
| 12  | Develop attendance tracking system.       | Checkbox-based marking.      | UI/database sync check.  |
| 13  | Create grading system for assignments.    | Subject-wise grade entry.    | Data integrity checks.  |
| 14  | Student dashboard: Display grades & attendance. | Analytics-ready UI.  | Test cases with mock data. |

### 🎨 Phase 3: UI/UX Polish (Days 22-35)  

| Day | Task                                      | Deliverable                   | Testing                  |
|-----|------------------------------------------|------------------------------|--------------------------|
| 22  | Integrate Framer Motion for animations. | Smooth transitions & fade-ins. | Visual inspection.      |
| 23  | Implement dark theme.                   | Themed interface.            | Toggle functionality test. |
| 24  | Improve loading states with skeletons.  | Data-fetching indicators.    | Performance checks.      |
| 25  | Implement toast notifications.          | Feedback system.             | Simulated error handling. |
| 26  | Ensure responsive design compatibility. | Mobile-first breakpoints.    | Browser testing.        |
| 27  | Develop sidebar & navigation system.    | Role-based navigation flows. | UI click tests.          |

### 🚀 Phase 4: Final Testing & Launch (Days 36-45)  

| Day | Task                                        | Deliverable                 | Testing                   |
|-----|--------------------------------------------|----------------------------|---------------------------|
| 36  | Secure routes using auth middleware.      | Enforced role-based access. | JWT integrity checks.   |
| 37  | Write unit tests using Jest.              | Backend validation logic.  | `npm test` execution.   |
| 38  | Perform E2E testing using Cypress.        | Validate student journey.  | User flow testing.      |
| 39  | Implement MongoDB rules & rate limits.    | Secured database access.   | Injection prevention.   |
| 40  | Deploy final version of the application.  | Live platform accessible.  | Smoke testing.         |
| 41  | Record demo walkthrough video.            | Presentation-ready video.  | Peer review session.   |
| 42  | Write comprehensive documentation.        | README, API usage guide.  | Code review.           |
| 43  | Final debugging and fixes.                | Fully functional app.     | System-wide checks.    |

---

## 🎨 Design Philosophy  

**🎨 Colors:**  
- **Background** → `#1a1a1a`  
- **Accent Colors** → `#FF7E33` & `#FACC15`  

**✍️ Typography:**  
- **Inter** → Body text  
- **Poppins** → Headings  

**📏 Spacing:**  
- **16px base grid**, four-column layout  

**🖥️ Animations:**  
- Sidebar slide-in  
- Card hover zoom effects  
- Smooth form transitions  

---

## 🚀 Installation Guide  

### 1️⃣ Clone the repository  

```bash
git clone https://github.com/kalviumcommunity/S86_Bhavdeep_Capstone_BeaconPort.git
```

### 2️⃣ Install dependencies  

```bash
# Frontend setup
cd client
npm install

# Backend setup
cd ../server
npm install
```

### 3️⃣ Set up environment variables  
Create a `.env` file in both the **client** and **server** directories using `.env.example` as a reference.

### 4️⃣ Run the application locally  

```bash
# Backend server
cd server
node server.js

# Frontend server
cd ../client
npm run dev
```

---

## 👤 Roles & Access Flow  

| Role    | Access Privileges                        |
|---------|------------------------------------------|
| **Admin**   | Create schools & manage teachers.  |
| **Teacher** | Join schools, create classes, and manage students. |
| **Student** | Join classes, view grades, and access notices. |

---

## 📚 Resources  

- [Figma Design](https://www.figma.com/proto/b3bGHzl2NJMcO5B6rD0Aaf/Capstone-2?node-id=0-1)  
- [MongoDB Atlas Setup Guide](https://www.mongodb.com/docs/atlas/getting-started/)  
- [Vercel Deployment Documentation](https://vercel.com/docs)  
- [JWT Authentication Guide](https://jwt.io/introduction)  

