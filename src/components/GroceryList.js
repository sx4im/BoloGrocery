import React, { useState, useEffect, useRef } from "react";
import { Mic, Trash2, X, FileText, Image as ImageIcon, Plus, AlertCircle, Square } from "lucide-react";
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

export default function GroceryList() {
  const [items, setItems] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const listRef = useRef(null);

  // English to Urdu transliteration mapping
  const transliterationMap = {
    // Common words
    'kia': 'کیا', 'kya': 'کیا', 'what': 'کیا',
    'hal': 'حال', 'haal': 'حال',
    'hai': 'ہے', 'he': 'ہے', 'hain': 'ہیں',
    'aap': 'آپ', 'ap': 'آپ', 'you': 'آپ',
    'main': 'میں', 'mein': 'میں', 'me': 'میں', 'i': 'میں',
    'hum': 'ہم', 'ham': 'ہم', 'we': 'ہم',
    'yeh': 'یہ', 'ye': 'یہ', 'this': 'یہ',
    'woh': 'وہ', 'wo': 'وہ', 'that': 'وہ',
    'kahan': 'کہاں', 'kaha': 'کہاں', 'where': 'کہاں',
    'kab': 'کب', 'when': 'کب',
    'kyun': 'کیوں', 'kyon': 'کیوں', 'why': 'کیوں',
    'kaise': 'کیسے', 'kese': 'کیسے', 'how': 'کیسے',
    'kitna': 'کتنا', 'kitni': 'کتنی', 'how much': 'کتنا',
    'acha': 'اچھا', 'accha': 'اچھا', 'good': 'اچھا',
    'bura': 'برا', 'bad': 'برا',
    'theek': 'ٹھیک', 'thik': 'ٹھیک', 'ok': 'ٹھیک',
    'shukriya': 'شکریہ', 'thanks': 'شکریہ', 'thank you': 'شکریہ',
    'maaf': 'معاف', 'sorry': 'معاف',
    'namaste': 'نمسکار', 'salam': 'سلام', 'hello': 'سلام',
    
    // Food items
    'chawal': 'چاول', 'rice': 'چاول',
    'roti': 'روٹی', 'bread': 'روٹی',
    'daal': 'دال', 'dal': 'دال', 'lentils': 'دال',
    'sabzi': 'سبزی', 'vegetables': 'سبزی',
    'gosht': 'گوشت', 'meat': 'گوشت',
    'murgh': 'مرغ', 'chicken': 'مرغ',
    'machli': 'مچھلی', 'fish': 'مچھلی',
    'doodh': 'دودھ', 'milk': 'دودھ',
    'pani': 'پانی', 'water': 'پانی',
    'chai': 'چائے', 'tea': 'چائے',
    'coffee': 'کافی', 'qahwa': 'قہوہ',
    'aam': 'آم', 'mango': 'آم',
    'kela': 'کیلا', 'banana': 'کیلا',
    'seb': 'سیب', 'apple': 'سیب',
    'angoor': 'انگور', 'grapes': 'انگور',
    'alu': 'آلو', 'aloo': 'آلو', 'potato': 'آلو',
    'pyaz': 'پیاز', 'onion': 'پیاز',
    'tamatar': 'ٹماٹر', 'tomato': 'ٹماٹر',
    'namak': 'نمک', 'salt': 'نمک',
    'cheeni': 'چینی', 'sugar': 'چینی',
    'tel': 'تیل', 'oil': 'تیل',
    'ghee': 'گھی', 'butter': 'گھی',
    
    // Numbers
    'ek': '۱', 'aik': '۱', 'one': '۱',
    'do': '۲', 'two': '۲',
    'teen': '۳', 'tin': '۳', 'three': '۳',
    'char': '۴', 'chaar': '۴', 'four': '۴',
    'panch': '۵', 'paanch': '۵', 'five': '۵',
    
    // Common grocery items
    'eggs': 'انڈے', 'ande': 'انڈے',
    'biscuit': 'بسکٹ', 'biscuits': 'بسکٹ',
    'soap': 'صابن', 'sabun': 'صابن',
    'shampoo': 'شیمپو',
    'toothpaste': 'ٹوتھ پیسٹ',
    'flour': 'آٹا', 'atta': 'آٹا',
    'yogurt': 'دہی', 'dahi': 'دہی',
    'cheese': 'پنیر', 'paneer': 'پنیر',
  };

  // Function to transliterate English to Urdu
  const transliterateToUrdu = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    let transliterated = text.toLowerCase();
    
    // Replace whole words first (longer phrases first)
    const sortedKeys = Object.keys(transliterationMap).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(englishWord => {
      const urduWord = transliterationMap[englishWord];
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${englishWord}\\b`, 'gi');
      transliterated = transliterated.replace(regex, urduWord);
    });
    
    return transliterated;
  };

  useEffect(() => {
    // Check if Speech Recognition is supported
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(false);
      setError("Voice input not supported in this browser. Please use Chrome, Edge, or Safari for voice recognition, or use manual input.");
      return;
    }

    try {
      // Initialize Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      // Configure recognition settings
      recognitionInstance.lang = 'ur-PK'; // Urdu (Pakistan)
      recognitionInstance.continuous = true; // Allow continuous listening
      recognitionInstance.interimResults = true; // Show interim results
      recognitionInstance.maxAlternatives = 3; // Get multiple alternatives

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setStatusText("سن رہا ہوں... بولیے!");
      setCurrentTranscript("");
      setError("");
    };

    recognitionInstance.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update current transcript for display
      setCurrentTranscript(interimTranscript || finalTranscript);

      // If we have a final result, add it as an item
      if (finalTranscript.trim()) {
        let processedText = finalTranscript.trim();
        
        // If using English (fallback), transliterate to Urdu
        if (recognitionInstance.lang === 'en-US') {
          processedText = transliterateToUrdu(processedText);
        }
        
        setItems(prev => [...prev, { id: Date.now(), text: processedText }]);
        setCurrentTranscript(""); // Clear after adding
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatusText("");
      setCurrentTranscript("");
      
      let errorMessage = "";
      switch(event.error) {
        case 'network':
          errorMessage = "Network connection issue. Please check your internet connection and try again. You can also use manual input below.";
          break;
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please click the microphone icon in your browser's address bar and allow access, then try again.";
          break;
        case 'no-speech':
          errorMessage = "No speech detected. Please speak clearly into your microphone and try again.";
          break;
        case 'aborted':
          errorMessage = "Speech recognition was interrupted. Please try again.";
          break;
        case 'audio-capture':
          errorMessage = "No microphone detected. Please connect a microphone and refresh the page.";
          break;
        case 'service-not-allowed':
          errorMessage = "Speech recognition service not available. Please use manual input instead.";
          break;
        case 'language-not-supported':
          errorMessage = "Urdu language not supported by your browser. Trying English fallback...";
          // Try switching to English as fallback
          setTimeout(() => {
            if (recognitionInstance) {
              recognitionInstance.lang = 'en-US';
              setError("Switched to English. Please speak in English and it will be transliterated to Urdu.");
              setTimeout(() => setError(""), 5000);
            }
          }, 1000);
          break;
        default:
          errorMessage = `Speech recognition error (${event.error}). Please use manual input or try refreshing the page.`;
      }
      
      if (event.error !== 'language-not-supported') {
        setError(errorMessage);
        setTimeout(() => setError(""), 10000);
      }
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      setStatusText("");
      setCurrentTranscript("");
    };

      setRecognition(recognitionInstance);
    } catch (err) {
      console.error('Speech recognition initialization error:', err);
      setSpeechSupported(false);
      setError("Failed to initialize voice recognition. Please use manual input or refresh the page.");
    }
  }, []);

  const startListening = () => {
    if (!recognition || isListening || !speechSupported) return;
    
    // Clear any previous errors
    setError("");
    
    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      let errorMessage = "Speech recognition failed to start.";
      
      if (err.name === 'InvalidStateError') {
        errorMessage = "Speech recognition is already running. Please wait and try again.";
      } else if (err.name === 'NotAllowedError') {
        errorMessage = "Microphone access denied. Please allow microphone access and try again.";
      }
      
      setError(errorMessage + " You can use manual input as an alternative.");
      setTimeout(() => setError(""), 8000);
    }
  };

  const stopListening = () => {
    if (!recognition || !isListening) return;
    
    try {
      recognition.stop();
    } catch (err) {
      console.error('Recognition stop error:', err);
      setIsListening(false);
      setStatusText("");
      setCurrentTranscript("");
    }
  };

  const addManualItem = () => {
    if (manualInput.trim()) {
      const transliteratedText = transliterateToUrdu(manualInput.trim());
      setItems(prev => [...prev, { id: Date.now(), text: transliteratedText }]);
      setManualInput("");
    }
  };

  const handleManualKeyPress = (e) => {
    if (e.key === 'Enter') {
      addManualItem();
    }
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  const downloadPDF = () => {
    const pdf = new jsPDF();
    
    // Add Urdu font support (fallback to default if not available)
    pdf.setFont("helvetica");
    pdf.setFontSize(20);
    
    // Add title
    pdf.text("میری گروسری لسٹ", 105, 30, { align: 'center' });
    pdf.text("My Grocery List", 105, 45, { align: 'center' });
    
    // Add items
    pdf.setFontSize(14);
    let yPosition = 70;
    
    items.forEach((item, index) => {
      if (yPosition > 270) { // Add new page if needed
        pdf.addPage();
        yPosition = 30;
      }
      
      const itemText = `${index + 1}. ${item.text}`;
      pdf.text(itemText, 20, yPosition);
      yPosition += 15;
    });
    
    // Add timestamp
    pdf.setFontSize(10);
    const now = new Date();
    pdf.text(`Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 20, yPosition + 10);
    
    pdf.save('grocery-list.pdf');
  };

  const downloadPNG = async () => {
    if (!listRef.current) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(listRef.current, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      const link = document.createElement('a');
      link.download = 'grocery-list.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
      setError("Failed to generate PNG. Please try again.");
      setTimeout(() => setError(""), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD700] p-4 md:p-8 print:bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div 
          className="bg-[#FF1493] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 mb-6 transform rotate-[-0.5deg] print:hidden"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white text-center leading-tight">
            BoloGrocery
          </h1>
          <p className="text-2xl text-white text-center mt-2 font-bold">
            اپنی گروسری بولیں
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert mb-4 bg-red-500 border-4 border-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none print:hidden">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="font-bold">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Status Text */}
        {statusText && (
          <div className="bg-[#00FF00] border-4 border-black p-4 mb-4 transform rotate-[0.5deg] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] print:hidden">
            <p className="text-2xl font-black text-center">{statusText}</p>
          </div>
        )}

        {/* Current Transcript Display */}
        {currentTranscript && (
          <div className="bg-[#FFE4B5] border-4 border-black p-4 mb-4 transform rotate-[-0.2deg] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] print:hidden">
            <p className="text-lg font-bold text-center text-gray-700">
              سن رہا ہوں: "{currentTranscript}"
            </p>
          </div>
        )}

        {/* Manual Input Section */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 mb-4 transform rotate-[0.2deg] print:hidden">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyPress={handleManualKeyPress}
              placeholder="یا یہاں ٹائپ کریں... / Or type here..."
              className="input flex-1 h-14 border-4 border-black rounded-none text-lg font-bold text-right focus:ring-0 focus:ring-offset-0"
              dir="rtl"
            />
            <button
              onClick={addManualItem}
              disabled={!manualInput.trim()}
              className="h-14 bg-[#00FF00] hover:bg-[#00CC00] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-black rounded-none transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:bg-gray-300 inline-flex items-center justify-center px-4 py-2"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 print:hidden">
          {!isListening ? (
            <button
              onClick={startListening}
              disabled={!speechSupported}
              className={`h-16 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg rounded-none transform transition-all inline-flex items-center justify-center px-4 py-2 ${
                !speechSupported 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                  : 'bg-[#0080FF] hover:bg-[#0060CC] text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <Mic className="w-6 h-6 mr-2" />
              Start Voice
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="h-16 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg bg-red-500 hover:bg-red-600 text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all inline-flex items-center justify-center px-4 py-2"
            >
              <Square className="w-6 h-6 mr-2" />
              Stop Voice
            </button>
          )}

          <button
            onClick={downloadPDF}
            className="h-16 bg-[#FF1493] hover:bg-[#CC0066] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all inline-flex items-center justify-center px-4 py-2"
          >
            <FileText className="w-6 h-6 mr-2" />
            Print PDF
          </button>

          <button
            onClick={downloadPNG}
            className="h-16 bg-[#00FF00] hover:bg-[#00CC00] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-black rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all inline-flex items-center justify-center px-4 py-2"
          >
            <ImageIcon className="w-6 h-6 mr-2" />
            Print PNG
          </button>

          <button
            onClick={clearAll}
            className="h-16 bg-red-500 hover:bg-red-600 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all inline-flex items-center justify-center px-4 py-2"
          >
            <Trash2 className="w-6 h-6 mr-2" />
            Clear All
          </button>
        </div>

        {/* Grocery List Card */}
        <div 
          ref={listRef}
          className="card bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-none p-6 md:p-8 transform rotate-[0.3deg]"
        >
          <h2 className="text-3xl font-black mb-6 pb-4 border-b-4 border-black text-right">
            میری گروسری لسٹ
          </h2>

          {items.length === 0 ? (
            <div className="text-center py-12 print:hidden">
              <p className="text-2xl font-bold text-gray-400">
                ابھی تک کوئی آئٹم نہیں ہے
              </p>
              <p className="text-xl font-bold text-gray-400 mt-2">
                Press "Speak Item" or type to add items
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between bg-[#FFD700] border-4 border-black p-4 transform hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:shadow-none"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl font-black bg-black text-white px-3 py-1 border-2 border-black">
                      {index + 1}
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-right flex-1">
                      {item.text}
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="bg-red-500 hover:bg-red-600 border-4 border-black text-white p-2 h-auto rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all print:hidden inline-flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Print Instructions */}
        <div className="mt-6 bg-[#0080FF] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-[-0.3deg] print:hidden">
          <p className="text-white font-bold text-center text-sm md:text-base">
            💡 Tip: Voice input requires internet & microphone access. Use manual input as backup!
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}