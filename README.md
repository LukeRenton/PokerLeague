# 🎰 Poker League Standings

A simple, static web app for tracking monthly poker league standings. Runs entirely on GitHub Pages with no backend required!

![Poker League](https://img.shields.io/badge/Poker-League-gold?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue?style=for-the-badge)
![No Backend](https://img.shields.io/badge/No-Backend-green?style=for-the-badge)

## ✨ Features

- 🏆 **Live Leaderboard** - Automatically calculated standings sorted by points
- 👤 **Player Profiles** - Click any player to see detailed stats
- 📅 **Event History** - View all past poker nights and results
- 📊 **Player Stats** - Average finish, wins, best finish, win streaks
- 📱 **Mobile Friendly** - Works great on phones and tablets
- 🌙 **Dark Casino Theme** - Beautiful poker-inspired design
- ⚡ **No Backend** - All data stored in simple JSON files

## 📁 Project Structure

```
poker-league/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── app.js              # JavaScript logic
├── README.md           # This file
├── data/
│   ├── players.json    # Player definitions
│   └── events.json     # Poker night results
└── images/
    └── avatars/        # Player profile images
        └── default-avatar.svg
```

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)

1. Fork or clone this repository
2. Go to repository **Settings** → **Pages**
3. Under "Source", select **main** branch and **/ (root)** folder
4. Click **Save**
5. Your site will be live at `https://yourusername.github.io/poker-league/`

### Option 2: Local Development

1. Clone the repository
2. Open the folder in VS Code
3. Use the **Live Server** extension or any local server
4. Open `http://localhost:5500` in your browser

> ⚠️ **Note:** Opening `index.html` directly in the browser won't work due to CORS restrictions when loading JSON files. You need a local server.

## 📝 How to Update the League

### Adding a New Player

1. Open `data/players.json`
2. Add a new player object to the `players` array:

```json
{
  "id": "player7",
  "name": "New Player Name",
  "image": "images/avatars/default-avatar.svg",
  "joinedDate": "2025-03-01"
}
```

**Fields explained:**
- `id`: Unique identifier (use format `player1`, `player2`, etc.)
- `name`: Display name (nicknames welcome!)
- `image`: Path to avatar image or URL
- `joinedDate`: When they joined the league (YYYY-MM-DD)

3. Commit and push your changes
4. The app will automatically include them in future events!

### Adding a New Poker Night

1. Open `data/events.json`
2. Add a new event to the `events` array:

```json
{
  "id": "event5",
  "date": "2025-03-12",
  "name": "March Poker Night #1",
  "results": [
    { "playerId": "player2", "position": 1 },
    { "playerId": "player1", "position": 2 },
    { "playerId": "player5", "position": 3 },
    { "playerId": "player3", "position": 4 },
    { "playerId": "player4", "position": 5 },
    { "playerId": "player6", "position": 6 }
  ]
}
```

**Fields explained:**
- `id`: Unique identifier for the event
- `date`: Date of the poker night (YYYY-MM-DD)
- `name`: Display name for the event
- `results`: Array of player results, ordered by position
  - `playerId`: Must match a player's `id` from `players.json`
  - `position`: Finishing position (1 = winner)

3. Commit and push your changes
4. The leaderboard will automatically recalculate!

### Changing the Points System

Edit the `pointsSystem` section in `data/events.json`:

```json
"pointsSystem": {
  "description": "Points awarded based on finishing position",
  "positions": {
    "1": 10,
    "2": 7,
    "3": 5,
    "4": 3,
    "5": 2,
    "6": 1,
    "7": 1,
    "8": 1
  }
}
```

Add or modify positions as needed. Points will recalculate automatically.

### Adding Custom Player Images

1. Add the image file to `images/avatars/` folder
2. Update the player's `image` field in `players.json`:

```json
{
  "id": "player1",
  "name": "Mike Johnson",
  "image": "images/avatars/mike.jpg",
  "joinedDate": "2025-01-01"
}
```

**Supported formats:** JPG, PNG, SVG, WebP

**Recommended size:** 200x200 pixels (will be displayed as circles)

You can also use external URLs:
```json
"image": "https://example.com/avatar.jpg"
```

## 🎨 Customization

### Changing the League Name

Edit the header in `index.html`:

```html
<div class="logo-text">
  <h1>Your League Name</h1>
  <span>2025 Season</span>
</div>
```

### Changing Colors

Edit the CSS variables at the top of `styles.css`:

```css
:root {
  --bg-primary: #0f0f1a;
  --accent-gold: #ffd700;
  --accent-purple: #8b5cf6;
  /* ... other colors */
}
```

### Editing Rules

Modify the Rules section in `index.html` to match your league's specific rules.

## 🔧 Technical Details

- **Pure HTML/CSS/JS** - No build tools required
- **Fetch API** - Loads JSON data asynchronously
- **CSS Grid & Flexbox** - Responsive layout
- **CSS Variables** - Easy theming
- **ES6+ JavaScript** - Modern, clean code

## 📊 Player Statistics Explained

| Stat | Description |
|------|-------------|
| Total Points | Sum of all points earned |
| Games Played | Number of poker nights attended |
| Avg Position | Average finishing position |
| Wins | Number of 1st place finishes |
| Best Finish | Highest position achieved |
| Win Streak | Consecutive wins (current) |

## 🤝 Contributing

Feel free to fork and customize for your own league! Pull requests welcome for improvements.

## 📜 License

MIT License - Use this however you'd like!

---

**Built with ♠️ ♥️ ♣️ ♦️ for poker lovers everywhere**
