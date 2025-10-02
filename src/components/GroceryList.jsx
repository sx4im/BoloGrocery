import React, { useState, useEffect, useRef } from "react";
import { Mic, Trash2, X, FileText, Image as ImageIcon, Plus, AlertCircle } from "lucide-react";
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
  const listRef = useRef(null);

  useEffect(() => {
    // Check if Speech Recognition is supported
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(false);
      setError("Voice input not supported in this browser. Please use manual input or try Chrome/Edge.");
      return;
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = 'ur-PK';
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    recognitionInstance.maxAlternatives = 1;

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setStatusText("بولیے...");
      setError("");
    };

    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setItems(prev => [...prev, { id: Date.now(), text: transcript.trim() }]);
      }
      setIsListening(false);
      setStatusText("");
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatusText("");
      
      let errorMessage = "";
      switch(event.error) {
        case 'network':
          errorMessage = "Network error. Please check your internet connection and try again. Voice recognition requires internet access.";
          break;
        case 'not-allowed':
          errorMessage = "Microphone access denied. Please allow microphone permissions in your browser settings.";
          break;
        case 'no-speech':
          errorMessage = "No speech detected. Please try again and speak clearly.";
          break;
        case 'aborted':
          errorMessage = "Speech recognition aborted. Please try again.";
          break;
        case 'audio-capture':
          errorMessage = "No microphone found. Please connect a microphone and try again.";
          break;
        default:
          errorMessage = `Error: ${event.error}. Try manual input instead.`;
      }
      setError(errorMessage);
      setTimeout(() => setError(""), 8000);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      setStatusText("");
    };

    setRecognition(recognitionInstance);
  }, []);

  const startListening = async () => {
    if (!recognition || isListening) return;
    
    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.start();
    } catch (err) {
      setError("Microphone permission denied. Please allow microphone access or use manual input.");
      setTimeout(() => setError(""), 8000);
    }
  };

  const addManualItem = () => {
    if (manualInput.trim()) {
      setItems(prev => [...prev, { id: Date.now(), text: manualInput.trim() }]);
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
              className="btn h-14 bg-[#00FF00] hover:bg-[#00CC00] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-black rounded-none transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:bg-gray-300"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
          <button
            onClick={startListening}
            disabled={isListening || !speechSupported}
            className={`btn h-16 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg ${
              isListening || !speechSupported
                ? 'bg-gray-400 hover:bg-gray-400' 
                : 'bg-[#0080FF] hover:bg-[#0060CC]'
            } text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:transform-none`}
          >
            <Mic className="w-6 h-6 mr-2" />
            🎤 Speak Item
          </button>

          <button
            onClick={downloadPDF}
            disabled={items.length === 0}
            className="btn h-16 bg-[#FF1493] hover:bg-[#CC0066] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            <FileText className="w-6 h-6 mr-2" />
            ⬇️ Download PDF
          </button>

          <button
            onClick={downloadPNG}
            disabled={items.length === 0}
            className="btn h-16 bg-[#00FF00] hover:bg-[#00CC00] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-black rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            <ImageIcon className="w-6 h-6 mr-2" />
            ⬇️ Download PNG
          </button>

          <button
            onClick={clearAll}
            disabled={items.length === 0}
            className="btn h-16 bg-red-500 hover:bg-red-600 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-lg text-white rounded-none transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Trash2 className="w-6 h-6 mr-2" />
            🗑 Clear All
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
                    className="btn bg-red-500 hover:bg-red-600 border-4 border-black text-white p-2 h-auto rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all print:hidden"
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