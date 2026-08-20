"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// 20 robust fallback books to show instantly while the API fetches the full Redis catalog
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
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeBook, setActiveBook] = useState<any | null>(null);

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

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Fetch Full Catalog from Backend API (Redis)
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/catalog`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.books) && data.books.length > 0) {
          setBooks(data.books);
        }
      } catch (err) {
        console.error(
          "Failed to load full catalog from API. Using fallback.",
          err,
        );
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, [BACKEND_URL]);

  // Dynamically extract unique categories from loaded books
  const categories = [
    "all",
    ...Array.from(new Set(books.map((b) => b.category))),
  ];

  const filteredBooks =
    selectedCategory === "all"
      ? books
      : books.filter((b) => b.category === selectedCategory);

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

  // Fetch Cached Raw Text on Section Change
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

  // Fetch Cached Characters when in POV Mode
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

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#2c2c2c] font-serif p-4 md:p-8 select-none">
      <header className="border-b-4 border-double border-[#2c2c2c] pb-4 mb-6 text-center">
        <h5 className="text-xs uppercase tracking-widest font-sans mb-1 text-stone-600">
          The Daily Literary Gazette — Special Edition
        </h5>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase font-serif my-2">
          The Chronicle of Perspectives
        </h1>
        <div className="flex justify-between items-center text-xs font-sans uppercase tracking-wider border-t border-b border-[#2c2c2c] py-1 mt-2">
          <span>Vol. CXXVI No. 42</span>
          <span>✦ Zero-Token Redis Cache & Graph Engine ✦</span>
          <span>Free Edition</span>
        </div>
      </header>

      {!inWorkspace ? (
        <>
          <nav className="flex justify-center gap-4 mb-6 font-sans text-xs uppercase tracking-wider flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 border border-[#2c2c2c] transition ${
                  selectedCategory === cat
                    ? "bg-[#2c2c2c] text-[#f4f1ea]"
                    : "hover:bg-stone-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {filteredBooks.map((book) => (
              <article
                key={book.id}
                onClick={() => setActiveBook(book)}
                className="border border-[#2c2c2c] p-5 bg-white shadow-[4px_4px_0px_0px_rgba(44,44,44,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-sans uppercase bg-stone-100 border border-stone-300 px-2 py-0.5 font-semibold text-stone-700">
                    {book.category}
                  </span>
                  <h2 className="text-xl font-bold mt-2 mb-1 leading-snug font-serif">
                    {book.title}
                  </h2>
                  <h4 className="text-xs font-sans italic text-stone-600 mb-3">
                    By {book.author}
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed font-serif line-clamp-3">
                    {book.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-dashed border-stone-300 flex justify-between items-center font-sans text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-amber-800">Read Dispatch &rarr;</span>
                  <span>[Open]</span>
                </div>
              </article>
            ))}
          </div>

          {activeBook && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-[#fcfbf7] border-4 border-[#2c2c2c] p-8 max-w-lg w-full shadow-2xl relative">
                <button
                  onClick={() => setActiveBook(null)}
                  className="absolute top-4 right-4 font-sans font-bold text-lg px-2 border border-black hover:bg-black hover:text-white transition"
                >
                  ✕
                </button>
                <span className="text-xs font-sans uppercase tracking-widest text-stone-500 font-semibold">
                  Featured Publication
                </span>
                <h3 className="text-3xl font-bold my-2 font-serif">
                  {activeBook.title}
                </h3>
                <p className="text-sm italic text-stone-600 mb-4 font-sans">
                  Author: {activeBook.author}
                </p>
                <p className="text-sm text-stone-800 leading-relaxed mb-6 border-l-2 border-black pl-3 font-serif">
                  {activeBook.desc}
                </p>
                <button
                  onClick={() => handleEnterWorkspace(activeBook)}
                  className="w-full bg-[#2c2c2c] text-[#f4f1ea] font-sans font-bold uppercase tracking-widest py-3 text-sm hover:bg-stone-800 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  📖 Enter Reading Room & Read
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="max-w-7xl mx-auto bg-white border-2 border-[#2c2c2c] p-6 shadow-[6px_6px_0px_0px_rgba(44,44,44,1)]">
          {/* Top Bar Navigation */}
          <div className="flex flex-wrap justify-between items-center border-b border-black pb-3 mb-4 gap-4">
            <button
              onClick={() => setInWorkspace(false)}
              className="font-sans text-xs uppercase tracking-wider font-bold border border-black px-3 py-1.5 hover:bg-black hover:text-white transition"
            >
              &larr; Back to Catalog
            </button>

            {/* Reading Mode Switcher */}
            <div className="flex border border-black p-0.5 bg-stone-100 font-sans text-xs font-bold uppercase">
              <button
                onClick={() => setReadingMode("original")}
                className={`px-4 py-1.5 transition ${
                  readingMode === "original"
                    ? "bg-[#2c2c2c] text-[#f4f1ea]"
                    : "text-stone-600 hover:text-black"
                }`}
              >
                📜 Original Book Text
              </button>
              <button
                onClick={() => setReadingMode("pov")}
                className={`px-4 py-1.5 transition ${
                  readingMode === "pov"
                    ? "bg-amber-800 text-white"
                    : "text-stone-600 hover:text-black"
                }`}
              >
                🎭 Character POV & Insights
              </button>
            </div>

            <span className="font-sans text-xs font-bold uppercase tracking-widest bg-stone-200 px-3 py-1">
              Active: {currentBookTitle}
            </span>
          </div>

          {/* MODE 1: ORIGINAL BOOK TEXT */}
          {readingMode === "original" && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex justify-between items-center bg-stone-100 border border-stone-300 p-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-sans font-bold uppercase">
                    Section / Chapter:
                  </label>
                  <input
                    type="number"
                    value={sectionId}
                    onChange={(e) =>
                      setSectionId(Math.max(1, Number(e.target.value)))
                    }
                    min={1}
                    className="w-16 border border-black p-1 bg-white font-serif text-sm text-center"
                  />
                </div>
                <div className="flex gap-2 font-sans text-xs w-full sm:w-auto justify-end">
                  <button
                    disabled={sectionId <= 1}
                    onClick={() =>
                      setSectionId((prev) => Math.max(1, prev - 1))
                    }
                    className="border border-black px-3 py-1 disabled:opacity-30 hover:bg-stone-200"
                  >
                    &larr; Previous
                  </button>
                  <button
                    onClick={() => setSectionId((prev) => prev + 1)}
                    className="flex-1 sm:flex-none border border-black px-3 py-1 hover:bg-stone-200"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>

              <div className="border border-black bg-[#fcfbf7] p-8 shadow-inner min-h-[500px]">
                <div className="border-b border-stone-300 pb-2 mb-4 text-center">
                  <h3 className="font-serif text-2xl font-bold uppercase tracking-wide">
                    {currentBookTitle} — Section {sectionId}
                  </h3>
                  <span className="text-[10px] font-sans uppercase tracking-widest text-stone-500">
                    Canonical Text via Redis Cache
                  </span>
                </div>
                <div className="font-serif text-sm leading-loose max-h-[600px] overflow-y-auto whitespace-pre-wrap text-stone-900 pr-4">
                  {loadingOriginal ? (
                    <div className="flex items-center justify-center h-64 text-stone-400 animate-pulse italic">
                      Retrieving section from cache...
                    </div>
                  ) : originalText ? (
                    originalText
                  ) : (
                    <span className="italic text-stone-400">
                      No original text loaded for this section.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: CHARACTER POV & GRAPHRAG CONTROLS */}
          {readingMode === "pov" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar Controls */}
              <div className="lg:col-span-1 border-r border-stone-300 pr-0 lg:pr-4 space-y-4">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase tracking-wider mb-1">
                    Section / Chapter
                  </label>
                  <input
                    type="number"
                    value={sectionId}
                    onChange={(e) =>
                      setSectionId(Math.max(1, Number(e.target.value)))
                    }
                    min={1}
                    className="w-full border border-black p-2 bg-stone-50 font-serif text-sm focus:outline-none"
                  />
                </div>

                {/* Perspective Switcher */}
                <div className="border border-stone-400 p-3 bg-stone-50 space-y-3">
                  <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-amber-900">
                    Perspective Switcher
                  </h4>
                  <div>
                    <label className="block text-[11px] font-sans text-stone-600 mb-1">
                      Target Perspective{" "}
                      {loadingCharacters && (
                        <span className="text-amber-700">
                          (Loading Cache...)
                        </span>
                      )}
                    </label>
                    <select
                      value={targetCharacter}
                      onChange={(e) => setTargetCharacter(e.target.value)}
                      className="w-full border border-black p-1.5 bg-white font-serif text-xs"
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
                    className="w-full bg-[#2c2c2c] text-white font-sans text-xs font-bold uppercase tracking-widest py-2 hover:bg-stone-800 disabled:opacity-50 transition"
                  >
                    {loadingPOV
                      ? "Synthesizing POV..."
                      : "✨ Rewrite Scene in POV"}
                  </button>
                </div>

                {/* GraphRAG Intelligence */}
                <div className="border border-stone-400 p-3 bg-stone-50 space-y-3">
                  <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-indigo-900">
                    GraphRAG Intelligence
                  </h4>
                  {!graphInitialized ? (
                    <button
                      onClick={() => setGraphInitialized(true)}
                      className="w-full border border-indigo-900 text-indigo-900 font-sans text-[11px] font-bold uppercase tracking-widest py-2 hover:bg-indigo-900 hover:text-white transition"
                    >
                      🕸️ Init Narrative Graph
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[9px] font-sans bg-indigo-100 text-indigo-800 px-1.5 py-0.5 font-bold uppercase">
                        Graph Intelligence Active
                      </span>
                      <div>
                        <label className="block text-[10px] font-sans text-stone-600 mb-0.5">
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
                          className="w-full accent-indigo-900 cursor-pointer"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Trace relationship shifts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full border border-black p-1 text-xs font-serif bg-white mb-1 outline-none"
                        />
                        <button
                          onClick={handleGraphSearch}
                          disabled={loadingGraphSearch}
                          className="w-full bg-indigo-900 text-white text-[10px] py-1 font-sans font-bold uppercase disabled:opacity-50 transition hover:bg-indigo-800"
                        >
                          {loadingGraphSearch
                            ? "Searching Graph..."
                            : "Search Graph"}
                        </button>
                        {searchResult && (
                          <div className="text-[12px] mt-3 text-indigo-950 bg-indigo-50/80 p-3 border border-indigo-200 leading-relaxed max-h-60 overflow-y-auto font-serif">
                            <div className="prose prose-sm prose-indigo max-w-none">
                              <ReactMarkdown>{searchResult}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Output Box */}
              <div className="lg:col-span-2 flex flex-col border border-black bg-[#faf8f2] p-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-stone-300 pb-2 mb-4">
                  <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-amber-900">
                    🎭 {targetCharacter} Perspective (Section {sectionId})
                  </h3>
                  {isCachedResult && (
                    <span className="text-[10px] font-sans bg-emerald-100 text-emerald-800 px-2 py-0.5 uppercase font-bold">
                      ⚡ 0-Token Redis Cache HIT
                    </span>
                  )}
                </div>
                <div className="flex-1 font-serif text-sm leading-relaxed max-h-[550px] overflow-y-auto whitespace-pre-wrap text-stone-900 pr-2">
                  {loadingPOV ? (
                    <div className="flex items-center justify-center h-64 text-stone-400 animate-pulse italic">
                      Generating inner monologue via Groq & Redis Cache...
                    </div>
                  ) : responseContent ? (
                    responseContent
                  ) : (
                    <span className="italic text-stone-400">
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
    </main>
  );
}
