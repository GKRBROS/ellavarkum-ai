"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import NextImage from "next/image";
import {
  supabase,
  UPLOAD_FOLDER,
  FINAL_FOLDER,
  bucketName,
} from "@/lib/supabase";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { translations, type Language } from "@/lib/i18n";
import {
  Globe,
  Trash2,
  Camera,
  User,
  LogOut,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const CountryCodeDropdown = dynamic(
  () => import("../components/CountryCodeDropdown"),
  { ssr: false },
);

// --- Types ---
type Step = "otp-request" | "otp-verify" | "form" | "processing" | "result";

// --- Constants ---
const GEN_TIME = 50; // seconds
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

// --- Sub-components ---
const SlideshowFallback = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setIndex((prev) => (prev === 0 ? 1 : 0)),
      3000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full relative aspect-[1080/1350] bg-slate-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute inset-0"
        >
          <NextImage
            src={index === 0 ? "/BEFORE.webp" : "/AFTER.webp"}
            alt="Step"
            fill
            className="object-cover"
            unoptimized
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default function EllavarkkumPage() {
  const [step, setStep] = useState<Step>("otp-request");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(GEN_TIME);
  const [triesLeft, setTriesLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [scrollPosition, setScrollPosition] = useState<
    "top" | "bottom" | "middle"
  >("top");


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [lang, setLang] = useState<Language>("en");

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem("Ellavarkkum_lang") as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLang = () => {
    const newLang = lang === "en" ? "ml" : "en";
    setLang(newLang);
    localStorage.setItem("Ellavarkkum_lang", newLang);
  };

  const fetchTries = async (phoneToFetch: string) => {
    try {
      const { data, error } = await supabase
        .from("elavarkum_requests")
        .select("tries_left")
        .eq("phone", phoneToFetch)
        .single();

      if (data && !error) {
        setTriesLeft(data.tries_left);
        return data.tries_left;
      }
    } catch (err) {
      console.error("Error fetching tries:", err);
    }
    return triesLeft;
  };

  const t = translations[lang];

  const normalizePhoneNumber = (rawPhone: string, code: string) => {
    const combined = rawPhone.startsWith("+")
      ? rawPhone
      : code + rawPhone.replace(/^\+/, "");
    return combined.trim().replace(/\s+/g, "");
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const maxSize = 0.8 * 1024 * 1024; // 800KB limit to prevent 413 errors
      if (file.size <= maxSize) return resolve(file);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Max dimension 1536px for high quality but reliable server handling
          const maxDim = 1536;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback to original
              }
            },
            "image/jpeg",
            0.8,
          ); // Optimized size
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const combineImages = (
    photoSrc: string,
    isInternal: boolean,
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject("Canvas not found");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Ctx not found");

      const bgImg = new Image();
      const userImg = new Image();
      const layerImg = new Image();

      if (!isInternal) userImg.crossOrigin = "anonymous";
      bgImg.crossOrigin = "anonymous";
      layerImg.crossOrigin = "anonymous";

      bgImg.src = "/background.png"; // Changed from .webp to match docs
      userImg.src = photoSrc;
      layerImg.src = "/layer.png"; // Changed from .webp to match actual file

      let loadedCount = 0;
      let bgFailed = false;
      let layerFailed = false;

      const onAllAttempted = () => {
        loadedCount++;
        if (loadedCount === 3) {
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;

          if (!bgFailed) {
            ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          } else {
            // Fallback: Premium Gradient if background.png is missing
            const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            gradient.addColorStop(0, "#e1007a"); // Pink
            gradient.addColorStop(0.5, "#0077ff"); // Blue
            gradient.addColorStop(1, "#e1007a"); // Pink
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            console.warn("Using fallback gradient because /background.png was not found");
          }

          const gapWidth = 620;
          const gapHeight = 620;
          const gapX = (CANVAS_WIDTH - gapWidth) / 2;
          const gapY = 160;
          const scale = Math.max(
            gapWidth / userImg.width,
            gapHeight / userImg.height,
          );
          const w = userImg.width * scale;
          const h = userImg.height * scale;
          const dx = gapX + (gapWidth - w) / 2;
          const dy = gapY + (gapHeight - h) / 2;
          ctx.drawImage(userImg, dx, dy, w, h);

          if (!layerFailed) {
            ctx.drawImage(layerImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          }

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject("Blob creation failed");
          }, "image/png");
        }
      };

      bgImg.onload = onAllAttempted;
      userImg.onload = onAllAttempted;
      layerImg.onload = onAllAttempted;
      
      bgImg.onerror = () => {
        bgFailed = true;
        onAllAttempted();
      };
      userImg.onerror = () => reject("Failed to load user photo asset");
      layerImg.onerror = () => {
        layerFailed = true;
        onAllAttempted();
      };
    });
  };

  const generateExamplePreview = useCallback(async () => {
    try {
      const blob = await combineImages("/example.png", true);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      console.error("Example preview failed:", e);
    }
  }, []);

  useEffect(() => {
    if (step === "form" && phone) {
      fetchTries(phone);
    }
  }, [step, phone]);

  // --- Effects ---

  useEffect(() => {
    generateExamplePreview();

    const savedSession = localStorage.getItem("Ellavarkkum_session");
    if (savedSession) {
      try {
        const {
          phone: savedPhone,
          step: savedStep,
          imageUrl: savedImageUrl,
          requestId: savedRequestId,
        } = JSON.parse(savedSession);

        if (savedPhone && savedStep !== "processing") {
          setPhone(savedPhone);
          setStep(savedStep);
          if (savedRequestId) setRequestId(savedRequestId);
          if (savedImageUrl) setFinalImageUrl(savedImageUrl);

          const syncTries = async () => {
            try {
              const { data, error } = await supabase
                .from("elavarkum_requests")
                .select("tries_left, generated_image_url")
                .eq("phone", savedPhone)
                .maybeSingle();
              
              if (error) throw error;

              if (data) {
                setTriesLeft(data.tries_left);
                // AUTO-RECOVERY: If the image was generated while user was away/reloading
                if (data.generated_image_url && savedStep !== "result") {
                  console.log("Auto-recovering session from Supabase result");
                  setFinalImageUrl(data.generated_image_url);
                  setStep("result");
                  setShowResultModal(true);
                  localStorage.setItem(
                    "Ellavarkkum_session",
                    JSON.stringify({
                      phone: savedPhone,
                      step: "result",
                      imageUrl: data.generated_image_url,
                      requestId: savedRequestId
                    })
                  );
                }
              }
            } catch (err) {
              console.error("Session sync failed:", err);
            }
          };
          syncTries();
        } else if (savedPhone && savedStep === "processing") {
          setPhone(savedPhone);
          // If we reloaded while processing, go to form but check for result
          setStep("form");
          const recover = async () => {
             const { data } = await supabase
                .from("elavarkum_requests")
                .select("tries_left, generated_image_url")
                .eq("phone", savedPhone)
                .maybeSingle();
             if (data?.generated_image_url) {
                setFinalImageUrl(data.generated_image_url);
                setStep("result");
             }
          };
          recover();
        } else {
          console.warn("Invalid session found, removing:", savedSession);
          localStorage.removeItem("Ellavarkkum_session");
        }
      } catch (e) {
        console.error("Failed to parse session:", e);
        localStorage.removeItem("Ellavarkkum_session");
      }
    } else {
      console.log("No saved session found in localStorage");
    }
    let scrollTimer: any;
    const handleScroll = () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const fullHeight = document.documentElement.scrollHeight;

        if (scrollY < 100) {
          setScrollPosition("top");
        } else if (scrollY + windowHeight > fullHeight - 100) {
          setScrollPosition("bottom");
        } else {
          setScrollPosition("middle");
        }
        scrollTimer = null;
      }, 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [generateExamplePreview]);

  // --- Handlers ---

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setIsLoading(true);

    try {
      const fullPhone = normalizePhoneNumber(phone, countryCode);
      const currentTries = 3;
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Failed to send OTP");

      toast.success("OTP sent!");
      setStep("otp-verify");
      setTriesLeft(resData.triesLeft ?? currentTries);
      
      // Save phone early to prevent redirect to start on refresh
      localStorage.setItem(
        "Ellavarkkum_session",
        JSON.stringify({ 
          phone: fullPhone, 
          step: "otp-verify" 
        }),
      );
    } catch (err: any) {
      toast.error(
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Failed to send OTP",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {

      const fullPhone = normalizePhoneNumber(phone, countryCode);
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, otp }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Verification failed");

      const verifiedRequestId = resData.requestId;
      setTriesLeft(resData.triesLeft ?? 5);
      if (verifiedRequestId) setRequestId(verifiedRequestId);
      setStep("form");

      // Save session with step
      localStorage.setItem(
        "Ellavarkkum_session",
        JSON.stringify({
          phone: fullPhone,
          step: "form",
          requestId: verifiedRequestId,
        }),
      );

      toast.success("Identity verified!");
    } catch (err: any) {
      toast.error("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("Ellavarkkum_session");
    setStep("otp-request");
    setPhone("");
    setOtp("");
    setName("");
    setFile(null);
    setPreviewUrl(null);
    setFinalImageUrl(null);
    toast.success("Logged out successfully");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setIsLoading(true);
      try {
        const compressed = await compressImage(selectedFile);
        setFile(compressed);
        setPreviewUrl(URL.createObjectURL(compressed));
        setShowGuidelines(false);
        toast.success(
          compressed.size < selectedFile.size
            ? "Photo optimized for upload!"
            : "Photo uploaded!",
        );
      } catch (err) {
        console.error("Compression failed:", err);
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setShowGuidelines(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;
    if (triesLeft <= 0) {
      toast.error("No tries left");
      return;
    }

    setStep("processing");
    localStorage.setItem(
      "Ellavarkkum_session",
      JSON.stringify({ phone, step: "processing" }),
    );
    setTimer(GEN_TIME);

    // Start countdown
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      // 1. Prepare form data
      const fullPhone = normalizePhoneNumber(phone, countryCode);
      const formData = new FormData();
      formData.append("phone", fullPhone);
      formData.append("name", name);
      formData.append("gender", gender);
      formData.append("photo", file);
      if (requestId) formData.append("requestId", requestId);

      // 2. Call AI Generation API
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "AI Generation failed";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } else {
            const text = await response.text();
            console.error("Non-JSON Error Response:", text.slice(0, 500));
            errorMessage = `Server Error (${response.status})`;
          }
        } catch (e) {
          errorMessage = `Connection Error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // 3. Update local state with results
      const updatedTries = data.triesLeft ?? triesLeft;
      setTriesLeft(updatedTries);
      setFinalImageUrl(data.finalImageUrl);

      // Save result state with image URL
      localStorage.setItem(
        "Ellavarkkum_session",
        JSON.stringify({
          phone,
          step: "result",
          imageUrl: data.finalImageUrl,
        }),
      );

      // Wait for progress effect
      setTimeout(() => {
        setStep("result");
        setShowResultModal(true);
        toast.success(`Generated! ${updatedTries} tries remaining.`);
      }, 2000);
    } catch (err: any) {
      toast.error(
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Generation failed",
      );
      setStep("form");
    } finally {
      clearInterval(interval);
    }
  };

  const handleDownload = async () => {
    if (!finalImageUrl) return;
    try {
      // Use our internal proxy which forces Content-Disposition: attachment
      const downloadUrl = `/api/assets/download?url=${encodeURIComponent(finalImageUrl)}&download=1&filename=Ellavarkkum_ai_${Date.now()}.png`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Ellavarkkum_ai_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Download failed:", err);
      // Fallback: open in new tab for manual save
      window.open(finalImageUrl, "_blank");
    }
  };

  const removePhoto = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTryAgain = () => {
    if (triesLeft > 0) {
      setStep("form");
      setFile(null);
      setPreviewUrl(null);
      setFinalImageUrl(null);
      setName("");

      // Update session to form state
      localStorage.setItem(
        "Ellavarkkum_session",
        JSON.stringify({ phone, step: "form" }),
      );
    } else {
      toast.error("No tries left. Please contact support.");
    }
  };

  // --- Render ---

  return (
    <main className="min-h-screen bg-slate-50/50 text-slate-900 selection:bg-blue-100 font-inter">
      <div className="noise-overlay opacity-[0.03]" />
      <Toaster position="bottom-center" />

      {/* Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-[40px] max-w-lg w-full shadow-2xl border border-slate-100"
          >
            <h3 className="text-2xl font-black mb-4">{t.photoGuidelines}</h3>
            <NextImage
              src="/Image to use.webp"
              alt="Guidelines"
              width={500}
              height={400}
              className="w-full h-auto rounded-3xl mb-6 shadow-md border"
            />
            <div className="text-slate-600 mb-8 space-y-2 font-medium">
              <p>• {t.guideline1}</p>
              <p>• {t.guideline2}</p>
              <p>• {t.guideline3}</p>
              <p>• {t.guideline4}</p>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowGuidelines(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold transition-colors hover:bg-slate-200"
              >
                {t.back}
              </button>
              <button
                onClick={(e) => {
                  setShowGuidelines(false);
                  if (file) {
                    handleGenerate(e);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-full font-bold transition-all hover:bg-blue-700 shadow-xl shadow-blue-200"
              >
                {file ? t.generateNow : t.proceed}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4 flex justify-between items-center glass-panel">
        <div className="flex items-center gap-2 md:gap-4">
          <NextImage
            src="https://ellavarkkumai.frameforge.one/LOGO.png"
            alt="Logo"
            width={48}
            height={48}
            className="h-10 md:h-12 w-auto"
            unoptimized
          />
          <span className="font-heading text-xl md:text-2xl font-black tracking-tighter sm:block">
            {lang === "en" ? "ELLAVARKKUM" : "എല്ലാവരും"} <span className="text-blue-600">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>{lang === "en" ? "മലയാളം" : "English"}</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-24 pb-12 md:py-32 relative z-10">
        <AnimatePresence mode="wait">
          {/* STEP: OTP REQUEST */}
          {step === "otp-request" && (
            <motion.div
              key="otp-request"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center max-w-6xl w-full"
            >
              {/* Left Side: Showcase */}
              <div className="space-y-8 order-1 lg:order-1">
                <div className="text-center lg:text-left">
                  <h1 className="text-4xl sm:text-5xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] mb-6">
                    {lang === "ml" ? "എല്ലാവരും" : "Everyone"} <span className="text-blue-600">AI</span> – <span className="text-[#e1007a]">{lang === "en" ? "AI for Everyone" : "എല്ലാവർക്കും AI"}</span>
                  </h1>
                  <p className="text-lg sm:text-xl text-slate-600 max-w-md mx-auto lg:mx-0 font-medium">
                    {t.subtext}
                  </p>
                </div>

                <div className="relative rounded-[32px] overflow-hidden shadow-2xl bg-black border border-slate-100 group">
                  <NextImage
                    src="/main.gif"
                    alt="How it works"
                    width={1080}
                    height={1350}
                    className="w-full h-auto relative z-10 block"
                    unoptimized
                  />

                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center z-30">
                    <div className="px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white">
                        How it Works
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Login Form */}
              <div
                className="flex justify-center order-2 lg:order-2 w-full px-2"
                id="main-action"
              >
                <div className="w-full max-w-md glass-panel p-5 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-2xl border border-slate-100 relative mx-auto">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#e1007a] via-[#0077ff] to-[#e1007a]" />

                  <div className="mb-8 sm:mb-10 text-center">
                    <h2 className="text-3xl sm:text-4xl font-heading font-black mb-3 text-slate-900">
                      {t.continueMobile}
                    </h2>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">
                      {t.otpSent}
                    </p>
                  </div>

                  <form onSubmit={handleRequestOtp} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 ml-4">
                        Phone Number
                      </label>
                      <div className="flex gap-2 items-stretch">
                        <CountryCodeDropdown
                          onSelect={(code) => setCountryCode(code)}
                        />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="98765 43210"
                          className="flex-1 min-w-0 px-4 sm:px-6 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-base sm:text-lg"
                        />
                      </div>
                    </div>
                    <button
                      disabled={isLoading}
                      className="w-full py-5 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? t.sendingOtp : t.getStarted}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: OTP VERIFY */}
          {step === "otp-verify" && (
            <motion.div
              key="otp-verify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center"
            >
              <div
                id="main-action"
                className="w-full max-w-md glass-panel p-10 rounded-[40px] shadow-2xl border border-slate-100 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#e1007a] via-[#0077ff] to-[#e1007a]" />

                <div className="mb-10 text-center">
                  <h2 className="text-4xl font-heading font-black mb-3 text-slate-900">
                    {t.otpVerify}
                  </h2>
                  <p className="text-slate-500 text-center mb-6 font-medium">
                    {t.otpSent}{" "}
                    <span className="font-bold text-blue-600">
                      {countryCode + phone.replace(/^\+/, "")}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-600 ml-4">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="000000"
                      className="w-full px-4 sm:px-6 py-5 rounded-full border border-blue-200 text-center text-2xl sm:text-3xl font-black tracking-[0.2em] sm:tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-blue-50/50 focus:border-blue-600 transition-all"
                    />
                  </div>
                  <button
                    disabled={isLoading}
                    className="w-full py-5 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading
                      ? t.verifying
                      : t.title + " IMAGE GENERATOR"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* STEP: FORM */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start"
            >
              {/* Form Side */}
              <div className="space-y-10">
                <div className="flex justify-between items-center mb-8 bg-white/50 p-6 rounded-3xl border border-white shadow-sm backdrop-blur-sm">
                  <div>
                    <h2 className="text-2xl font-heading font-black tracking-tight text-slate-800">
                      {t.welcome}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">
                      {phone}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-[#e1007a] transition-all bg-white border border-slate-100 rounded-2xl hover:border-[#e1007a]/20 shadow-sm hover:shadow-md"
                  >
                    {t.logout}
                  </button>
                </div>

                <div className="mb-10 text-center lg:text-left">
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-3">
                    <h2 className="text-3xl sm:text-5xl font-heading font-black tracking-tight leading-[1.1] text-slate-900">
                      {t.createFrame}
                    </h2>
                    <div className="px-4 py-2 bg-blue-50 rounded-full border border-blue-100 shadow-sm">
                      <span className="text-blue-600 font-black text-xs uppercase tracking-wider">
                        {triesLeft} {t.triesLeft}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-lg">
                    {t.fillDetails}
                  </p>
                </div>

                <div
                  className="bg-white p-8 sm:p-10 rounded-[40px] shadow-2xl shadow-blue-900/5 border border-slate-100 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-[#e1007a] to-blue-600" />
                  
                  <form className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 ml-2">
                        {t.genderLabel}
                      </label>
                      <div className="flex gap-4 p-2 bg-slate-50/50 rounded-3xl border border-slate-100">
                        <button
                          type="button"
                          onClick={() => setGender("male")}
                          className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all ${gender === "male" ? "bg-blue-600 text-white shadow-xl shadow-blue-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
                        >
                          {t.male}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender("female")}
                          className={`flex-1 py-4 rounded-2xl text-sm font-black transition-all ${gender === "female" ? "bg-[#e1007a] text-white shadow-xl shadow-pink-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
                        >
                          {t.female}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 ml-2">
                        {t.nameLabel}
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border border-slate-100 rounded-3xl text-lg font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all"
                          placeholder="Your full name"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] uppercase tracking-[0.2em] font-black text-slate-400 ml-2">
                        {t.photoLabel}
                      </label>
                      
                      {file ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative group/preview w-full aspect-[4/3] rounded-[40px] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100"
                        >
                          {previewUrl && (
                            <NextImage
                              src={previewUrl}
                              alt="Preview"
                              fill
                              className="object-cover transition-transform duration-700 group-hover/preview:scale-110"
                              unoptimized
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                          
                          {/* Floating Cross Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto();
                            }}
                            className="absolute top-6 right-6 w-12 h-12 bg-white/95 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90 z-20 group-hover/preview:rotate-90"
                          >
                            <X className="w-6 h-6" />
                          </button>

                          <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-4 bg-white/95 backdrop-blur-md rounded-2xl text-center shadow-xl flex items-center justify-center gap-3 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-white transition-colors"
                            >
                              <Camera className="w-5 h-5 text-blue-600" />
                              {t.changePhoto}
                            </button>
                            <div className="px-4 py-2 bg-blue-600/90 backdrop-blur-sm rounded-xl text-center">
                               <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                 {t.imageSelected}
                               </span>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div
                          onClick={() => {
                            if (file) handleGenerate(null as any);
                            else setShowGuidelines(true);
                          }}
                          className="w-full aspect-[4/3] border-4 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center bg-slate-50/50 group hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                            <Upload className="w-8 h-8 text-blue-600" />
                          </div>
                          <span className="text-slate-700 font-black text-xl mb-2">
                            {t.dropPhoto}
                          </span>
                          <span className="text-slate-400 font-bold text-sm">
                            PNG or JPG up to 10MB
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xl hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex flex-col items-center justify-center gap-1 mt-8"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6" />
                        {t.generateBtn}
                      </div>
                      <span className="text-xs font-bold opacity-60 uppercase tracking-widest">
                        {t.generateNote}
                      </span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Preview Side */}
              <div className="space-y-4">
                <div className="flex justify-start px-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0077ff] bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                    Reference Portrait
                  </span>
                </div>

                <div className="relative rounded-[40px] overflow-hidden shadow-2xl bg-black border border-slate-200 group">
                  <NextImage
                    src="/main.gif"
                    alt="Reference Portrait"
                    width={1080}
                    height={1350}
                    className="w-full h-auto object-contain block"
                    unoptimized
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP: PROCESSING */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] pt-20"
            >
              <div className="relative w-72 h-72 mb-16">
                {/* Circular Progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="144"
                    cy="144"
                    r="130"
                    className="stroke-slate-100"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="144"
                    cy="144"
                    r="130"
                    className="stroke-[#e1007a]"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="816.8"
                    initial={{ strokeDashoffset: 816.8 }}
                    animate={{ strokeDashoffset: 816.8 * (timer / GEN_TIME) }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-7xl font-heading font-black text-[#e1007a] tracking-tighter">
                    {timer}s
                  </span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">
                    {t.sculpting}
                  </span>
                </div>

                {/* Decorative dots */}
                <div className="absolute inset-0 animate-spin-slow pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#e1007a] rounded-full blur-sm" />
                </div>
              </div>

              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-3xl font-heading font-black text-slate-900">
                  {t.processingTitle}
                </h2>
                <p className="text-slate-500 leading-relaxed text-lg font-medium">
                  {t.processingSub}
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP: RESULT */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center"
            >
              <div className="space-y-10 order-2 lg:order-1" id="main-action">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-sm font-bold border border-green-100">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {t.generationComplete}
                </div>

                <div className="text-center lg:text-left">
                  <h2 className="text-4xl sm:text-6xl font-heading font-black mb-6 tracking-tight leading-[1.1]">
                    {t.resultTitle}
                  </h2>
                  <div className="text-lg sm:text-xl text-slate-500 leading-relaxed font-medium space-y-4">
                    <p>{t.shareInst}</p>
                    <ul className="text-base space-y-2 list-none">
                      <li className="flex items-center gap-2">
                        <span className="text-blue-600">📸</span> {t.collaborate}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-blue-600">#️⃣</span> {t.hashtag}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#e1007a]">👥</span> {t.inviteFriends}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-5 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-blue-100"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {t.download}
                    </button>

                    <button
                      onClick={handleTryAgain}
                      className="flex-1 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      {t.tryAgain} ({triesLeft} {t.triesLeft})
                    </button>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full py-4 text-slate-400 font-bold text-sm hover:text-red-500 transition-all flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    {t.logoutExit}
                  </button>
                </div>
              </div>

              <div className="space-y-6 order-1 lg:order-2">
                <div className="text-center mb-4">
                  <p className="text-slate-500 font-bold text-sm">
                    {t.selectionHint}
                  </p>
                  <p className="text-blue-600 font-black text-lg">
                    {t.selectFavorite}
                  </p>
                </div>
                <div className="relative rounded-[32px] overflow-hidden shadow-2xl bg-black border border-slate-100 group">
                {finalImageUrl ? (
                  <NextImage
                    src={finalImageUrl}
                    alt="Final AI Persona"
                    width={1080}
                    height={1350}
                    className="w-full h-auto relative z-10 block"
                    unoptimized
                  />
                ) : (
                  <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-500 animate-spin" />
                    <p className="text-sm font-medium">
                      {t.finalizing}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Action Modal */}
      <AnimatePresence>
        {showResultModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-[#e1007a] to-blue-600" />
              
              <button 
                onClick={() => setShowResultModal(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h3 className="text-3xl font-heading font-black text-slate-900 leading-tight">
                  {t.resultTitle}
                </h3>

                <div className="space-y-4 pt-2">
                  <button
                    onClick={() => {
                      handleDownload();
                      setShowResultModal(false);
                    }}
                    className="w-full py-5 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Download className="w-6 h-6" />
                    {t.download}
                  </button>

                  <button
                    onClick={() => {
                      setShowResultModal(false);
                      handleTryAgain();
                    }}
                    className="w-full py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {t.tryAgain} ({triesLeft} {t.triesLeft})
                  </button>
                </div>

                <div className="pt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-xs text-orange-800 font-bold leading-relaxed">
                    <span className="uppercase tracking-widest text-[10px] block mb-1 text-orange-600">Notice:</span>
                    {t.aiDisclaimer}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Scroll Navigator */}
      <div className="fixed bottom-10 right-6 z-[9999] md:hidden pointer-events-auto">
        <AnimatePresence mode="wait">
          {scrollPosition === "top" ? (
            <motion.button
              key="scroll-down"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onPointerDown={(e) => {
                e.preventDefault();
                const section = document.getElementById("main-action");
                if (section) {
                  section.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }
              }}
              className="w-16 h-16 bg-blue-600 rounded-full shadow-[0_20px_50px_rgba(37,99,235,0.4)] flex flex-col items-center justify-center text-white active:scale-90 transition-all border-4 border-white cursor-pointer touch-none"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-tighter">
                {t.scrollDown}
              </span>
            </motion.button>
          ) : scrollPosition === "bottom" ? (
            <motion.button
              key="scroll-up"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onPointerDown={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-16 h-16 bg-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center text-slate-600 active:scale-90 transition-all border-4 border-blue-50 cursor-pointer touch-none"
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">
                {t.scrollTop}
              </span>
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <footer className="py-12 border-t border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <NextImage
              src="https://ellavarkkumai.frameforge.one/LOGO.png"
              alt="Ellavarkkum AI"
              width={32}
              height={32}
              className="h-8 w-auto"
              unoptimized
            />
            <span className="text-slate-400 text-sm font-medium">
              © {new Date().getFullYear()} Ellavarkkum AI. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Powered by
            </span>
            <a
              href="https://frameforge.one/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0077ff] font-black tracking-tight hover:text-[#e1007a] transition-colors"
            >
              FRAME FORGE
            </a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </main>
  );
}
