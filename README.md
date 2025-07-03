# Bad Words Test

A Next.js application that demonstrates and compares bad word filtering using two popular libraries: `bad-words` and `obscenity`. This project provides a real-time interface to test how different filtering approaches handle various types of content.

## Features

### 🛡️ **Dual Library Filtering**
- **bad-words library**: Fast, comprehensive English profanity filter
- **obscenity library**: Advanced pattern matching with configurable strategies
- **Combined filtering**: Sequential application of both libraries for maximum coverage

### 📊 **Real-time Comparison**
- Side-by-side results from both libraries
- Detected words highlighting
- Clean vs. filtered text display
- Combined filtering results

### 🎯 **User-friendly Interface**
- Real-time text processing with debouncing
- Sample texts for quick testing
- Clean, modern UI with Tailwind CSS
- Responsive design for all devices

## Libraries Used

### 1. **bad-words**
- Comprehensive English profanity filter
- Fast detection and cleaning
- Extensive built-in word list
- Simple API: `isProfane()` and `clean()`

### 2. **obscenity**
- Advanced pattern matching with regex
- Configurable filtering strategies
- Support for multiple languages
- Custom word lists and transformers
- More sophisticated detection algorithms

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bad-words-test
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Text Input
- Enter any text in the textarea to see real-time filtering
- Use the sample text buttons for quick testing
- Processing happens automatically with a 500ms debounce

### Results Display
The application shows three panels:

1. **Obscenity Library Results**
   - Original and filtered text
   - Detected inappropriate words
   - Clean/dirty status indicator

2. **Bad-Words Library Results**
   - Original and filtered text
   - Detected profane words
   - Clean/dirty status indicator

3. **Combined Results**
   - Results from applying both libraries sequentially
   - Comprehensive word detection
   - Final filtered output

### Sample Texts
The application includes several sample texts to test different scenarios:
- Clean, appropriate content
- Mild profanity
- Various expressions and edge cases

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
└── components/
    └── BadWordFilter.tsx   # Main filtering component with dual library support
```

## How It Works

### Filtering Process
1. **Text Input**: User enters text in the textarea
2. **Debounced Processing**: Text is processed after 500ms of inactivity
3. **Parallel Processing**: Both libraries process the text simultaneously
4. **Combined Filtering**: Results are combined for maximum coverage
5. **Display Results**: All results are displayed in real-time

### Library Comparison
- **bad-words**: Uses a predefined list of profane words
- **obscenity**: Uses advanced pattern matching and transformers
- **Combined**: Applies bad-words first, then obscenity to catch any remaining issues

## Customization

### Adding Custom Words
To add custom words to the bad-words filter:

```typescript
const filter = new Filter();
filter.addWords('custom', 'words', 'here');
```

### Modifying Obscenity Configuration
You can customize the obscenity matcher:

```typescript
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
  // Add custom configuration here
});
```

### Styling
The application uses Tailwind CSS. Customize the appearance by modifying CSS classes in the components.

## Performance Features

- **Debounced Input**: 500ms delay prevents excessive processing
- **Efficient State Management**: React hooks for optimal performance
- **Memory Management**: Proper cleanup of timeouts and state
- **Real-time Updates**: Immediate feedback without blocking the UI

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile responsive design
- Progressive Web App ready

## Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Adding New Libraries
To add another filtering library:

1. Install the library: `npm install new-filter-library`
2. Import and initialize in `BadWordFilter.tsx`
3. Add processing logic in the `processText` function
4. Create a new result panel in the UI

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly with various text inputs
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [bad-words](https://github.com/MauriceButler/badwords) - Profanity filter library
- [obscenity](https://github.com/obscenity/obscenity) - Advanced content filtering
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
