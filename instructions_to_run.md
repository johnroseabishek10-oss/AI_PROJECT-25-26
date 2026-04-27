# How to Run Locally

Follow these detailed instructions to set up and run this project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher recommended)
- **npm** (comes with Node.js) or **yarn** or **pnpm**
- **Git**

## Step-by-Step Setup

### 1. Clone the Repository

First, clone the repository to your local machine:
```bash
git clone https://github.com/ramanathan2007trt-byte/AI-PROJECT-25_26.git
```

### 2. Navigate to the Project Directory

Open your terminal or command prompt and go into the project folder:
```bash
cd AI-PROJECT-25_26
```

### 3. Install Dependencies

Install all the required packages by running:
```bash
npm install
```

### 4. Setup Environment Variables

The project uses environment variables (e.g., for Firebase). You need to set them up before running the project:
1. Locate the `.env.example` file in the root directory.
2. Create a new file named `.env` in the same directory.
3. Copy the contents of `.env.example` into `.env`.
4. Fill in the required actual values (like your Firebase configuration keys, API keys, etc.) in the `.env` file.

### 5. Start the Development Server

Once everything is installed and configured, you can start the local development server:
```bash
npm run dev
```
By default, the Vite server will start on port `3000`. You can access the application by opening your web browser and navigating to:
```
http://localhost:3000
```

---

## Building for Production

If you need to build the project for production, run:
```bash
npm run build
```
This will create a `dist` folder containing the optimized production files.

## Mobile Application (Capacitor)

This project is configured with Capacitor to be run as an iOS/Android application as well.
After running `npm run build`, you can sync your web code to native projects with:
```bash
npm run cap:sync
```
You can then open the native IDEs using:
- **Android Studio**: `npm run cap:open:android`
- **Xcode (macOS only)**: `npm run cap:open:ios`
