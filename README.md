# Subscription Tracker

## Overview
The Subscription Tracker is a single-page web application designed to help users manage their subscriptions efficiently. Users can add, remove, and view their subscriptions in a user-friendly interface. The app now serves the frontend through a small Node server and persists subscriptions in a lightweight embedded database file.

## Project Structure
```
subscription-tracker
├── data                     # Embedded database files created at runtime (gitignored)
├── server.js                # Express server and database API
├── src
│   ├── index.html          # Main HTML document for the application
│   ├── styles
│   │   └── main.css        # Styles for the application
│   ├── scripts
│   │   ├── app.js         # Main JavaScript file for application logic
│   │   ├── subscription.js # Logic related to subscription management
│   │   └── utils.js       # Utility functions used throughout the application
│   └── assets
│       └── icons          # Directory for icon assets
├── package.json            # Configuration file for npm
└── README.md               # Documentation for the project
```

## Features
- Add new subscriptions
- Edit existing subscriptions
- Remove existing subscriptions
- View a list of all subscriptions
- User-friendly interface with intuitive navigation

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine.

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd subscription-tracker
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Running the Application

#### Option 1: Using a Local Server (Recommended)
```bash
npm start
```
This starts the local Node server, serves the frontend, and creates the local database file at `data/subscriptions.nedb` the first time you save data.

#### Option 2: Direct File Access
Direct file access is no longer recommended because the app now uses a local API for database persistence. Use `npm start` instead.

If you still want to open the HTML directly for layout work only, use:
```bash
# Windows
start src/index.html

# macOS
open src/index.html

# Linux
xdg-open src/index.html
```

The application will be available at `http://localhost:3000` by default.

## Usage
Once the application is running, you can:
- Add subscriptions by entering the details in the provided form.
- Remove subscriptions by selecting them from the list.
- View all your subscriptions in a clear and organized manner.

If you already had subscriptions stored in browser `localStorage`, the app will migrate them into the embedded database the first time it loads against the new server.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.

## License
This project is licensed under the MIT License. See the LICENSE file for details.