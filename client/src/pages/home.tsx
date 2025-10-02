import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Mic, Download, FileImage, Trash2, List, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TypeScript interfaces for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function Home() {
  const [groceryItems, setGroceryItems] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bolo-grocery-items');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('bolo-grocery-items', JSON.stringify(groceryItems));
  }, [groceryItems]);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'ur-PK';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        setGroceryItems(prev => [...prev, transcript]);
        toast({
          title: "Item Added",
          description: `Added: ${transcript}`,
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Speech Recognition Error",
        description: "Please try again. Make sure your microphone is working.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const handleRequestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      toast({
        title: "Permission Granted",
        description: "Microphone access has been granted. You can now use voice input.",
      });
    } catch (error) {
      console.error('Microphone permission error:', error);
      toast({
        title: "Permission Denied",
        description: "Please allow microphone access in your browser settings to use voice input.",
        variant: "destructive",
      });
    }
  };

  const handleStartListening = () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Error",
          description: "Failed to start speech recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setGroceryItems(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Item Removed",
      description: "Item has been removed from your list.",
    });
  };

  const handleClearAll = () => {
    setGroceryItems([]);
    toast({
      title: "List Cleared",
      description: "All items have been removed from your grocery list.",
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const { NotoNastaliqUrduBase64 } = await import('@/lib/noto-nastaliq-font');
      const reshape = (await import('arabic-persian-reshaper')).default;
      
      const doc = new jsPDF();
      
      doc.addFileToVFS("NotoNastaliqUrdu.ttf", NotoNastaliqUrduBase64);
      doc.addFont("NotoNastaliqUrdu.ttf", "NotoNastaliqUrdu", "normal");
      
      const processUrduText = (text: string) => {
        const reshaped = reshape(text);
        return reshaped.split('').reverse().join('');
      };
      
      doc.setFont("NotoNastaliqUrdu");
      doc.setFontSize(20);
      const title = processUrduText('میری گروسری لسٹ');
      doc.text(title, 105, 30, { align: 'center' });
      
      doc.setFont("helvetica");
      doc.setFontSize(16);
      doc.text('My Grocery List - BoloGrocery', 105, 45, { align: 'center' });
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.setFontSize(10);
      doc.text(currentDate, 105, 55, { align: 'center' });
      
      doc.setFont("NotoNastaliqUrdu");
      doc.setFontSize(12);
      let yPosition = 75;
      
      if (groceryItems.length === 0) {
        doc.setFont("helvetica");
        doc.text('No items in the list', 20, yPosition);
      } else {
        groceryItems.forEach((item, index) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const processedItem = processUrduText(item);
          const pageWidth = doc.internal.pageSize.getWidth();
          doc.text(`${processedItem} .${index + 1}`, pageWidth - 20, yPosition, { align: 'right' });
          yPosition += 10;
        });
        
        doc.setFont("helvetica");
        doc.setFontSize(10);
        yPosition += 10;
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`Total Items: ${groceryItems.length}`, 20, yPosition);
      }
      
      doc.save('bolo-grocery-list.pdf');
      
      toast({
        title: "PDF Downloaded",
        description: "Your grocery list has been saved as PDF with proper Urdu rendering.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPNG = async () => {
    if (!listContainerRef.current) return;
    
    try {
      // Dynamically import html-to-image
      const htmlToImage = await import('html-to-image');
      
      const dataUrl = await htmlToImage.toPng(listContainerRef.current, {
        quality: 1.0,
        backgroundColor: 'white',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });
      
      const link = document.createElement('a');
      link.download = 'grocery-list.png';
      link.href = dataUrl;
      link.click();
      
      toast({
        title: "PNG Downloaded",
        description: "Your grocery list has been saved as PNG image.",
      });
    } catch (error) {
      console.error('Error generating PNG:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate PNG. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        
        {/* Main Card */}
        <div className="bg-card rounded-lg shadow-2xl overflow-hidden border border-border">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-emerald-600 p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ShoppingCart className="w-10 h-10 text-primary-foreground" />
              <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">BoloGrocery</h1>
            </div>
            <p className="text-primary-foreground/90 text-lg urdu-text font-medium">اپنی گروسری بولیں</p>
          </div>
          
          {/* Control Panel */}
          <div className="p-6 space-y-4 bg-muted/30">
            
            {/* Status Indicator */}
            <div className="min-h-[32px] flex items-center justify-center">
              {isListening && (
                <div className="flex items-center gap-2 bg-accent/20 px-4 py-2 rounded-full border border-accent/30">
                  <div className="w-2 h-2 bg-accent rounded-full listening-pulse"></div>
                  <span className="text-sm font-medium text-accent-foreground urdu-text">بولیے...</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Speak Item Button */}
              <button 
                onClick={handleStartListening}
                disabled={isListening || !isSupported}
                data-testid="button-speak-item"
                className="col-span-2 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Mic className="w-5 h-5" />
                <span className="text-base">
                  {isListening ? "Listening..." : "🎤 Speak Item"}
                </span>
              </button>
              
              {/* Download PDF Button */}
              <button 
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <Download className="w-4 h-4" />
                <span className="text-sm">Download PDF</span>
              </button>
              
              {/* Download PNG Button */}
              <button 
                onClick={handleDownloadPNG}
                data-testid="button-download-png"
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <FileImage className="w-4 h-4" />
                <span className="text-sm">Download PNG</span>
              </button>
              
              {/* Request Microphone Permission Button */}
              <button 
                onClick={handleRequestMicPermission}
                data-testid="button-mic-permission"
                className="flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 border border-accent/20 hover:border-accent/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Allow Mic</span>
              </button>
              
              {/* Clear All Button */}
              <button 
                onClick={handleClearAll}
                data-testid="button-clear-all"
                className="flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-destructive/20 hover:border-destructive/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Clear All</span>
              </button>
            </div>
          </div>
          
          {/* Grocery List */}
          <div ref={listContainerRef} className="p-6 bg-card">
            
            {/* List Header */}
            <div className="mb-4 pb-3 border-b border-border text-center">
              <h2 className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
                <List className="w-5 h-5 text-primary" />
                <span>My Grocery List</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1 urdu-text">میری گروسری لسٹ</p>
            </div>
            
            {/* Empty State */}
            {groceryItems.length === 0 && (
              <div className="py-12 text-center" data-testid="empty-state">
                <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-base">Your grocery list is empty</p>
                <p className="text-sm text-muted-foreground mt-2 urdu-text">اپنی آئٹمز شامل کرنے کے لیے "Speak Item" دبائیں</p>
              </div>
            )}
            
            {/* Items List */}
            {groceryItems.length > 0 && (
              <div className="space-y-2">
                {groceryItems.map((item, index) => (
                  <div 
                    key={index}
                    data-testid={`item-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors duration-150 group border border-border/50"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-foreground urdu-text font-medium">{item}</p>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      data-testid={`button-remove-${index}`}
                      className="flex-shrink-0 flex items-center gap-1 text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2">
                      <span className="text-sm">❌</span>
                      <span className="text-xs font-medium">Remove</span>
                    </button>
                  </div>
                ))}
                
                {/* Items Count */}
                <div className="pt-4 mt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    Total Items: <span className="font-semibold text-foreground" data-testid="items-count">{groceryItems.length}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 bg-muted/20 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Powered by Web Speech API • Supports Urdu (ur-PK)</span>
            </div>
          </div>
        </div>
        
        {/* Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Feature Card 1 */}
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground mb-1">Voice Input</h3>
                <p className="text-xs text-muted-foreground">Speak grocery items in Urdu naturally</p>
              </div>
            </div>
          </div>
          
          {/* Feature Card 2 */}
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground mb-1">Export Options</h3>
                <p className="text-xs text-muted-foreground">Download as PDF or PNG with full Urdu support</p>
              </div>
            </div>
          </div>
          
          {/* Feature Card 3 */}
          <div className="bg-card p-4 rounded-lg shadow border border-border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <List className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground mb-1">Easy Management</h3>
                <p className="text-xs text-muted-foreground">Add, remove, or clear items effortlessly</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Browser Compatibility Notice */}
        {!isSupported && (
          <div className="mt-6 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium mb-1">Browser Not Supported</p>
                <p className="text-xs text-destructive/80">Your browser doesn't support Web Speech API. Please use Chrome, Edge, or Safari for the best experience.</p>
              </div>
            </div>
          </div>
        )}
        
        {isSupported && (
          <div className="mt-6 bg-accent/10 border border-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-accent-foreground font-medium mb-1">Browser Compatibility</p>
                <p className="text-xs text-accent-foreground/80">This app requires a modern browser with Web Speech API support (Chrome, Edge, Safari). Urdu voice recognition works best in Chrome.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
