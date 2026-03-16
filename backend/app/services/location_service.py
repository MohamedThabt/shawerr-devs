"""Location extraction and geocoding service using spaCy NER + GeoPy."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Optional

import spacy
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

from config.logger import get_logger
from config.settings import settings

logger = get_logger()

# Specificity ranks – lower number = more specific = better.
LOCATION_RANKS: dict[str, int] = {
    "city": 1,
    "region": 2,
    "country": 3,
}

# Nominatim addresstype values mapped to our rank categories.
_ADDRESSTYPE_MAP: dict[str, str] = {
    "city": "city",
    "town": "city",
    "village": "city",
    "hamlet": "city",
    "municipality": "city",
    "state": "region",
    "province": "region",
    "region": "region",
    "county": "region",
    "state_district": "region",
    "country": "country",
}


# Common false positives from spaCy NER that are not real locations.
_LOCATION_STOPWORDS: set[str] = {
    "AI", "GPT", "WIRED", "Chrome", "Nvidia", "Meta", "Tesla",
    "Google", "Amazon", "Apple", "Adobe", "YouTube",
    "Buy", "Button", "DOGE", "Mars",
}

# Normalise common abbreviations/short names to full geocodable names.
_NAME_NORMALIZATION: dict[str, str] = {
    "US": "United States",
    "U.S.": "United States",
    "U.S": "United States",
    "USA": "United States",
    "UK": "United Kingdom",
    "U.K.": "United Kingdom",
    "UAE": "United Arab Emirates",
    "EU": "European Union",
    "Mideast": "Middle East",
}

_CACHE_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "geocode_cache.json"


class LocationExtractorService:
    """Extract locations from text, geocode them, and pick the most specific one."""

    # Initialize NLP, geocoder, and persistent geocode cache components.
    def __init__(self) -> None:
        try:
            self._nlp = spacy.load(settings.spacy_model)
            logger.info("spacy_model_loaded", extra={"location_name": settings.spacy_model})
        except OSError:
            logger.warning(
                "spacy_model_not_found",
                extra={"location_name": settings.spacy_model},
            )
            self._nlp = None

        self._geocoder = Nominatim(
            user_agent="world-monitor/1.0 (github.com/world-monitor)",
            timeout=settings.geopy_timeout,
        )
        self._geocode = RateLimiter(
            self._geocoder.geocode,
            min_delay_seconds=1.5,
            max_retries=5,
            error_wait_seconds=10.0,
            return_value_on_exception=None,
        )
        self._cache_lock = threading.Lock()
        self._geocode_cache: dict[str, Optional[dict]] = self._load_cache()

    # ------------------------------------------------------------------
    # Persistent disk cache
    # ------------------------------------------------------------------

    @staticmethod
    # Load cached geocoding results from disk into memory.
    def _load_cache() -> dict[str, Optional[dict]]:
        """Load geocode cache from disk, returning empty dict on failure."""
        if _CACHE_FILE.exists():
            try:
                data = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
                logger.info("geocode_cache_loaded", extra={"entries": len(data)})
                return data
            except Exception:
                logger.exception("geocode_cache_load_failed")
        return {}

    # Persist the current in-memory geocode cache to disk.
    def _save_cache(self) -> None:
        """Persist the in-memory geocode cache to disk."""
        try:
            _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            _CACHE_FILE.write_text(
                json.dumps(self._geocode_cache, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception:
            logger.exception("geocode_cache_save_failed")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    # Extract unique location candidates from text via spaCy entities.
    def extract_locations(self, text: str) -> list[str]:
        """Return unique location names found in *text* via spaCy NER."""
        if self._nlp is None:
            return []
        try:
            doc = self._nlp(text)
            locations = list(dict.fromkeys(
                ent.text.strip()
                for ent in doc.ents
                if ent.label_ in ("GPE", "LOC")
                and ent.text.strip() not in _LOCATION_STOPWORDS
                and len(ent.text.strip()) > 1
            ))
            logger.debug(
                "locations_extracted",
                extra={"locations_found": len(locations)},
            )
            return locations
        except Exception:
            logger.exception("location_extraction_failed")
            return []

    # Resolve one location name to coordinates and specificity metadata.
    def geocode_location(self, name: str) -> Optional[dict]:
        """Geocode a single location name and return a ranked dict or ``None``."""
        query = _NAME_NORMALIZATION.get(name, name)

        with self._cache_lock:
            if query in self._geocode_cache:
                logger.debug("geocode_cache_hit", extra={"location_name": name})
                return self._geocode_cache[query]

        try:
            result = self._geocode(query, addressdetails=True, language="en")
            if result is None:
                logger.debug(
                    "geocode_no_result",
                    extra={"location_name": name, "geocode_status": "not_found"},
                )
                with self._cache_lock:
                    self._geocode_cache[query] = None
                    self._save_cache()
                return None

            raw_type = result.raw.get("addresstype", "")
            loc_type = _ADDRESSTYPE_MAP.get(raw_type, "country")
            rank = LOCATION_RANKS.get(loc_type, 3)

            info = {
                "name": name,
                "lat": result.latitude,
                "lon": result.longitude,
                "type": loc_type,
                "rank": rank,
            }

            logger.debug(
                "geocode_success",
                extra={
                    "location_name": name,
                    "location_type": loc_type,
                    "location_rank": rank,
                    "geocode_status": "ok",
                },
            )
            with self._cache_lock:
                self._geocode_cache[query] = info
                self._save_cache()
            return info

        except (GeocoderTimedOut, GeocoderServiceError):
            logger.warning(
                "geocode_service_error",
                extra={"location_name": name, "geocode_status": "error"},
            )
            with self._cache_lock:
                self._geocode_cache[query] = None
                self._save_cache()
            return None
        except Exception:
            logger.exception(
                "geocode_unexpected_error",
                extra={"location_name": name, "geocode_status": "error"},
            )
            with self._cache_lock:
                self._geocode_cache[query] = None
                self._save_cache()
            return None

    # Choose the most specific valid location from a list of names.
    def choose_best_location(self, locations: list[str]) -> Optional[dict]:
        """Geocode all *locations* and return the most specific one."""
        best: Optional[dict] = None

        for name in locations:
            info = self.geocode_location(name)
            if info is None:
                continue
            if best is None or info["rank"] < best["rank"]:
                best = info

        if best:
            logger.debug(
                "best_location_selected",
                extra={
                    "location_name": best["name"],
                    "location_type": best["type"],
                    "location_rank": best["rank"],
                },
            )
        else:
            logger.debug("no_location_resolved")

        return best

    # Run extraction and geocoding to return a single best location.
    def extract_best_location_from_text(self, text: str) -> Optional[dict]:
        """Full pipeline: extract → geocode → select best location."""
        locations = self.extract_locations(text)
        if not locations:
            return None
        return self.choose_best_location(locations)
