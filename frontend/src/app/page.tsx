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

export default function NewspaperHome() {
  const [books, setBooks] = useState<any[]>(FALLBACK_BOOKS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeBook, setActiveBook] = useState<any | null>(null);

  // Reading Theme & Typography Modes
  const [readingTheme, setReadingTheme] = useState<
    "newspaper" | "sepia" | "midnight"
  >("newspaper");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  // Workspace states
  const [inWorkspace, setInWorkspace] = useState(false);
  const [currentBookId, setCurrentBookId] = useState("frankenstein");
  const [currentBookTitle, setCurrentBookTitle] = useState("Frankenstein");
  const [readingMode, setReadingMode] = useState<"original" | "pov">(
    "original",
  );

  const [sectionId, setSectionId] = useState<number>(1);
  const [targetCharacter, setTargetCharacter] = useState("Author Intent");
  const [dynamicCharacters, setDynamicCharacters] = useState<string[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);

  // Content states
  const [originalText, setOriginalText] = useState("");
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [loadingPOV, setLoadingPOV] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);

  // GraphRAG states
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
      if (res.ok && Array.isArray(data.books)) {
        setBooks(data.books);
      }
    } catch (err) {
      console.error("Failed to load catalog from backend:", err);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    if (!inWorkspace) {
      fetchCatalog();
    }
  }, [inWorkspace, fetchCatalog]);

  const categories = [
    "all",
    ...Array.from(new Set(books.map((b) => b.category.toLowerCase()))),
  ];

  const filteredBooks =
    selectedCategory === "all"
      ? books
      : books.filter((b) => b.category.toLowerCase() === selectedCategory);

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
        if (res.ok && data.original_text) {
          setOriginalText(data.original_text);
        }
      } catch (err) {
        console.error("Failed to load original section text:", err);
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
        if (res.ok && Array.isArray(data.characters)) {
          setDynamicCharacters(data.characters);
        }
      } catch (err) {
        console.error("Failed to load section characters:", err);
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

  // Pure, explicit color palettes without dark: conflicts
  const themeClasses = {
    newspaper: {
      bg: "bg-[#f8f6f0] text-stone-800",
      header: "bg-white border-stone-300 text-stone-900 shadow-sm",
      workspace: "bg-white border-stone-300 text-stone-900",
      readingBox: "bg-[#fffdfa] border-stone-300 text-stone-900",
      subcard: "bg-stone-50 border-stone-200 text-stone-800",
      controlBar: "bg-[#f0f4f8] border-sky-200 text-sky-950",
      inputBg: "bg-white border-stone-300 text-stone-900 focus:ring-sky-500",
      navBg: "bg-stone-100 border-stone-300 text-stone-700",
      btnSecondary:
        "bg-white border-stone-300 text-stone-800 hover:bg-stone-100",
      btnPrimary: "bg-sky-700 hover:bg-sky-600 text-white",
      accentBadge: "bg-amber-100 text-amber-900 border-amber-300",
      pillBg: "bg-white text-stone-700 border-stone-200 hover:bg-stone-50",
      pillActive: "bg-stone-900 text-white shadow-md",
      cardBg:
        "bg-white border-stone-200 hover:border-stone-400 hover:shadow-lg",
      activeModeBtn: "bg-stone-900 text-white shadow-xs",
      inactiveModeBtn: "text-stone-700 hover:bg-stone-200/70",
    },
    sepia: {
      bg: "bg-[#f4ecd8] text-[#433422]",
      header: "bg-[#faeed9] border-[#dfcfb4] text-[#362716] shadow-sm",
      workspace: "bg-[#faf0dc] border-[#dfcfb4] text-[#362716]",
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
      pillBg: "bg-[#faeed9] text-[#433422] border-[#dfcfb4] hover:bg-[#ebdcc0]",
      pillActive: "bg-[#5c4033] text-[#fbf8f1] shadow-md",
      cardBg:
        "bg-[#faeed9] border-[#dfcfb4] hover:border-[#bfa987] hover:shadow-lg",
      activeModeBtn: "bg-[#5c4033] text-[#fbf8f1] shadow-xs",
      inactiveModeBtn: "text-[#433422] hover:bg-[#ebdcc0]",
    },
    midnight: {
      bg: "bg-[#0b0f19] text-[#e2e8f0]",
      header: "bg-[#111827] border-slate-800 text-slate-100 shadow-sm",
      workspace: "bg-[#131c2e] border-slate-700 text-slate-100",
      readingBox: "bg-[#0f172a] border-slate-700 text-slate-200",
      subcard: "bg-[#1e293b] border-slate-700 text-slate-200",
      controlBar: "bg-[#1e293b] border-slate-700 text-slate-100",
      inputBg: "bg-[#0f172a] border-slate-600 text-white focus:ring-indigo-500",
      navBg: "bg-slate-800 border-slate-700 text-slate-300",
      btnSecondary:
        "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700",
      btnPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
      accentBadge: "bg-indigo-950 text-indigo-300 border-indigo-800",
      pillBg: "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700",
      pillActive: "bg-indigo-600 text-white shadow-md",
      cardBg:
        "bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-lg",
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
      className={`min-h-screen relative transition-colors duration-500 font-serif p-4 md:p-8 ${themeClasses.bg}`}
    >
      {/* Ambient Floating Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl animate-pulse ${readingTheme === "midnight" ? "bg-indigo-950/40" : "bg-sky-200/40"}`}
        />
        <div
          className={`absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${readingTheme === "midnight" ? "bg-purple-950/30" : "bg-emerald-200/30"}`}
        />
        <div
          className={`absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] rounded-full blur-3xl animate-pulse delay-700 ${readingTheme === "midnight" ? "bg-blue-950/20" : "bg-amber-200/30"}`}
        />
      </div>

      {/* Header Container */}
      <header
        className={`max-w-7xl mx-auto border rounded-3xl p-6 mb-8 text-center transition-all ${themeClasses.header}`}
      >
        {/* Eye-Care Theme & Typography Controls */}
        <div className="flex items-center gap-2 font-sans">
          {/* Theme Selector (Always Visible) */}
          <div
            className={`flex p-1 rounded-full border text-xs gap-1 ${themeClasses.navBg}`}
          >
            <button
              onClick={() => setReadingTheme("newspaper")}
              title="Light Paper"
              className={`px-3 py-1 rounded-full font-bold transition ${
                readingTheme === "newspaper"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-black"
              }`}
            >
              ☀️ Light
            </button>
            <button
              onClick={() => setReadingTheme("sepia")}
              title="Warm Sepia"
              className={`px-3 py-1 rounded-full font-bold transition ${
                readingTheme === "sepia"
                  ? "bg-[#5c4033] text-[#fbf8f1] shadow-xs"
                  : "text-[#433422] hover:text-black"
              }`}
            >
              📜 Sepia
            </button>
            <button
              onClick={() => setReadingTheme("midnight")}
              title="Midnight Dark"
              className={`px-3 py-1 rounded-full font-bold transition ${
                readingTheme === "midnight"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌙 Dark
            </button>
          </div>

          {/* Font Sizer: Rendered ONLY when inside the reading room / workspace */}
          {inWorkspace && (
            <div
              className={`hidden sm:flex p-1 rounded-full border text-xs font-bold animate-in fade-in duration-300 ${themeClasses.navBg}`}
            >
              <button
                onClick={() => setFontSize("sm")}
                title="Small Text"
                className={`px-2 py-0.5 rounded-full transition ${
                  fontSize === "sm"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize("base")}
                title="Regular Text"
                className={`px-2 py-0.5 rounded-full transition ${
                  fontSize === "base"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize("lg")}
                title="Large Text"
                className={`px-2 py-0.5 rounded-full transition ${
                  fontSize === "lg"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                A+
              </button>
            </div>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase font-serif my-2 drop-shadow-xs">
          The Chronicle of Perspectives
        </h1>
        <div className="flex flex-wrap justify-between items-center text-xs font-sans uppercase tracking-wider border-t border-stone-200 pt-3 mt-3 px-2 opacity-80 gap-2">
          <span>Vol. CXXVI No. 42</span>
          <span
            className={`px-3 py-0.5 rounded-full font-medium border ${themeClasses.accentBadge}`}
          >
            ✦ Zero-Token Redis Cache & Graph Engine ✦
          </span>
          <span>Free Illustrated Edition</span>
        </div>
      </header>

      {!inWorkspace ? (
        <>
          {/* Category Filter Pills */}
          <nav className="flex justify-center gap-2 mb-8 font-sans text-xs uppercase tracking-wider flex-wrap max-w-5xl mx-auto">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-bold transition-all duration-300 border ${
                    isActive ? themeClasses.pillActive : themeClasses.pillBg
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </nav>

          {/* Book Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
                <div className="mt-5 pt-3 border-t border-stone-200 flex justify-between items-center font-sans text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-amber-600 group-hover:translate-x-1 transition-transform">
                    Read Dispatch &rarr;
                  </span>
                  <span className="opacity-60 text-[10px]">Open</span>
                </div>
              </article>
            ))}
          </div>

          {/* Book Modal */}
          {activeBook && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div
                className={`border p-8 max-w-lg w-full shadow-2xl relative rounded-3xl animate-in zoom-in-95 duration-200 ${themeClasses.workspace}`}
              >
                <button
                  onClick={() => setActiveBook(null)}
                  className={`absolute top-5 right-5 font-sans font-bold text-sm w-8 h-8 rounded-full border flex items-center justify-center transition ${themeClasses.btnSecondary}`}
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
                  className={`w-full font-sans font-bold uppercase tracking-widest py-3.5 text-xs rounded-xl transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] ${themeClasses.btnPrimary}`}
                >
                  📖 Enter Reading Room & Read
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Workspace Panel */
        <div
          className={`max-w-7xl mx-auto border p-6 md:p-8 rounded-3xl shadow-xl transition-all ${themeClasses.workspace}`}
        >
          {/* Top Bar */}
          <div className="flex flex-wrap justify-between items-center border-b border-stone-200 pb-4 mb-6 gap-4">
            <button
              onClick={() => setInWorkspace(false)}
              className={`font-sans text-xs uppercase tracking-wider font-bold border px-4 py-2 rounded-xl transition shadow-2xs hover:scale-[1.02] ${themeClasses.btnSecondary}`}
            >
              &larr; Back to Catalog
            </button>

            {/* Reading Mode Switcher */}
            <div
              className={`flex p-1 rounded-2xl border font-sans text-xs font-bold uppercase gap-1 shadow-inner ${themeClasses.navBg}`}
            >
              <button
                onClick={() => setReadingMode("original")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  readingMode === "original"
                    ? themeClasses.activeModeBtn
                    : themeClasses.inactiveModeBtn
                }`}
              >
                📜 Original Book Text
              </button>
              <button
                onClick={() => setReadingMode("pov")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  readingMode === "pov"
                    ? themeClasses.activeModeBtn
                    : themeClasses.inactiveModeBtn
                }`}
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

          {/* MODE 1: ORIGINAL TEXT */}
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
                      if (val === "") {
                        setSectionId(0 as any);
                      } else {
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
                    className={`flex-1 sm:flex-none border px-4 py-2 rounded-xl disabled:opacity-40 font-bold uppercase shadow-2xs transition ${themeClasses.btnSecondary}`}
                  >
                    &larr; Previous
                  </button>
                  <button
                    onClick={() => setSectionId((prev) => prev + 1)}
                    className={`flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold uppercase shadow-xs transition ${themeClasses.btnPrimary}`}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>

              <div
                className={`border p-8 rounded-3xl shadow-xs min-h-[500px] ${themeClasses.readingBox}`}
              >
                <div className="border-b border-stone-200 pb-3 mb-6 text-center">
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

          {/* MODE 2: POV & GRAPHRAG */}
          {readingMode === "pov" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 border-r border-stone-200 pr-0 lg:pr-6 space-y-5">
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
                      if (val === "") {
                        setSectionId(0 as any);
                      } else {
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

                {/* Perspective Selector */}
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
                    className={`w-full font-sans text-xs font-bold uppercase tracking-widest py-3 rounded-xl disabled:opacity-50 transition shadow-xs hover:shadow-md active:scale-[0.99] ${themeClasses.btnPrimary}`}
                  >
                    {loadingPOV
                      ? "Synthesizing POV..."
                      : "✨ Rewrite Scene in POV"}
                  </button>
                </div>

                {/* Graph Intelligence */}
                <div
                  className={`border p-4 rounded-2xl space-y-3.5 shadow-xs ${themeClasses.subcard}`}
                >
                  <h4 className="font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    🕸️ GraphRAG Intelligence
                  </h4>
                  {!graphInitialized ? (
                    <button
                      onClick={() => setGraphInitialized(true)}
                      className={`w-full border font-sans text-[11px] font-bold uppercase tracking-widest py-3 rounded-xl transition shadow-2xs ${themeClasses.btnSecondary}`}
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
                          className={`w-full text-[11px] py-2.5 rounded-xl font-sans font-bold uppercase disabled:opacity-50 transition shadow-xs ${themeClasses.btnPrimary}`}
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

              {/* Main POV Reading Canvas */}
              <div
                className={`lg:col-span-2 flex flex-col border p-6 rounded-3xl shadow-xs ${themeClasses.readingBox}`}
              >
                <div className="flex justify-between items-center border-b border-stone-200 pb-3 mb-4">
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

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-stone-200 text-center text-xs font-sans opacity-60 flex justify-between items-center max-w-6xl mx-auto">
        <span>The Chronicle of Perspectives © 2026</span>
        <Link
          href="/admin"
          className={`border px-3 py-1.5 rounded-full shadow-2xs transition ${themeClasses.btnSecondary}`}
        >
          ⚙️ Admin Console
        </Link>
      </footer>
    </main>
  );
}
