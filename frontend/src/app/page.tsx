"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

const FALLBACK_BOOKS = [
  {
    id: "frankenstein",
    title: "Frankenstein",
    category: "horror",
    author: "Mary Shelley",
    desc: "A gothic masterpiece exploring ambition, creation, and isolation.",
  },
  {
    id: "pride_and_prejudice",
    title: "Pride and Prejudice",
    category: "romance",
    author: "Jane Austen",
    desc: "A classic comedy of manners concerning issues of upbringing and marriage.",
  },
  {
    id: "dracula",
    title: "Dracula",
    category: "horror",
    author: "Bram Stoker",
    desc: "The iconic epistolary novel introducing the legendary vampire count.",
  },
  {
    id: "the_adventures_of_sherlock_holmes",
    title: "The Adventures of Sherlock Holmes",
    category: "mystery",
    author: "Arthur Conan Doyle",
    desc: "A collection of twelve short stories featuring the brilliant consulting detective.",
  },
  {
    id: "moby_dick",
    title: "Moby Dick",
    category: "adventure",
    author: "Herman Melville",
    desc: "The epic tale of Captain Ahab's obsessive hunt for the white whale.",
  },
  {
    id: "jane_eyre",
    title: "Jane Eyre",
    category: "romance",
    author: "Charlotte Brontë",
    desc: "Follows the emotions and experiences of its eponymous heroine as she grows up.",
  },
  {
    id: "the_time_machine",
    title: "The Time Machine",
    category: "science fiction",
    author: "H.G. Wells",
    desc: "A seminal science fiction novella that popularized the concept of time travel.",
  },
  {
    id: "alice_in_wonderland",
    title: "Alice in Wonderland",
    category: "fantasy",
    author: "Lewis Carroll",
    desc: "A young girl falls down a rabbit hole into a fantasy world.",
  },
  {
    id: "the_great_gatsby",
    title: "The Great Gatsby",
    category: "fiction",
    author: "F. Scott Fitzgerald",
    desc: "A tragic story of jazz, wealth, and the impossible American Dream.",
  },
  {
    id: "crime_and_punishment",
    title: "Crime and Punishment",
    category: "fiction",
    author: "Fyodor Dostoevsky",
    desc: "A psychological drama about a young student's moral dilemma after committing a crime.",
  },
  {
    id: "the_picture_of_dorian_gray",
    title: "The Picture of Dorian Gray",
    category: "fiction",
    author: "Oscar Wilde",
    desc: "A young man stays forever youthful while his portrait ages and decays.",
  },
  {
    id: "wuthering_heights",
    title: "Wuthering Heights",
    category: "romance",
    author: "Emily Brontë",
    desc: "A dark, passionate tale of love and revenge on the Yorkshire moors.",
  },
  {
    id: "the_count_of_monte_cristo",
    title: "The Count of Monte Cristo",
    category: "adventure",
    author: "Alexandre Dumas",
    desc: "A thrilling tale of wrongful imprisonment and spectacular revenge.",
  },
  {
    id: "a_tale_of_two_cities",
    title: "A Tale of Two Cities",
    category: "history",
    author: "Charles Dickens",
    desc: "A story of love and sacrifice set against the backdrop of the French Revolution.",
  },
  {
    id: "les_miserables",
    title: "Les Misérables",
    category: "fiction",
    author: "Victor Hugo",
    desc: "An epic story of injustice, heroism, and love in 19th-century France.",
  },
  {
    id: "the_odyssey",
    title: "The Odyssey",
    category: "poetry",
    author: "Homer",
    desc: "The epic journey of Odysseus as he attempts to return home after the Trojan War.",
  },
  {
    id: "the_iliad",
    title: "The Iliad",
    category: "poetry",
    author: "Homer",
    desc: "The legendary tale of the wrath of Achilles during the Trojan War.",
  },
  {
    id: "don_quixote",
    title: "Don Quixote",
    category: "fiction",
    author: "Miguel de Cervantes",
    desc: "The comedic and tragic adventures of a man who believes he is a knight.",
  },
  {
    id: "war_and_peace",
    title: "War and Peace",
    category: "history",
    author: "Leo Tolstoy",
    desc: "A sweeping historical epic chronicling the French invasion of Russia.",
  },
  {
    id: "the_brothers_karamazov",
    title: "The Brothers Karamazov",
    category: "fiction",
    author: "Fyodor Dostoevsky",
    desc: "A passionate philosophical novel exploring faith, doubt, and morality.",
  },
];

