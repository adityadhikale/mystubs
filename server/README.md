# 🎟️ MyStubs

> Your personal movie & TV archive — one ticket stub at a time.

MyStubs is a personal movie and TV tracking app built to replace a messy Google Keep logging habit. Every title you watch gets its own ticket stub: poster, ratings, notes, rewatch count, and where you watched it — all archived in a searchable, filterable collection styled like a cinema box office.

No ads, no social feed, no algorithm. Just your own private, personal archive.

---

## ✨ Features

### 📚 Archive
- Live stats strip — total titles, movies vs. series, watchlist, completed
- Multi-field search (title, cast, director, genre)
- Filter by status, type, and genre + sort by rating, year, or recency
- Responsive ticket-stub card grid with poster hover-zoom
- **Bulk operations** — select multiple titles to change status, export, or delete in one go

### ➕ Add
- Dual-source search across **OMDb** and **TMDB** simultaneously
- Trending suggestions on load (TMDB-powered, cached)
- Full detail preview before adding — genre, cast, plot, release date, and **suggested streaming platform** (India region, TMDB watch-provider data)
- Duplicate detection — warns you if a title's already in your archive, with the option to add anyway

### 🎬 Title Detail
- Full metadata view with release date + upcoming-title badge
- Editable notes: status, personal rating, rewatch count, date watched, and platform watched on
- Watched-on dropdown auto-suggests from the platform detected at add-time, but stays fully editable
- Custom marquee-bulb-chase loading animation

### 📥 Bulk Import
- Paste a raw list of titles (however messy — numbered, extra spaces, whatever)
- Automatic search + smart auto-matching using string-similarity scoring, with TMDB preferred as tiebreaker
- Swap picker to fix any wrong auto-match, for any row
- Manual entry form for titles neither API can find
- Duplicate detection before confirming
- One-click confirm & import, with progress + summary

### 👤 Profile
- Live connection status for OMDb, TMDB, and Google Sheets
- Archive stats summary (total, average rating, top genre, top platform)
- Export your entire archive as **CSV or JSON** — a personal backup independent of Google Sheets

### 🎨 Design — "Cinematic Archive"
- Marquee Gold accent, Bebas Neue + Hanken Grotesk typography
- Sharp corners everywhere, with ticket-stub notch cutouts and dashed perforation lines
- Flat tonal layering — no shadows, no glows
- Full light/dark theme support, remembered across visits

---

## 🛠️ Tech Stack

**Frontend**
- React + Vite (JavaScript)
- React Compiler
- oxlint + Prettier

**Backend**
- Node.js + Express
- Google Sheets as the database, via a Google Service Account
- OMDb + TMDB as dual data sources

---

## 🗄️ Data

Everything lives in a Google Sheet acting as the database — no traditional database server needed. Each row is one title, with columns for both the metadata pulled from OMDb/TMDB and your own personal fields (status, rating, notes, rewatch count, platform watched on).

---

## 🙏 Attribution

Movie & TV data provided by [OMDb API](https://www.omdbapi.com/) and [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.

---

*One ticket at a time.* 🎞️