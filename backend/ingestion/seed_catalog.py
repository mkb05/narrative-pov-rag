import os
import json
import requests
from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv()

# Connect to Upstash Redis
try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_client.ping()
except Exception as e:
    print(f"Failed to connect to Upstash Redis: {e}")
    exit(1)

GUTENDEX_API_URL = "https://gutendex.com/books"
CATEGORIES = ["fiction", "romance", "mystery", "adventure", "horror"]

# Massive Curated Fallback Catalog (Used instantly if API is down)
CURATED_CLASSICS = [
    {"id": "frankenstein", "title": "Frankenstein", "category": "horror", "author": "Mary Shelley", "desc": "A gothic masterpiece exploring ambition, creation, and isolation.", "gutenberg_id": 84},
    {"id": "pride_and_prejudice", "title": "Pride and Prejudice", "category": "romance", "author": "Jane Austen", "desc": "A classic comedy of manners concerning issues of upbringing and marriage.", "gutenberg_id": 1342},
    {"id": "dracula", "title": "Dracula", "category": "horror", "author": "Bram Stoker", "desc": "The iconic epistolary novel introducing the legendary vampire count.", "gutenberg_id": 345},
    {"id": "the_adventures_of_sherlock_holmes", "title": "The Adventures of Sherlock Holmes", "category": "mystery", "author": "Arthur Conan Doyle", "desc": "Twelve short stories featuring the brilliant consulting detective.", "gutenberg_id": 1661},
    {"id": "moby_dick", "title": "Moby Dick", "category": "adventure", "author": "Herman Melville", "desc": "The epic tale of Captain Ahab's obsessive hunt for the white whale.", "gutenberg_id": 2701},
    {"id": "jane_eyre", "title": "Jane Eyre", "category": "romance", "author": "Charlotte Brontë", "desc": "Follows the emotions and experiences of its eponymous heroine as she grows up.", "gutenberg_id": 1260},
    {"id": "the_time_machine", "title": "The Time Machine", "category": "science fiction", "author": "H.G. Wells", "desc": "A seminal science fiction novella that popularized the concept of time travel.", "gutenberg_id": 35},
    {"id": "alice_in_wonderland", "title": "Alice in Wonderland", "category": "fantasy", "author": "Lewis Carroll", "desc": "A young girl falls down a rabbit hole into a fantasy world.", "gutenberg_id": 11},
    {"id": "the_great_gatsby", "title": "The Great Gatsby", "category": "fiction", "author": "F. Scott Fitzgerald", "desc": "A tragic story of jazz, wealth, and the impossible American Dream.", "gutenberg_id": 64317},
    {"id": "crime_and_punishment", "title": "Crime and Punishment", "category": "fiction", "author": "Fyodor Dostoevsky", "desc": "A psychological drama about a young student's moral dilemma after committing a crime.", "gutenberg_id": 2554},
    {"id": "the_picture_of_dorian_gray", "title": "The Picture of Dorian Gray", "category": "fiction", "author": "Oscar Wilde", "desc": "A young man stays forever youthful while his portrait ages and decays.", "gutenberg_id": 174},
    {"id": "wuthering_heights", "title": "Wuthering Heights", "category": "romance", "author": "Emily Brontë", "desc": "A dark, passionate tale of love and revenge on the Yorkshire moors.", "gutenberg_id": 768},
    {"id": "the_count_of_monte_cristo", "title": "The Count of Monte Cristo", "category": "adventure", "author": "Alexandre Dumas", "desc": "A thrilling tale of wrongful imprisonment and spectacular revenge.", "gutenberg_id": 1184},
    {"id": "a_tale_of_two_cities", "title": "A Tale of Two Cities", "category": "history", "author": "Charles Dickens", "desc": "A story of love and sacrifice set against the backdrop of the French Revolution.", "gutenberg_id": 98},
    {"id": "les_miserables", "title": "Les Misérables", "category": "fiction", "author": "Victor Hugo", "desc": "An epic story of injustice, heroism, and love in 19th-century France.", "gutenberg_id": 135},
    {"id": "the_odyssey", "title": "The Odyssey", "category": "poetry", "author": "Homer", "desc": "The epic journey of Odysseus as he attempts to return home after the Trojan War.", "gutenberg_id": 1727},
    {"id": "the_iliad", "title": "The Iliad", "category": "poetry", "author": "Homer", "desc": "The legendary tale of the wrath of Achilles during the Trojan War.", "gutenberg_id": 6130},
    {"id": "don_quixote", "title": "Don Quixote", "category": "fiction", "author": "Miguel de Cervantes", "desc": "The comedic and tragic adventures of a man who believes he is a knight.", "gutenberg_id": 996},
    {"id": "war_and_peace", "title": "War and Peace", "category": "history", "author": "Leo Tolstoy", "desc": "A sweeping historical epic chronicling the French invasion of Russia.", "gutenberg_id": 2600},
    {"id": "the_brothers_karamazov", "title": "The Brothers Karamazov", "category": "fiction", "author": "Fyodor Dostoevsky", "desc": "A passionate philosophical novel exploring faith, doubt, and morality.", "gutenberg_id": 28054},
    {"id": "anna_karenina", "title": "Anna Karenina", "category": "romance", "author": "Leo Tolstoy", "desc": "A complex exploration of love, family, and Russian society.", "gutenberg_id": 1399},
    {"id": "the_awakening", "title": "The Awakening", "category": "fiction", "author": "Kate Chopin", "desc": "A landmark work of early feminism exploring a woman's desires.", "gutenberg_id": 161},
    {"id": "middlemarch", "title": "Middlemarch", "category": "fiction", "author": "George Eliot", "desc": "A masterly study of provincial life in 19th-century England.", "gutenberg_id": 145},
    {"id": "heart_of_darkness", "title": "Heart of Darkness", "category": "adventure", "author": "Joseph Conrad", "desc": "A harrowing journey up the Congo River into the depths of human nature.", "gutenberg_id": 219},
    {"id": "the_scarlet_letter", "title": "The Scarlet Letter", "category": "fiction", "author": "Nathaniel Hawthorne", "desc": "A tale of sin, punishment, and redemption in Puritan New England.", "gutenberg_id": 25344},
    {"id": "the_turn_of_the_screw", "title": "The Turn of the Screw", "category": "horror", "author": "Henry James", "desc": "A masterful psychological ghost story.", "gutenberg_id": 209},
    {"id": "the_importance_of_being_earnest", "title": "The Importance of Being Earnest", "category": "drama", "author": "Oscar Wilde", "desc": "A trivial comedy for serious people.", "gutenberg_id": 844},
    {"id": "the_war_of_the_worlds", "title": "The War of the Worlds", "category": "science fiction", "author": "H.G. Wells", "desc": "The classic story of a Martian invasion of Earth.", "gutenberg_id": 36},
    {"id": "the_call_of_the_wild", "title": "The Call of the Wild", "category": "adventure", "author": "Jack London", "desc": "A gripping tale of a dog's survival in the harsh Yukon.", "gutenberg_id": 215},
    {"id": "the_wind_in_the_willows", "title": "The Wind in the Willows", "category": "fiction", "author": "Kenneth Grahame", "desc": "A beloved children's classic featuring anthropomorphic animals.", "gutenberg_id": 289}
]