const FilmGrainOverlay = ({ theme }: { theme: string }) => {
  const isDark = theme === "midnight";
  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[110] ${
        isDark
          ? "opacity-[0.12] mix-blend-screen"
          : "opacity-[0.30] mix-blend-color-burn filter contrast-[1.2]"
      }`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
};

const LiveBackground = ({
  category,
  theme,
}: {
  category: string;
  theme: string;
}) => {
  const cat = (category || "all").toLowerCase();
  const isDark = theme === "midnight";

  // 🩸 1. HORROR (Fast Blood Storm & Rapid Lightning)
  if (cat.includes("horror") || cat.includes("thriller")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full blur-[100px] ${isDark ? "bg-red-800/40" : "bg-red-500/25"}`}
        />
        <div
          className={`fast-lightning absolute inset-0 ${isDark ? "bg-red-600" : "bg-rose-400"}`}
        />
        <div
          className={`blood-streak absolute top-0 left-[10%] w-[2.5px] h-36 ${isDark ? "bg-red-500 shadow-[0_0_12px_#ef4444]" : "bg-red-600"}`}
          style={{ animationDelay: "0s" }}
        />
        <div
          className={`blood-streak absolute top-0 left-[30%] w-[3px] h-44 ${isDark ? "bg-rose-500 shadow-[0_0_12px_#f43f5e]" : "bg-red-700"}`}
          style={{ animationDelay: "0.3s" }}
        />
        <div
          className={`blood-streak absolute top-0 left-[60%] w-[2px] h-32 ${isDark ? "bg-red-400 shadow-[0_0_10px_#f87171]" : "bg-rose-600"}`}
          style={{ animationDelay: "0.6s" }}
        />
        <div
          className={`blood-streak absolute top-0 left-[85%] w-[3px] h-48 ${isDark ? "bg-red-500 shadow-[0_0_12px_#ef4444]" : "bg-red-700"}`}
          style={{ animationDelay: "0.15s" }}
        />
      </div>
    );
  }

  // 💌 2. ROMANCE (Fast Petal Flurry Storm)
  if (cat.includes("romance")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute top-0 -left-10 w-96 h-96 rounded-full blur-[80px] ${isDark ? "bg-pink-900/30" : "bg-pink-300/40"}`}
        />
        <div
          className={`petal-stream absolute top-0 left-[12%] w-5 h-7 rounded-full ${isDark ? "bg-rose-400 shadow-[0_0_10px_#fb7185]" : "bg-rose-500"}`}
          style={{ animationDelay: "0s" }}
        />
        <div
          className={`petal-stream absolute top-0 left-[32%] w-6 h-8 rounded-full ${isDark ? "bg-pink-400 shadow-[0_0_12px_#f472b6]" : "bg-pink-600"}`}
          style={{ animationDelay: "0.8s" }}
        />
        <div
          className={`petal-stream absolute top-0 left-[55%] w-5 h-6 rounded-full ${isDark ? "bg-rose-300 shadow-[0_0_8px_#fda4af]" : "bg-rose-400"}`}
          style={{ animationDelay: "1.6s" }}
        />
        <div
          className={`petal-stream absolute top-0 left-[78%] w-6 h-8 rounded-full ${isDark ? "bg-pink-500 shadow-[0_0_12px_#ec4899]" : "bg-pink-600"}`}
          style={{ animationDelay: "0.4s" }}
        />
        <div
          className={`petal-stream absolute top-0 left-[92%] w-4 h-6 rounded-full ${isDark ? "bg-rose-400 shadow-[0_0_8px_#fb7185]" : "bg-rose-500"}`}
          style={{ animationDelay: "2.1s" }}
        />
      </div>
    );
  }

  // 🎭 3. DRAMA (Golden Stage Spotlight)
  if (cat.includes("drama")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="spotlight-anim absolute -top-40 left-1/2 -translate-x-1/2 w-[35rem] h-[120vh] origin-top opacity-30"
          style={{
            background: isDark
              ? "conic-gradient(from 160deg at 50% 0%, transparent, #fbbf24 20deg, transparent 40deg)"
              : "conic-gradient(from 160deg at 50% 0%, transparent, #d97706 20deg, transparent 40deg)",
          }}
        />
      </div>
    );
  }

  // 🔍 4. MYSTERY (Heavy Angled Rain)
  if (cat.includes("mystery") || cat.includes("crime")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`rain-streak absolute top-0 left-[12%] w-[2px] h-28 ${isDark ? "bg-cyan-200/60 shadow-[0_0_6px_cyan]" : "bg-slate-700/50"}`}
          style={{ animationDelay: "0.1s" }}
        />
        <div
          className={`rain-streak absolute top-0 left-[35%] w-[2px] h-36 ${isDark ? "bg-cyan-200/60 shadow-[0_0_6px_cyan]" : "bg-slate-700/50"}`}
          style={{ animationDelay: "0.6s" }}
        />
        <div
          className={`rain-streak absolute top-0 left-[62%] w-[2px] h-24 ${isDark ? "bg-cyan-200/60 shadow-[0_0_6px_cyan]" : "bg-slate-700/50"}`}
          style={{ animationDelay: "0.3s" }}
        />
        <div
          className={`rain-streak absolute top-0 left-[85%] w-[2px] h-32 ${isDark ? "bg-cyan-200/60 shadow-[0_0_6px_cyan]" : "bg-slate-700/50"}`}
          style={{ animationDelay: "0.9s" }}
        />
      </div>
    );
  }

  // 🚀 5. SCIENCE FICTION (Perspective Grid & Fast Scanline)
  if (cat.includes("science fiction") || cat.includes("sci-fi")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="grid-anim absolute -bottom-20 left-0 right-0 h-96 opacity-40"
          style={{
            backgroundImage: `linear-gradient(to right, ${isDark ? "#06b6d4" : "#0284c7"} 1.5px, transparent 1.5px), linear-gradient(to bottom, ${isDark ? "#06b6d4" : "#0284c7"} 1.5px, transparent 1.5px)`,
            backgroundSize: "36px 36px",
            transformOrigin: "bottom center",
          }}
        />
        <div
          className={`scifi-scan absolute left-0 right-0 h-1.5 ${isDark ? "bg-cyan-400 shadow-[0_0_15px_#22d3ee]" : "bg-sky-600 shadow-[0_0_10px_#0284c7]"}`}
        />
      </div>
    );
  }

  // 🗺️ 6. ADVENTURE (Giant Surging Ocean Waves Reaching the Top)
  if (cat.includes("adventure")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Ambient background glow */}
        <div
          className={`absolute -top-32 right-0 w-[40rem] h-[30rem] rounded-full blur-[100px] ${isDark ? "bg-emerald-600/20" : "bg-emerald-400/30"}`}
        />

        {/* Primary High-Surge Wave (Reaches near the top of the viewport) */}
        <svg
          className="wave-surge absolute bottom-0 left-0 w-[240%] h-[60vh] opacity-25"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C200,120 400,-30 600,60 C800,150 1000,10 1200,50 L1200,120 L0,120 Z"
            fill={isDark ? "#10b981" : "#059669"}
          />
        </svg>

        {/* Secondary Offset Wave for layered fluid depth */}
        <svg
          className="wave-surge-secondary absolute bottom-0 left-0 w-[240%] h-[50vh] opacity-20"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C250,-20 500,110 750,30 C1000,130 1100,20 1200,70 L1200,120 L0,120 Z"
            fill={isDark ? "#059669" : "#047857"}
          />
        </svg>
      </div>
    );
  }

  // 🔮 7. FANTASY (Rotating Arcane Sigil Circle & Magic Glyphs)
  if (cat.includes("fantasy")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        <div
          className={`absolute -top-10 left-1/4 w-[30rem] h-[30rem] rounded-full blur-[100px] ${isDark ? "bg-purple-900/40" : "bg-purple-300/40"}`}
        />

        {/* Outer Arcane Circle */}
        <div className="sigil-pulse absolute flex items-center justify-center">
          <svg
            className="spin-slow w-[34rem] h-[34rem] opacity-35"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={isDark ? "#c084fc" : "#9333ea"}
              strokeWidth="1.5"
              strokeDasharray="8 4"
            />
            <circle
              cx="100"
              cy="100"
              r="75"
              fill="none"
              stroke={isDark ? "#fbbf24" : "#d97706"}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <polygon
              points="100,25 165,138 35,138"
              fill="none"
              stroke={isDark ? "#c084fc" : "#9333ea"}
              strokeWidth="1.2"
            />
            <polygon
              points="100,175 35,62 165,62"
              fill="none"
              stroke={isDark ? "#fbbf24" : "#d97706"}
              strokeWidth="1.2"
            />
          </svg>

          {/* Inner Counter-Rotating Hexagram */}
          <svg
            className="spin-reverse absolute w-[22rem] h-[22rem] opacity-40"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="none"
              stroke={isDark ? "#f472b6" : "#db2777"}
              strokeWidth="1.5"
              strokeDasharray="12 6"
            />
            <circle
              cx="100"
              cy="100"
              r="40"
              fill="none"
              stroke={isDark ? "#fbbf24" : "#b45309"}
              strokeWidth="1"
            />
            <circle
              cx="100"
              cy="40"
              r="4"
              fill={isDark ? "#fbbf24" : "#b45309"}
            />
            <circle
              cx="100"
              cy="160"
              r="4"
              fill={isDark ? "#fbbf24" : "#b45309"}
            />
            <circle
              cx="40"
              cy="100"
              r="4"
              fill={isDark ? "#fbbf24" : "#b45309"}
            />
            <circle
              cx="160"
              cy="100"
              r="4"
              fill={isDark ? "#fbbf24" : "#b45309"}
            />
          </svg>
        </div>
      </div>
    );
  }

  // 🖋️ 8. POETRY (Dynamic Flowing Calligraphy Ribbons Across Canvas)
  if (cat.includes("poetry")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] ${isDark ? "bg-violet-900/30" : "bg-violet-300/30"}`}
        />

        {/* Continuous Flowing Script Strokes */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
        >
          <path
            className="calligraphy-draw"
            d="M-100,200 C300,50 400,450 700,250 C1000,50 1100,500 1400,300"
            fill="none"
            stroke={isDark ? "#c4b5fd" : "#7c3aed"}
            strokeWidth="2.5"
          />
          <path
            className="calligraphy-draw"
            d="M-100,550 C200,750 500,350 800,600 C1100,850 1200,400 1400,650"
            fill="none"
            stroke={isDark ? "#fbcfe8" : "#db2777"}
            strokeWidth="2"
            style={{ animationDelay: "3s" }}
          />
        </svg>
      </div>
    );
  }

  // 📜 9. HISTORY (Rotating Antique Compass Rose)
  if (cat.includes("history")) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
        <svg
          className="spin-slow w-[32rem] h-[32rem] opacity-20"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isDark ? "#d97706" : "#92400e"}
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={isDark ? "#d97706" : "#92400e"}
            strokeWidth="0.5"
          />
          <path
            d="M50 5 L55 45 L95 50 L55 55 L50 95 L45 55 L5 50 L45 45 Z"
            fill="none"
            stroke={isDark ? "#d97706" : "#92400e"}
            strokeWidth="0.8"
          />
        </svg>
      </div>
    );
  }

  // 📘 10. FICTION (Fluttering Novel Pages & Manuscript Leaves)
  if (cat === "fiction") {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute -top-32 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[100px] ${isDark ? "bg-sky-950/40" : "bg-sky-200/40"}`}
        />

        {/* Floating Geometric Manuscript Leaves */}
        <div
          className={`page-drift absolute bottom-0 left-[15%] w-8 h-12 rounded-[2px] border ${isDark ? "border-sky-400/60 bg-sky-900/30 shadow-[0_0_12px_#38bdf8]" : "border-sky-600/60 bg-white/70 shadow-sm"}`}
          style={{ animationDelay: "0s" }}
        />
        <div
          className={`page-drift absolute bottom-0 left-[42%] w-10 h-14 rounded-[2px] border ${isDark ? "border-indigo-400/60 bg-indigo-900/30 shadow-[0_0_12px_#818cf8]" : "border-indigo-600/60 bg-white/70 shadow-sm"}`}
          style={{ animationDelay: "2.5s" }}
        />
        <div
          className={`page-drift absolute bottom-0 left-[75%] w-7 h-10 rounded-[2px] border ${isDark ? "border-blue-400/60 bg-blue-900/30 shadow-[0_0_12px_#60a5fa]" : "border-blue-600/60 bg-white/70 shadow-sm"}`}
          style={{ animationDelay: "4.8s" }}
        />
      </div>
    );
  }

  // 📖 11. ALL / DEFAULT (Omni Prismatic Expanding Shockwaves)
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
      <div
        className={`pulse-wave absolute w-96 h-96 rounded-full border-2 ${isDark ? "border-indigo-400 shadow-[0_0_25px_#818cf8]" : "border-sky-500 shadow-[0_0_20px_#0ea5e9]"}`}
        style={{ animationDelay: "0s" }}
      />
      <div
        className={`pulse-wave absolute w-96 h-96 rounded-full border-2 ${isDark ? "border-purple-400 shadow-[0_0_25px_#c084fc]" : "border-indigo-500 shadow-[0_0_20px_#6366f1]"}`}
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className={`pulse-wave absolute w-96 h-96 rounded-full border-2 ${isDark ? "border-amber-400 shadow-[0_0_25px_#fde047]" : "border-emerald-500 shadow-[0_0_20px_#10b981]"}`}
        style={{ animationDelay: "2.4s" }}
      />
    </div>
  );
};

export default function NewspaperHome() {
  const [books, setBooks] = useState<any[]>(FALLBACK_BOOKS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeBook, setActiveBook] = useState<any | null>(null);

  const [readingTheme, setReadingTheme] = useState<
    "newspaper" | "sepia" | "midnight"
  >("midnight");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  const [inWorkspace, setInWorkspace] = useState(false);
  const [currentBookId, setCurrentBookId] = useState("frankenstein");
  const [currentBookTitle, setCurrentBookTitle] = useState("Frankenstein");
  const [currentBookCategory, setCurrentBookCategory] = useState("horror");
  const [readingMode, setReadingMode] = useState<"original" | "pov">(
    "original",
  );

  const [sectionId, setSectionId] = useState<number>(1);
  const [targetCharacter, setTargetCharacter] = useState("Author Intent");
  const [dynamicCharacters, setDynamicCharacters] = useState<string[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  const [originalText, setOriginalText] = useState("");
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [loadingPOV, setLoadingPOV] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);

  const [graphInitialized, setGraphInitialized] = useState(false);
  const [sliderValue, setSliderValue] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [loadingGraphSearch, setLoadingGraphSearch] = useState(false);

  const RAW_BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const BACKEND_URL = RAW_BACKEND_URL.replace(/['"]+/g, "").replace(/\/+$/, "");

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/catalog`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.books)) setBooks(data.books);
    } catch (err) {
      console.error("Failed to load catalog from backend:", err);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (!inWorkspace) fetchCatalog();
  }, [inWorkspace, fetchCatalog]);

  const categories = [
    "all",
    ...Array.from(
      new Set(books.map((b) => (b.category || "fiction").toLowerCase())),
    ),
  ];

  const filteredBooks =
    selectedCategory === "all"
      ? books
      : books.filter(
          (b) => (b.category || "fiction").toLowerCase() === selectedCategory,
        );

  const handleGraphSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingGraphSearch(true);
    setSearchResult("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/graph-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: currentBookId,
          section_id: Number(sliderValue),
          query: searchQuery,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Graph query failed");
      setSearchResult(data.result);
    } catch (err: any) {
      setSearchResult(`Error: ${err.message}`);
    } finally {
      setLoadingGraphSearch(false);
    }
  };

  useEffect(() => {
    if (!inWorkspace) return;
    const fetchRawText = async () => {
      setLoadingOriginal(true);
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/section-text?book_id=${currentBookId}&section_id=${sectionId}`,
        );
        const data = await res.json();
        if (res.ok && data.original_text) setOriginalText(data.original_text);
      } catch (err) {
        console.error("Failed to load section text:", err);
      } finally {
        setLoadingOriginal(false);
      }
    };
    fetchRawText();
  }, [inWorkspace, currentBookId, sectionId, BACKEND_URL]);

  useEffect(() => {
    if (!inWorkspace || readingMode !== "pov") return;
    const fetchCharacters = async () => {
      setLoadingCharacters(true);
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/characters?book_id=${currentBookId}&section_id=${sectionId}`,
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.characters))
          setDynamicCharacters(data.characters);
      } catch (err) {
        console.error("Failed to load characters:", err);
      } finally {
        setLoadingCharacters(false);
      }
    };
    fetchCharacters();
  }, [inWorkspace, readingMode, currentBookId, sectionId, BACKEND_URL]);

  const handleEnterWorkspace = (book: any) => {
    setActiveBook(null);
    setCurrentBookId(book.id);
    setCurrentBookTitle(book.title);
    setCurrentBookCategory(book.category || "fiction");
    setReadingMode("original");
    setSectionId(1);
    setDynamicCharacters([]);
    setOriginalText("");
    setResponseContent("");
    setTargetCharacter("Author Intent");
    setInWorkspace(true);
  };

  const handleGeneratePOV = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPOV(true);
    setResponseContent("");
    setIsCachedResult(false);

    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-pov`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: currentBookId,
          section_id: Number(sectionId),
          target_character: targetCharacter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate POV");
      setResponseContent(data.content);
      if (data.cached) setIsCachedResult(true);
    } catch (err: any) {
      setResponseContent(`Error: ${err.message}`);
    } finally {
      setLoadingPOV(false);
    }
  };

  const themeClasses = {
    newspaper: {
      bg: "bg-[#f8f6f0] text-stone-800",
      header:
        "bg-white/80 backdrop-blur-md border-stone-300 text-stone-900 shadow-sm",
      workspace: "bg-white/90 backdrop-blur-md border-stone-300 text-stone-900",
      readingBox: "bg-[#fffdfa] border-stone-300 text-stone-900",
      subcard: "bg-stone-50 border-stone-200 text-stone-800",
      controlBar: "bg-[#f0f4f8] border-sky-200 text-sky-950",
      inputBg: "bg-white border-stone-300 text-stone-900 focus:ring-sky-500",
      navBg: "bg-stone-100 border-stone-300 text-stone-700",
      btnSecondary:
        "bg-white border-stone-300 text-stone-800 hover:bg-stone-100",
      btnPrimary: "bg-sky-700 hover:bg-sky-600 text-white",
      accentBadge: "bg-amber-100 text-amber-900 border-amber-300",
      pillBg:
        "bg-white/80 backdrop-blur-md text-stone-700 border-stone-200 hover:bg-white",
      pillActive: "bg-stone-900 text-white shadow-md",
      cardBg:
        "bg-white/90 backdrop-blur-md border-stone-200 hover:border-stone-400 hover:shadow-lg",
      activeModeBtn: "bg-stone-900 text-white shadow-xs",
      inactiveModeBtn: "text-stone-700 hover:bg-stone-200/70",
    },
    sepia: {
      bg: "bg-[#f4ecd8] text-[#433422]",
      header:
        "bg-[#faeed9]/80 backdrop-blur-md border-[#dfcfb4] text-[#362716] shadow-sm",
      workspace:
        "bg-[#faf0dc]/90 backdrop-blur-md border-[#dfcfb4] text-[#362716]",
      readingBox: "bg-[#fdf6e7] border-[#dfcfb4] text-[#2c2014]",
      subcard: "bg-[#eedfc4]/60 border-[#dfcfb4] text-[#362716]",
      controlBar: "bg-[#ebdcc0] border-[#d8c5a4] text-[#362716]",
      inputBg:
        "bg-[#fdfbf7] border-[#c8b79b] text-[#362716] focus:ring-amber-700",
      navBg: "bg-[#e8dcbf] border-[#d8c5a4] text-[#433422]",
      btnSecondary:
        "bg-[#faeed9] border-[#c8b79b] text-[#433422] hover:bg-[#ebdcc0]",
      btnPrimary: "bg-[#8c5222] hover:bg-[#784419] text-[#fbf8f1]",
      accentBadge: "bg-[#eedfc4] text-[#5c3a1e] border-[#c8b79b]",
      pillBg:
        "bg-[#faeed9]/80 backdrop-blur-md text-[#433422] border-[#dfcfb4] hover:bg-[#ebdcc0]",
      pillActive: "bg-[#5c4033] text-[#fbf8f1] shadow-md",
      cardBg:
        "bg-[#faeed9]/90 backdrop-blur-md border-[#dfcfb4] hover:border-[#bfa987] hover:shadow-lg",
      activeModeBtn: "bg-[#5c4033] text-[#fbf8f1] shadow-xs",
      inactiveModeBtn: "text-[#433422] hover:bg-[#ebdcc0]",
    },
    midnight: {
      bg: "bg-[#0b0f19] text-[#e2e8f0]",
      header:
        "bg-[#111827]/80 backdrop-blur-md border-slate-800 text-slate-100 shadow-sm",
      workspace:
        "bg-[#131c2e]/90 backdrop-blur-md border-slate-700 text-slate-100",
      readingBox: "bg-[#0f172a] border-slate-700 text-slate-200",
      subcard: "bg-[#1e293b] border-slate-700 text-slate-200",
      controlBar: "bg-[#1e293b] border-slate-700 text-slate-100",
      inputBg: "bg-[#0f172a] border-slate-600 text-white focus:ring-indigo-500",
      navBg: "bg-slate-800 border-slate-700 text-slate-300",
      btnSecondary:
        "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700",
      btnPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
      accentBadge: "bg-indigo-950 text-indigo-300 border-indigo-800",
      pillBg:
        "bg-slate-800/80 backdrop-blur-md text-slate-300 border-slate-700 hover:bg-slate-700",
      pillActive: "bg-indigo-600 text-white shadow-md",
      cardBg:
        "bg-slate-900/90 backdrop-blur-md border-slate-800 hover:border-slate-700 hover:shadow-lg",
      activeModeBtn: "bg-indigo-600 text-white shadow-xs",
      inactiveModeBtn: "text-slate-300 hover:bg-slate-700",
    },
  }[readingTheme];

  const fontSizeClasses = {
    sm: "text-xs md:text-sm leading-relaxed",
    base: "text-sm md:text-base leading-loose",
    lg: "text-base md:text-lg leading-loose",
  }[fontSize];

  return (
    <main
      className={`min-h-screen relative transition-colors duration-500 font-serif ${themeClasses.bg}`}
    >
      {/* 🚀 ANIMATION KEYFRAMES */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
  @keyframes rainFall {
    0% { transform: translateY(-120px) translateX(0); opacity: 0; }
    20% { opacity: 0.8; }
    80% { opacity: 0.8; }
    100% { transform: translateY(100vh) translateX(-40px); opacity: 0; }
  }
  @keyframes gridPulse {
    0%, 100% { opacity: 0.25; transform: perspective(400px) rotateX(28deg) translateY(0); }
    50% { opacity: 0.55; transform: perspective(400px) rotateX(28deg) translateY(25px); }
  }
  @keyframes slowSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes reverseSpin {
    0% { transform: rotate(360deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes spotlightSweep {
    0%, 100% { transform: rotate(-25deg); opacity: 0.2; }
    50% { transform: rotate(25deg); opacity: 0.45; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(1000%); }
  }
  @keyframes tidalSurge {
    0% { transform: translateX(0) translateY(0) scaleY(1); }
    35% { transform: translateX(-15%) translateY(-88vh) scaleY(2.2); }
    65% { transform: translateX(-35%) translateY(-88vh) scaleY(2.2); }
    100% { transform: translateX(-50%) translateY(0) scaleY(1); }
  }
  @keyframes tidalSurgeSecondary {
    0% { transform: translateX(0) translateY(0) scaleY(1); }
    40% { transform: translateX(-20%) translateY(-75vh) scaleY(2.0); }
    70% { transform: translateX(-40%) translateY(-75vh) scaleY(2.0); }
    100% { transform: translateX(-50%) translateY(0) scaleY(1); }
  }
  @keyframes rapidLightning {
    0%, 82%, 86%, 90%, 94%, 100% { opacity: 0; }
    84%, 88%, 92% { opacity: 0.55; }
  }
  @keyframes fastBloodRain {
    0% { transform: translateY(-150px) translateX(0); opacity: 0; }
    20% { opacity: 0.95; }
    80% { opacity: 0.95; }
    100% { transform: translateY(105vh) translateX(-60px); opacity: 0; }
  }
  @keyframes fastPetalStream {
    0% { transform: translateY(-100px) translateX(0) rotate(0deg); opacity: 0; }
    20% { opacity: 0.9; }
    80% { opacity: 0.9; }
    100% { transform: translateY(105vh) translateX(120px) rotate(720deg); opacity: 0; }
  }
  @keyframes rapidPulseWave {
    0% { transform: scale(0.35); opacity: 0.7; }
    50% { opacity: 0.4; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes sigilBreathe {
    0%, 100% { transform: scale(0.95); opacity: 0.25; }
    50% { transform: scale(1.08); opacity: 0.55; }
  }
  @keyframes drawInkStroke {
    0% { stroke-dashoffset: 1500; opacity: 0.2; transform: translateY(-15px); }
    50% { opacity: 0.65; transform: translateY(15px); }
    100% { stroke-dashoffset: 0; opacity: 0.2; transform: translateY(-15px); }
  }

  /* 📄 Fiction: Floating Book Leaf / Fluttering Manuscript Pages */
  @keyframes pageFlutter {
    0% {
      transform: translateY(0) translateX(0) rotateX(0deg) rotateZ(0deg);
      opacity: 0;
    }
    15% {
      opacity: 0.85;
    }
    50% {
      transform: translateY(-50vh) translateX(50px) rotateX(180deg) rotateZ(90deg);
      opacity: 0.9;
    }
    85% {
      opacity: 0.85;
    }
    100% {
      transform: translateY(-110vh) translateX(-30px) rotateX(360deg) rotateZ(270deg);
      opacity: 0;
    }
  }

  .rain-streak { animation: rainFall 1.4s infinite linear; }
  .grid-anim { animation: gridPulse 5s infinite ease-in-out; }
  .spin-slow { animation: slowSpin 35s infinite linear; }
  .spin-reverse { animation: reverseSpin 25s infinite linear; }
  .spotlight-anim { animation: spotlightSweep 10s infinite ease-in-out; }
  .scifi-scan { animation: scanline 6s infinite linear; }
  .wave-surge { animation: tidalSurge 11s infinite ease-in-out; }
  .wave-surge-secondary { animation: tidalSurgeSecondary 13s infinite ease-in-out; }
  .fast-lightning { animation: rapidLightning 3.5s infinite ease-in-out; }
  .blood-streak { animation: fastBloodRain 0.9s infinite linear; }
  .petal-stream { animation: fastPetalStream 2.8s infinite linear; }
  .pulse-wave { animation: rapidPulseWave 3s infinite ease-out; }
  .sigil-pulse { animation: sigilBreathe 6s infinite ease-in-out; }
  .calligraphy-draw { 
    stroke-dasharray: 1500; 
    animation: drawInkStroke 8s infinite linear; 
  }
  .page-drift { animation: pageFlutter 8s infinite linear; }
`,
        }}
      />

      <FilmGrainOverlay theme={readingTheme} />
      <LiveBackground
        category={inWorkspace ? currentBookCategory : selectedCategory}
        theme={readingTheme}
      />

      <div className="relative z-10 p-4 md:p-8">
        <header
          className={`max-w-7xl mx-auto border rounded-3xl p-4 md:p-6 mb-8 text-center transition-all ${themeClasses.header}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-sans text-xs uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
              <span>Special Edition Broadside</span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 font-sans relative z-50">
              <div
                className={`flex flex-wrap justify-center p-1 rounded-full border text-xs gap-1 ${themeClasses.navBg}`}
              >
                <button
                  onClick={() => setReadingTheme("newspaper")}
                  className={`px-3 py-1 rounded-full font-bold transition ${readingTheme === "newspaper" ? "bg-white text-stone-900 shadow-xs" : "opacity-70 hover:opacity-100 cursor-pointer"}`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setReadingTheme("sepia")}
                  className={`px-3 py-1 rounded-full font-bold transition ${readingTheme === "sepia" ? "bg-[#5c4033] text-[#fbf8f1] shadow-xs" : "opacity-70 hover:opacity-100 cursor-pointer"}`}
                >
                  📜 Sepia
                </button>
                <button
                  onClick={() => setReadingTheme("midnight")}
                  className={`px-3 py-1 rounded-full font-bold transition ${readingTheme === "midnight" ? "bg-indigo-600 text-white shadow-xs" : "opacity-70 hover:opacity-100 cursor-pointer"}`}
                >
                  🌙 Dark
                </button>
              </div>

              {inWorkspace && (
                <div
                  className={`hidden sm:flex p-1 rounded-full border text-xs font-bold animate-in fade-in duration-300 ${themeClasses.navBg}`}
                >
                  <button
                    onClick={() => setFontSize("sm")}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${fontSize === "sm" ? "bg-white text-stone-900 shadow-xs" : "opacity-60 hover:opacity-100"}`}
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize("base")}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${fontSize === "base" ? "bg-white text-stone-900 shadow-xs" : "opacity-60 hover:opacity-100"}`}
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize("lg")}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${fontSize === "lg" ? "bg-white text-stone-900 shadow-xs" : "opacity-60 hover:opacity-100"}`}
                  >
                    A+
                  </button>
                </div>
              )}
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase font-serif my-3 md:my-2 drop-shadow-xs leading-tight">
            The Chronicle of Perspectives
          </h1>

          <div className="flex flex-col md:flex-row flex-wrap justify-between items-center text-[10px] md:text-xs font-sans uppercase tracking-wider border-t border-stone-200/50 pt-3 md:pt-4 mt-3 px-2 opacity-80 gap-3 text-center">
            <span>Vol. CXXVI No. 42</span>
            <span
              className={`px-3 py-1 rounded-full font-medium border ${themeClasses.accentBadge}`}
            >
              ✦ Zero-Token Redis Cache & Graph Engine ✦
            </span>
            <span>Free Illustrated Edition</span>
          </div>
        </header>

        {!inWorkspace ? (
          <>
            <nav className="flex justify-center gap-2 mb-8 font-sans text-xs uppercase tracking-wider flex-wrap max-w-5xl mx-auto relative z-50">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full font-bold transition-all duration-300 border cursor-pointer ${isActive ? themeClasses.pillActive : themeClasses.pillBg}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </nav>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto relative z-50">
              {filteredBooks.map((book) => (
                <article
                  key={book.id}
                  onClick={() => setActiveBook(book)}
                  className={`group relative border p-5 rounded-2xl shadow-xs transition-all duration-300 cursor-pointer flex flex-col justify-between ${themeClasses.cardBg}`}
                >
                  <div>
                    <span
                      className={`inline-block text-[10px] font-sans uppercase px-2.5 py-0.5 font-bold rounded-full border ${themeClasses.accentBadge}`}
                    >
                      {book.category}
                    </span>
                    <h2 className="text-xl font-bold mt-3 mb-1 leading-snug font-serif group-hover:text-amber-600 transition">
                      {book.title}
                    </h2>
                    <h4 className="text-xs font-sans italic opacity-70 mb-3">
                      By {book.author}
                    </h4>
                    <p className="text-xs leading-relaxed font-serif line-clamp-3 opacity-80">
                      {book.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-stone-200/50 flex justify-between items-center font-sans text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-amber-600 group-hover:translate-x-1 transition-transform">
                      Read Dispatch &rarr;
                    </span>
                    <span className="opacity-60 text-[10px]">Open</span>
                  </div>
                </article>
              ))}
            </div>

            {activeBook && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[120] animate-in fade-in duration-200">
                <div
                  className={`border p-8 max-w-lg w-full shadow-2xl relative rounded-3xl animate-in zoom-in-95 duration-200 ${themeClasses.workspace}`}
                >
                  <button
                    onClick={() => setActiveBook(null)}
                    className={`absolute top-5 right-5 font-sans font-bold text-sm w-8 h-8 rounded-full border flex items-center justify-center transition cursor-pointer ${themeClasses.btnSecondary}`}
                  >
                    ✕
                  </button>
                  <span className="inline-block text-[11px] font-sans uppercase tracking-widest text-emerald-800 font-bold bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                    Featured Publication
                  </span>
                  <h3 className="text-3xl font-bold my-3 font-serif">
                    {activeBook.title}
                  </h3>
                  <p className="text-sm italic opacity-70 mb-4 font-sans">
                    Author:{" "}
                    <span className="font-semibold">{activeBook.author}</span>
                  </p>
                  <div
                    className={`text-sm leading-relaxed mb-6 border-l-4 border-amber-500 pl-4 py-2 font-serif rounded-r-xl ${themeClasses.subcard}`}
                  >
                    {activeBook.desc}
                  </div>
                  <button
                    onClick={() => handleEnterWorkspace(activeBook)}
                    className={`w-full font-sans font-bold uppercase tracking-widest py-3.5 text-xs rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${themeClasses.btnPrimary}`}
                  >
                    📖 Enter Reading Room & Read
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className={`max-w-7xl mx-auto border p-6 md:p-8 rounded-3xl shadow-xl transition-all relative z-50 ${themeClasses.workspace}`}
          >
            <div className="flex flex-wrap justify-between items-center border-b border-stone-200/50 pb-4 mb-6 gap-4">
              <button
                onClick={() => setInWorkspace(false)}
                className={`font-sans text-xs uppercase tracking-wider font-bold border px-4 py-2 rounded-xl transition shadow-2xs hover:scale-[1.02] cursor-pointer ${themeClasses.btnSecondary}`}
              >
                &larr; Back to Catalog
              </button>
              <div
                className={`flex p-1 rounded-2xl border font-sans text-xs font-bold uppercase gap-1 shadow-inner ${themeClasses.navBg}`}
              >
                <button
                  onClick={() => setReadingMode("original")}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${readingMode === "original" ? themeClasses.activeModeBtn : themeClasses.inactiveModeBtn}`}
                >
                  📜 Original Book Text
                </button>
                <button
                  onClick={() => setReadingMode("pov")}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${readingMode === "pov" ? themeClasses.activeModeBtn : themeClasses.inactiveModeBtn}`}
                >
                  🎭 Character POV & Insights
                </button>
              </div>
              <span
                className={`font-sans text-xs font-bold uppercase tracking-widest border px-3.5 py-1.5 rounded-xl ${themeClasses.accentBadge}`}
              >
                Active: {currentBookTitle}
              </span>
            </div>

            {readingMode === "original" && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div
                  className={`flex flex-col sm:flex-row justify-between items-center border rounded-2xl p-4 gap-3 shadow-xs ${themeClasses.controlBar}`}
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                    <label className="text-xs font-sans font-bold uppercase">
                      Section / Chapter:
                    </label>
                    <input
                      type="number"
                      value={sectionId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setSectionId(0 as any);
                        else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setSectionId(Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (!sectionId || sectionId < 1) setSectionId(1);
                      }}
                      min={1}
                      className={`w-20 border p-2 font-serif text-sm text-center rounded-xl focus:outline-none focus:ring-2 select-text cursor-text ${themeClasses.inputBg}`}
                    />
                  </div>
                  <div className="flex gap-2 font-sans text-xs w-full sm:w-auto justify-end">
                    <button
                      disabled={sectionId <= 1}
                      onClick={() =>
                        setSectionId((prev) => Math.max(1, prev - 1))
                      }
                      className={`flex-1 sm:flex-none border px-4 py-2 rounded-xl disabled:opacity-40 font-bold uppercase shadow-2xs transition cursor-pointer ${themeClasses.btnSecondary}`}
                    >
                      &larr; Previous
                    </button>
                    <button
                      onClick={() => setSectionId((prev) => prev + 1)}
                      className={`flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold uppercase shadow-xs transition cursor-pointer ${themeClasses.btnPrimary}`}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>

                <div
                  className={`border p-8 rounded-3xl shadow-xs min-h-[500px] ${themeClasses.readingBox}`}
                >
                  <div className="border-b border-stone-200/50 pb-3 mb-6 text-center">
                    <h3 className="font-serif text-2xl md:text-3xl font-bold uppercase tracking-wide">
                      {currentBookTitle} — Section {sectionId}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-sans uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-full font-bold">
                      ⚡ Canonical Text via Redis Cache
                    </span>
                  </div>
                  <div
                    className={`font-serif leading-loose max-h-[600px] overflow-y-auto whitespace-pre-wrap pr-4 ${fontSizeClasses}`}
                  >
                    {loadingOriginal ? (
                      <div className="flex items-center justify-center h-64 opacity-60 animate-pulse italic font-sans font-medium">
                        Retrieving section from cache...
                      </div>
                    ) : originalText ? (
                      originalText
                    ) : (
                      <span className="italic opacity-60">
                        No original text loaded for this section.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {readingMode === "pov" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 border-r border-stone-200/50 pr-0 lg:pr-6 space-y-5">
                  <div
                    className={`border p-3.5 rounded-2xl shadow-2xs ${themeClasses.subcard}`}
                  >
                    <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1.5">
                      Section / Chapter
                    </label>
                    <input
                      type="number"
                      value={sectionId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") setSectionId(0 as any);
                        else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) setSectionId(Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (!sectionId || sectionId < 1) setSectionId(1);
                      }}
                      min={1}
                      className={`w-full border p-2.5 font-serif text-sm rounded-xl focus:outline-none focus:ring-2 shadow-2xs select-text cursor-text ${themeClasses.inputBg}`}
                    />
                  </div>

                  <div
                    className={`border p-4 rounded-2xl space-y-3.5 shadow-xs ${themeClasses.subcard}`}
                  >
                    <h4 className="font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      🎭 Perspective Switcher
                    </h4>
                    <div>
                      <label className="block text-[11px] font-sans opacity-75 font-semibold mb-1">
                        Target Perspective{" "}
                        {loadingCharacters && <span>(Loading Cache...)</span>}
                      </label>
                      <select
                        value={targetCharacter}
                        onChange={(e) => setTargetCharacter(e.target.value)}
                        className={`w-full border p-2.5 font-serif text-xs rounded-xl shadow-2xs outline-none focus:ring-2 ${themeClasses.inputBg}`}
                        disabled={loadingCharacters}
                      >
                        <option value="Author Intent">
                          📖 Original Author Intent
                        </option>
                        {dynamicCharacters.map((char) => (
                          <option key={char} value={char}>
                            👤 {char}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleGeneratePOV}
                      disabled={loadingPOV}
                      className={`w-full font-sans text-xs font-bold uppercase tracking-widest py-3 rounded-xl disabled:opacity-50 transition shadow-xs hover:shadow-md active:scale-[0.99] cursor-pointer ${themeClasses.btnPrimary}`}
                    >
                      {loadingPOV
                        ? "Synthesizing POV..."
                        : "✨ Rewrite Scene in POV"}
                    </button>
                  </div>

                  <div
                    className={`border p-4 rounded-2xl space-y-3.5 shadow-xs ${themeClasses.subcard}`}
                  >
                    <h4 className="font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      🕸️ GraphRAG Intelligence
                    </h4>
                    {!graphInitialized ? (
                      <button
                        onClick={() => setGraphInitialized(true)}
                        className={`w-full border font-sans text-[11px] font-bold uppercase tracking-widest py-3 rounded-xl transition shadow-2xs cursor-pointer ${themeClasses.btnSecondary}`}
                      >
                        🕸️ Init Narrative Graph
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <span
                          className={`inline-block text-[10px] font-sans border px-2.5 py-0.5 rounded-full font-bold uppercase ${themeClasses.accentBadge}`}
                        >
                          Graph Intelligence Active
                        </span>
                        <div>
                          <label className="block text-[10px] font-sans font-bold mb-1 opacity-80">
                            Timeline Slider (Section {sliderValue})
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={sliderValue}
                            onChange={(e) =>
                              setSliderValue(Number(e.target.value))
                            }
                            className="w-full accent-amber-600 cursor-pointer"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Trace relationship shifts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full border p-2 text-xs font-serif mb-2 outline-none rounded-xl focus:ring-2 ${themeClasses.inputBg}`}
                          />
                          <button
                            onClick={handleGraphSearch}
                            disabled={loadingGraphSearch}
                            className={`w-full text-[11px] py-2.5 rounded-xl font-sans font-bold uppercase disabled:opacity-50 transition shadow-xs cursor-pointer ${themeClasses.btnPrimary}`}
                          >
                            {loadingGraphSearch
                              ? "Searching Graph..."
                              : "Search Graph"}
                          </button>
                          {searchResult && (
                            <div
                              className={`text-[12px] mt-3 p-3.5 border rounded-xl leading-relaxed max-h-60 overflow-y-auto font-serif shadow-inner ${themeClasses.readingBox}`}
                            >
                              <div className="prose prose-sm max-w-none">
                                <ReactMarkdown>{searchResult}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`lg:col-span-2 flex flex-col border p-6 rounded-3xl shadow-xs ${themeClasses.readingBox}`}
                >
                  <div className="flex justify-between items-center border-b border-stone-200/50 pb-3 mb-4">
                    <h3
                      className={`font-sans text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${themeClasses.accentBadge}`}
                    >
                      🎭 {targetCharacter} Perspective (Section {sectionId})
                    </h3>
                    {isCachedResult && (
                      <span className="text-[10px] font-sans bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full uppercase font-bold animate-pulse">
                        ⚡ 0-Token Redis Cache HIT
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex-1 font-serif leading-relaxed max-h-[550px] overflow-y-auto whitespace-pre-wrap pr-2 ${fontSizeClasses}`}
                  >
                    {loadingPOV ? (
                      <div className="flex items-center justify-center h-64 text-amber-600 animate-pulse italic font-sans font-medium">
                        Generating inner monologue via Groq & Redis Cache...
                      </div>
                    ) : responseContent ? (
                      responseContent
                    ) : (
                      <span className="italic opacity-60">
                        Choose a perspective on the left and click &quot;Rewrite
                        Scene in POV&quot; to synthesize character monologue.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-stone-200/50 text-center text-xs font-sans opacity-60 flex justify-between items-center max-w-6xl mx-auto relative z-50">
          <span>The Chronicle of Perspectives © 2026</span>
          <Link
            href="/admin"
            className={`border px-3 py-1.5 rounded-full shadow-2xs transition ${themeClasses.btnSecondary}`}
          >
            ⚙️ Admin Console
          </Link>
        </footer>
      </div>
    </main>
  );
}
