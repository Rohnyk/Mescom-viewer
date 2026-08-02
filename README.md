# ⚡ MESCOM Electricity Bill Dashboard & Tracker

A modern, responsive web application for managing, tracking, and live-fetching **MESCOM** (Mangalore Electricity Supply Company Limited) electricity bills across multiple accounts and properties.

---

## 🌟 Key Features

- **⚡ Live Bill Fetching & Automation**: Automatically fetches live bill data directly from the MESCOM portal using headless browser integration (Puppeteer).
- **🏠 Property Profile Management**: Group multiple accounts under custom property profiles (e.g., *My Home*, *Rental Properties*, *Family*, *Commercial*).
- **📝 Notion Database Integration**: Auto-lookup consumer/tenant names from your Notion Database by Room Number (with fallback to existing name).
- **📊 Consumption & Financial Analytics**: Visual charts for monthly power consumption (kWh) and bill amount trends.
- **🏷️ Status Filtering & Badges**: One-click filtering by bill status (**All**, **Paid**, **Unpaid**, **Overdue**).
- **🔒 Custom Consumer Name Protection**: User-customized consumer names and room numbers are preserved across live refetches.
- **✅ Zero/Negative Bill Handling**: Automatically categorizes zero or negative balances as **Paid**.
- **🐳 Docker & Docker Compose Ready**: Easily containerized with persistent volume support for bill databases.

---

## 📝 Notion Database Integration Setup (Optional)

You can automatically sync tenant consumer names from a **Notion Database** using Room Numbers! If a room is not found in Notion, your existing consumer name is safely persisted.

### Setup Instructions:
1. Create an Integration in [Notion Developers Portal](https://www.notion.so/my-integrations) and copy the **Internal Integration Secret**.
2. Share your Notion Database with the integration.
3. Add the environment variables to your `docker-compose.yml`:

```yaml
    environment:
      - NOTION_API_KEY=secret_your_notion_integration_token
      - NOTION_DATABASE_ID=your_notion_database_id
      - NOTION_ROOM_FIELD=Room No        # Optional (default: Room No)
      - NOTION_NAME_FIELD=Consumer Name   # Optional (default: Consumer Name)
```

In the dashboard, click **"📝 Sync Notion"** next to the Room No. input in the Edit Account modal to perform an instant lookup!

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Scraper / Automation**: Puppeteer (Headless Chromium)
- **Frontend**: HTML5, Vanilla CSS3 (Custom Dark Mode UI), JavaScript (ES6+)
- **Database**: Local JSON & Excel (`/app/data/bills.json`, `bills.xlsx`)
- **Containerization**: Docker, Docker Compose

---

## 🚀 Quick Start

### Option 1: Running Locally with Node.js

#### 1. Prerequisites
- Node.js 18+ installed

#### 2. Installation & Run
```bash
# Clone the repository
git clone https://github.com/Rohnyk/Mescom-viewer.git
cd Mescom-viewer

# Install dependencies
npm install

# Start the server
npm start
```

Open your browser and navigate to: **`http://localhost:35000`**

---

### Option 2: Running with Docker Compose (Recommended)

#### 1. Prerequisites
- Docker & Docker Compose installed

#### 2. Deploy Container
```bash
# Build and run in detached mode
docker compose up -d --build
```

#### 3. View Logs / Stop Container
```bash
# View live logs
docker compose logs -f

# Stop container
docker compose down
```

Open your browser and navigate to: **`http://localhost:35000`**

---

## 📁 Project Structure

```
├── app.js               # Frontend application logic & UI bindings
├── server.js            # Express API server & Puppeteer scraping endpoints
├── index.html           # Main dashboard web page
├── style.css            # Dark mode design system & styling
├── Dockerfile           # Node + Chromium container configuration
├── docker-compose.yml   # Docker compose service definition
├── package.json         # Node.js dependencies
└── data/                # Persistent JSON/XLSX bill storage
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
