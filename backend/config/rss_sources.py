"""External RSS feed source configuration."""

RSS_FEEDS: dict[str, str] = {
    # World / Global News
    "bbc_world": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "cnn_world": "http://rss.cnn.com/rss/edition_world.rss",
    "nytimes_world": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "guardian_world": "https://www.theguardian.com/world/rss",

    # General / Top Stories
    "nbc_top_stories": "https://feeds.nbcnews.com/nbcnews/public/news",
    "abc_international": "https://abcnews.com/abcnews/internationalheadlines",

    # Technology & Innovation
    "techcrunch": "https://techcrunch.com/feed/",
    "wired": "https://www.wired.com/feed/rss",

    # Business & Economy
    "financial_times": "https://www.ft.com/rss/home/international",

    # Science & Research
    "sciencedaily": "https://www.sciencedaily.com/rss/all.xml",
}

# Source groups used by the AI Brief service to select articles.
WORLD_SOURCES: list[str] = [
    "bbc_world",
    "cnn_world",
    "nytimes_world",
    "guardian_world",
    "nbc_top_stories",
    "abc_international",
    "financial_times",
]

TECH_SOURCES: list[str] = [
    "techcrunch",
    "wired",
    "sciencedaily",
]

BRIEF_ARTICLES_PER_GROUP: int = 10
