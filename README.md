# BoloGrocery 🛒 - اپنی گروسری بولیں

A voice-enabled Urdu grocery list maker built with React. Speak your grocery items in Urdu and create downloadable lists!

## Features ✨

- 🎤 **Voice Recognition**: Speak grocery items in Urdu using Web Speech API
- 📝 **Manual Input**: Type items manually as a backup
- 📄 **PDF Export**: Download your list as a PDF with jsPDF
- 🖼️ **PNG Export**: Save your list as an image with html-to-image
- 🗑️ **List Management**: Remove individual items or clear all
- 🎨 **Beautiful UI**: Modern design with TailwindCSS and Urdu font support
- 📱 **Responsive**: Works on desktop and mobile devices

## Getting Started 🚀

### Prerequisites

- Node.js (version 16 or higher)
- A modern browser (Chrome recommended for best voice recognition support)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

### Usage

1. **Voice Input:**
   - Click "🎤 Speak Item" button
   - Allow microphone access when prompted
   - Speak your grocery item in Urdu
   - The item will be added to your list automatically

2. **Manual Input:**
   - Type in the input field (supports both Urdu and English)
   - Press Enter or click the "+" button to add

3. **Export Options:**
   - **PDF**: Click "⬇️ Download PDF" to get a formatted PDF
   - **PNG**: Click "⬇️ Download PNG" to save as an image

4. **List Management:**
   - Click "❌" next to any item to remove it
   - Click "🗑 Clear All" to reset the entire list

## Browser Compatibility 🌐

- **Best Experience**: Chrome, Edge (full voice recognition support)
- **Limited Support**: Firefox, Safari (manual input available)
- **Mobile**: Works on mobile browsers with microphone access

## Technical Features 🔧

- **React 18** with hooks and modern patterns
- **TailwindCSS** for responsive styling
- **Web Speech API** for Urdu voice recognition (`ur-PK`)
- **jsPDF** for PDF generation with Urdu text support
- **html-to-image** for PNG export functionality
- **Lucide React** for beautiful icons
- **Noto Sans Urdu** font for proper Urdu text rendering

## Project Structure 📁

```
BoloGrocery/
├── public/
│   └── index.html          # Main HTML template
├── src/
│   ├── components/
│   │   └── GroceryList.js  # Main component
│   ├── App.js              # App wrapper
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── package.json            # Dependencies
├── tailwind.config.js      # TailwindCSS config
└── postcss.config.js       # PostCSS config
```

## Troubleshooting 🔧

### Voice Recognition Issues
- **Microphone not working**: Check browser permissions
- **No speech detected**: Ensure stable internet connection
- **Browser compatibility**: Use Chrome or Edge for best results

### Font Issues
- Urdu text not displaying properly: Font will load from Google Fonts automatically

### PDF/PNG Export Issues
- Large lists: May take a moment to generate
- Mobile devices: Downloads will go to your downloads folder

## Contributing 🤝

Feel free to submit issues and pull requests to improve BoloGrocery!

## License 📄

This project is open source and available under the MIT License.

---

**Made with ❤️ for the Urdu-speaking community**
