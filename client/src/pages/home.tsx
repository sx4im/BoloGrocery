import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Mic, Download, FileImage, Trash2, List, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TypeScript interfaces for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI?: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onspeechstart: ((event: Event) => void) | null;
  onspeechend: ((event: Event) => void) | null;
  onaudiostart: ((event: Event) => void) | null;
  onaudioend: ((event: Event) => void) | null;
  onnomatch: ((event: SpeechRecognitionEvent) => void) | null;
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState('ur-PK');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [browserType, setBrowserType] = useState<'chrome' | 'brave' | 'safari' | 'other'>('other');
  const [isMobile, setIsMobile] = useState(false);
  const [languageAttempts, setLanguageAttempts] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const isStartingRef = useRef(false);
  const retryCountRef = useRef(0);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('bolo-grocery-items', JSON.stringify(groceryItems));
  }, [groceryItems]);

  // Detect browser type, mobile device, and monitor network status
  useEffect(() => {
    // Detect mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    setIsMobile(isMobileDevice);
    
    // Detect browser type
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('brave')) {
      setBrowserType('brave');
    } else if (userAgent.includes('chrome')) {
      setBrowserType('chrome');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      setBrowserType('safari');
    } else {
      setBrowserType('other');
    }

    // Set initial language based on device and browser
    if (isMobileDevice && browserType === 'chrome') {
      // Chrome mobile works better with English first, then fallback to Urdu
      setCurrentLanguage('en-US');
      setLanguageAttempts(['en-US', 'ur-PK', 'en-GB']);
    } else if (isMobileDevice) {
      // Other mobile browsers - try English first
      setCurrentLanguage('en-US');
      setLanguageAttempts(['en-US', 'ur-PK']);
    } else {
      // Desktop - start with Urdu
      setLanguageAttempts(['ur-PK', 'en-US', 'en-GB']);
    }

    // Monitor network status
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Network connection lost');
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.warn('Error stopping recognition on offline:', error);
        }
      }
      toast({
        title: "Network Offline",
        description: "Internet connection lost. Speech recognition requires internet connectivity.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isListening, toast]);

  // Initialize speech recognition
  useEffect(() => {
    const initializeSpeechRecognition = async () => {
      setIsInitializing(true);
      
      try {
        // Check if Web Speech API is supported
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setIsSupported(false);
          toast({
            title: "Speech Recognition Not Supported",
            description: "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.",
            variant: "destructive",
          });
          return;
        }

        // Check microphone permission
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
          setHasPermission(true);
        } catch (permissionError) {
          console.warn('Microphone permission not granted yet:', permissionError);
          setHasPermission(false);
        }

        // Initialize speech recognition
        const recognition = new SpeechRecognition();
        
        // Configure recognition settings based on browser and device
        recognition.continuous = false;
        recognition.interimResults = isMobile ? false : true; // Mobile works better without interim results
        recognition.maxAlternatives = isMobile ? 1 : (browserType === 'brave' ? 1 : 3);
        recognition.lang = currentLanguage;
        
        // Mobile-specific optimizations
        if (isMobile) {
          console.log(`Optimizing for mobile device (${browserType})`);
          // Mobile devices work better with these settings
          recognition.continuous = false;
          recognition.interimResults = false;
        } else {
          console.log(`Optimizing for desktop (${browserType})`);
        }

        // Event handlers
        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
          setInterimTranscript('');
          isStartingRef.current = false;
        };

        recognition.onaudiostart = () => {
          console.log('Audio capturing started');
        };

        recognition.onspeechstart = () => {
          console.log('Speech detected');
        };

        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interim += transcript;
            }
          }

          setInterimTranscript(interim);

          if (finalTranscript.trim()) {
            const cleanTranscript = finalTranscript.trim();
            setGroceryItems(prev => [...prev, cleanTranscript]);
            setInterimTranscript('');
            toast({
              title: "Item Added",
              description: `Added: ${cleanTranscript}`,
            });
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error, event.message);
          setIsListening(false);
          setInterimTranscript('');
          isStartingRef.current = false;

          let errorTitle = "Speech Recognition Error";
          let errorDescription = "";

          switch (event.error) {
            case 'not-allowed':
              errorTitle = "Microphone Access Denied";
              errorDescription = "Please allow microphone access and try again. Click the microphone icon in your browser's address bar.";
              setHasPermission(false);
              break;
            case 'no-speech':
              errorTitle = "No Speech Detected";
              errorDescription = "Please speak clearly and try again. Make sure your microphone is working.";
              break;
            case 'audio-capture':
              errorTitle = "Microphone Not Found";
              errorDescription = "No microphone detected. Please connect a microphone and refresh the page.";
              break;
            case 'network':
              errorTitle = "Network Error";
              if (!isOnline) {
                errorDescription = "No internet connection. Speech recognition requires internet connectivity.";
              } else {
                errorDescription = `Network issue detected. ${browserType === 'brave' ? 'Brave browser may have connectivity restrictions.' : 'Please check your internet connection.'} Retrying...`;
                // Auto-retry for network errors
                if (retryCountRef.current < 2) {
                  retryCountRef.current++;
                  setTimeout(() => {
                    console.log(`Retrying speech recognition (attempt ${retryCountRef.current})`);
                    handleStartListening();
                  }, 2000);
                  return; // Don't show error toast for auto-retry
                }
              }
              break;
            case 'service-not-allowed':
              errorTitle = "Service Not Available";
              errorDescription = "Speech recognition service is not available. Please try again later.";
              break;
            case 'bad-grammar':
              errorTitle = "Recognition Error";
              errorDescription = "Speech recognition failed. Please try speaking more clearly.";
              break;
            case 'language-not-supported':
              errorTitle = "Language Not Supported";
              // Try next language in fallback list
              const currentIndex = languageAttempts.indexOf(currentLanguage);
              const nextIndex = currentIndex + 1;
              
              if (nextIndex < languageAttempts.length) {
                const nextLanguage = languageAttempts[nextIndex];
                errorDescription = `${currentLanguage} not supported. Switching to ${nextLanguage === 'en-US' ? 'English (US)' : nextLanguage === 'en-GB' ? 'English (UK)' : 'Urdu'}...`;
                setCurrentLanguage(nextLanguage);
                setTimeout(() => {
                  if (recognitionRef.current) {
                    recognitionRef.current.lang = nextLanguage;
                    handleStartListening();
                  }
                }, 1500);
              } else {
                errorDescription = "No supported languages available for speech recognition on this device.";
              }
              break;
            default:
              errorDescription = `Recognition failed (${event.error}). Please try again or refresh the page.`;
          }

          if (event.error !== 'language-not-supported') {
            toast({
              title: errorTitle,
              description: errorDescription,
              variant: "destructive",
            });
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          setInterimTranscript('');
          isStartingRef.current = false;
        };

        recognition.onnomatch = () => {
          console.log('No speech match found');
          
          // Try next language in the fallback list
          const currentIndex = languageAttempts.indexOf(currentLanguage);
          const nextIndex = currentIndex + 1;
          
          if (nextIndex < languageAttempts.length) {
            const nextLanguage = languageAttempts[nextIndex];
            console.log(`Switching language from ${currentLanguage} to ${nextLanguage}`);
            setCurrentLanguage(nextLanguage);
            
            toast({
              title: "Language Switch",
              description: `Switching to ${nextLanguage === 'en-US' ? 'English (US)' : nextLanguage === 'en-GB' ? 'English (UK)' : 'Urdu'}. Please try again.`,
            });
            
            // Restart recognition with new language
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.lang = nextLanguage;
                handleStartListening();
              }
            }, 1000);
          } else {
            // All languages tried, show error
            toast({
              title: "No Match Found",
              description: isMobile 
                ? "Could not understand speech. Try speaking clearly in English or Urdu. Make sure you're in a quiet environment."
                : "Could not understand the speech. Please try again.",
              variant: "destructive",
            });
          }
        };

        recognitionRef.current = recognition;
        console.log('Speech recognition initialized successfully');

      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setIsSupported(false);
        toast({
          title: "Initialization Failed",
          description: "Failed to initialize speech recognition. Please refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.warn('Error stopping recognition:', error);
        }
      }
    };
  }, [toast, currentLanguage]);


  const handleStartListening = async () => {
    // Check if already starting or listening
    if (isStartingRef.current || isListening) {
      console.log('Already starting or listening, ignoring request');
      return;
    }

    // Check network connectivity
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Speech recognition requires internet connectivity. Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if supported
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }

    // Check if still initializing
    if (isInitializing) {
      toast({
        title: "Please Wait",
        description: "Speech recognition is still initializing. Please wait a moment.",
      });
      return;
    }

    // Check if recognition is available
    if (!recognitionRef.current) {
      toast({
        title: "Not Ready",
        description: "Speech recognition is not ready. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Request microphone permission if not granted
    if (hasPermission === false) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        toast({
          title: "Permission Granted",
          description: "Microphone access granted. You can now use voice input.",
        });
      } catch (error) {
        console.error('Microphone permission error:', error);
        toast({
          title: "Permission Required",
          description: "Please allow microphone access to use voice input. Click the microphone icon in your browser's address bar.",
          variant: "destructive",
        });
        return;
      }
    }

    // Reset retry counter on manual start
    retryCountRef.current = 0;
    
    // Start recognition
    isStartingRef.current = true;
    
    try {
      console.log(`Starting speech recognition... (Browser: ${browserType}, Language: ${currentLanguage})`);
      recognitionRef.current.start();
      
      // Set a timeout to reset the starting flag if start doesn't trigger onstart
      setTimeout(() => {
        if (isStartingRef.current && !isListening) {
          console.warn('Speech recognition start timeout');
          isStartingRef.current = false;
          toast({
            title: "Start Timeout",
            description: "Speech recognition took too long to start. Please try again.",
            variant: "destructive",
          });
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      isStartingRef.current = false;
      
      let errorMessage = "Failed to start speech recognition. Please try again.";
      
      if (error instanceof Error) {
        if (error.name === 'InvalidStateError') {
          errorMessage = "Speech recognition is already running. Please wait and try again.";
        } else if (error.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone access and try again.";
          setHasPermission(false);
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Speech recognition is not supported in this browser.";
          setIsSupported(false);
        }
      }
      
      toast({
        title: "Start Failed",
        description: errorMessage,
        variant: "destructive",
      });
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              
              {/* Speak Item Button */}
              <button 
                onClick={handleStartListening}
                disabled={isListening || !isSupported || !isOnline}
                data-testid="button-speak-item"
                className="col-span-2 md:col-span-3 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Mic className="w-5 h-5" />
                <span className="text-base">
                  {!isOnline ? "Offline" : isListening ? "Listening..." : "Speak Item"}
                </span>
                {!isOnline && (
                  <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded-full ml-2">
                    No Internet
                  </span>
                )}
              </button>
              
              {/* Download PDF Button */}
              <button 
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <Download className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Save PDF</span>
              </button>
              
              {/* Download PNG Button */}
              <button 
                onClick={handleDownloadPNG}
                data-testid="button-download-png"
                className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <FileImage className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Save PNG</span>
              </button>
              
              {/* Language Switch Button */}
              <button 
                onClick={() => {
                  const currentIndex = languageAttempts.indexOf(currentLanguage);
                  const nextIndex = (currentIndex + 1) % languageAttempts.length;
                  const nextLanguage = languageAttempts[nextIndex];
                  setCurrentLanguage(nextLanguage);
                  if (recognitionRef.current) {
                    recognitionRef.current.lang = nextLanguage;
                  }
                  toast({
                    title: "Language Changed",
                    description: `Switched to ${nextLanguage === 'en-US' ? 'English (US)' : nextLanguage === 'en-GB' ? 'English (UK)' : 'Urdu'}`,
                  });
                }}
                data-testid="button-language-switch"
                className="flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent-foreground font-medium py-3 px-4 rounded-lg transition-all duration-200 border border-accent/20 hover:border-accent/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
                <span className="text-xs sm:text-sm">
                  {currentLanguage === 'ur-PK' ? '🇵🇰 اردو' : currentLanguage === 'en-US' ? '🇺🇸 EN' : '🇬🇧 EN'}
                </span>
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
                <p className="text-sm text-accent-foreground font-medium mb-1">
                  {isMobile ? '📱 Mobile' : '💻 Desktop'} • {browserType.charAt(0).toUpperCase() + browserType.slice(1)} 
                  {!isOnline && <span className="text-destructive ml-2">(Offline)</span>}
                  {isOnline && <span className="text-green-600 ml-2">(Online)</span>}
                </p>
                <p className="text-xs text-accent-foreground/80 mb-2">
                  Current Language: {currentLanguage === 'ur-PK' ? '🇵🇰 Urdu (Pakistan)' : currentLanguage === 'en-US' ? '🇺🇸 English (US)' : '🇬🇧 English (UK)'}
                </p>
                <p className="text-xs text-accent-foreground/80">
                  {isMobile && 'Mobile optimized for better recognition. '}
                  {browserType === 'brave' && 'Brave may have network restrictions. '}
                  {browserType === 'chrome' && isMobile && 'Chrome mobile works best with English first. '}
                  {browserType === 'chrome' && !isMobile && 'Chrome optimal for Urdu recognition. '}
                  {browserType === 'safari' && 'Safari has limited Urdu support. '}
                  {browserType === 'other' && 'Browser compatibility may vary. '}
                  Auto-switches languages if no match found.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