def seed_catalog():
    print("[Seed Script] Attempting to fetch live books from Gutendex API...")
    catalog = []
    gutenberg_map = {}
    seen_ids = set()

    # Try fetching from the live API with a short timeout so we don't hang forever
    api_success = False
    for category in CATEGORIES:
        try:
            # We use a 5-second timeout; if Gutendex is down, we quickly move to the curated list
            res = requests.get(f"{GUTENDEX_API_URL}?languages=en&topic={category}", timeout=5)
            if res.status_code == 200:
                api_success = True
                books = res.json().get("results", [])[:5]
                
                for b in books:
                    g_id = b["id"]
                    if g_id in seen_ids:
                        continue
                    seen_ids.add(g_id)

                    title = b["title"].split("\n")[0].strip()
                    title_slug = title.lower().split(",")[0].split(":")[0].strip().replace(" ", "_").replace("'", "").replace("-", "_")

                    authors = b.get("authors", [])
                    author_name = "Unknown"
                    if authors:
                        raw_name = authors[0]["name"]
                        if "," in raw_name:
                            parts = raw_name.split(",")
                            author_name = f"{parts[1].strip()} {parts[0].strip()}"
                        else:
                            author_name = raw_name

                    catalog.append({
                        "id": title_slug,
                        "title": title,
                        "category": category,
                        "author": author_name,
                        "desc": f"A classic work of {category} by {author_name}.",
                        "gutenberg_id": g_id
                    })
                    gutenberg_map[title_slug] = g_id
        except Exception:
            pass # We will rely on the curated fallback below

    # If the API timed out or failed, we inject the massive curated list!
    print("\n[Seed Script] Injecting curated classic books...")
    for item in CURATED_CLASSICS:
        if item["id"] not in gutenberg_map:
            # Drop the gutenberg_id from the frontend payload to save bytes
            frontend_item = {k: v for k, v in item.items() if k != "gutenberg_id"}
            catalog.append(frontend_item)
            gutenberg_map[item["id"]] = item["gutenberg_id"]

    print(f"\n[Seed Script] Uploading {len(catalog)} rich books to Upstash Redis...")
    
    # Store in Redis
    redis_client.set("app:book_catalog", json.dumps(catalog))
    redis_client.set("app:gutenberg_map", json.dumps(gutenberg_map))
    
    print("[Seed Script] ✅ Successfully seeded massive catalog into Upstash Redis!")

if __name__ == "__main__":
    seed_catalog()