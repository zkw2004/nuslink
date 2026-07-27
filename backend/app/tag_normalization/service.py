import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Protocol
from urllib import error, parse, request

from app.anthropic import AnthropicRequestError, create_message_payload, find_tool_input
from app.core.config import settings
from app.tag_normalization.schemas import (
    TagClassification,
    TagNormalizationResult,
    TagType,
)

INTEREST_CANONICAL_TAGS = (
    "AI / ML",
    "Software Engineering",
    "Data Science",
    "Cybersecurity",
    "Systems",
    "Algorithms",
    "Product Management",
    "Entrepreneurship",
    "Design",
    "Research",
    "Economics",
    "Finance",
    "Consulting",
    "Marketing",
    "Operations",
    "Public Policy",
)

PROJECT_CANONICAL_TAGS = (
    "AI Tools",
    "Backend Systems",
    "Data Analytics",
    "Design Systems",
    "EdTech",
    "FinTech",
    "HealthTech",
    "Mobile Apps",
    "Product Design",
    "Research",
    "Robotics",
    "SaaS",
    "Sustainability",
    "Web Platforms",
)

CCA_CANONICAL_TAGS = (
    "Adventure Club",
    "Arts & Culture",
    "Basketball",
    "Case Competitions",
    "Community Service",
    "Dance",
    "Debate",
    "Entrepreneurship",
    "Hackathons",
    "Music",
    "NUS Hackers",
    "Photography",
    "Sports",
    "Student Leadership",
)

INTEREST_ALIAS_MAP = {
    "ai": ("AI / ML",),
    "a i": ("AI / ML",),
    "a.i": ("AI / ML",),
    "artificial intelligence": ("AI / ML",),
    "machine learning": ("AI / ML",),
    "ml": ("AI / ML",),
    "m l": ("AI / ML",),
    "ai ml": ("AI / ML",),
    "ai / ml": ("AI / ML",),
    "ai/ml": ("AI / ML",),
    "artificial intelligence / machine learning": ("AI / ML",),
    "artificial intelligence and machine learning": ("AI / ML",),
    "software engineering": ("Software Engineering",),
    "software eng": ("Software Engineering",),
    "swe": ("Software Engineering",),
    "data science": ("Data Science",),
    "data sci": ("Data Science",),
    "cybersecurity": ("Cybersecurity",),
    "cyber security": ("Cybersecurity",),
    "product management": ("Product Management",),
    "product": ("Product Management",),
    "public policy": ("Public Policy",),
}

INTEREST_MATCH_TOKENS = {
    "ai": ("artificial_intelligence",),
    "a i": ("artificial_intelligence",),
    "a.i": ("artificial_intelligence",),
    "artificial intelligence": ("artificial_intelligence",),
    "machine learning": ("machine_learning",),
    "ml": ("machine_learning",),
    "m l": ("machine_learning",),
    "a i m l": ("artificial_intelligence", "machine_learning"),
    "ai ml": ("artificial_intelligence", "machine_learning"),
    "ai / ml": ("artificial_intelligence", "machine_learning"),
    "ai/ml": ("artificial_intelligence", "machine_learning"),
    "artificial intelligence / machine learning": (
        "artificial_intelligence",
        "machine_learning",
    ),
    "artificial intelligence and machine learning": (
        "artificial_intelligence",
        "machine_learning",
    ),
    "software engineering": ("software_engineering",),
    "software eng": ("software_engineering",),
    "swe": ("software_engineering",),
    "data science": ("data_science",),
    "data sci": ("data_science",),
    "cybersecurity": ("cybersecurity",),
    "cyber security": ("cybersecurity",),
    "product management": ("product_management",),
    "product": ("product_management",),
    "public policy": ("public_policy",),
}

SYSTEM_PROMPT = """You normalize one NUSLink user tag into a small approved taxonomy.
Choose only from the allowed canonical tags provided by the caller.
If the input does not clearly fit any allowed canonical tag, return no_match true.
Do not invent new tags. Do not paraphrase the canonical tags."""


class TagNormalizationError(Exception):
    pass


class TagNormalizationProvider(Protocol):
    def classify(self, *, tag_type: TagType, raw_tag: str) -> TagClassification: ...


class TagNormalizationMemoryStore(Protocol):
    def lookup(
        self,
        *,
        tag_type: TagType,
        normalized_raw_tag: str,
    ) -> TagNormalizationResult | None: ...

    def remember_passthrough(
        self,
        *,
        tag_type: TagType,
        raw_tag: str,
        normalized_raw_tag: str,
    ) -> None: ...


@dataclass(frozen=True)
class DeterministicMatch:
    canonical_tags: list[str]
    source: str


class SupabaseTagNormalizationMemoryStore:
    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise TagNormalizationError(
                "Supabase normalization memory is not configured."
            )

        self.base_url = f"{settings.supabase_url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_key,
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "Content-Type": "application/json",
        }

    def lookup(
        self,
        *,
        tag_type: TagType,
        normalized_raw_tag: str,
    ) -> TagNormalizationResult | None:
        query = parse.urlencode(
            {
                "select": "first_raw_tag,normalized_raw_tag,canonical_tags,"
                "resolution_source,matched",
                "tag_type": f"eq.{tag_type}",
                "normalized_raw_tag": f"eq.{normalized_raw_tag}",
                "limit": "1",
            }
        )
        api_request = request.Request(
            f"{self.base_url}/tag_normalization_memory?{query}",
            headers=self.headers,
            method="GET",
        )

        try:
            with request.urlopen(api_request, timeout=10) as response:
                rows = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            raise TagNormalizationError(
                "Supabase normalization memory lookup failed."
            ) from exc
        except error.URLError as exc:
            raise TagNormalizationError(
                "Could not reach Supabase normalization memory."
            ) from exc

        if not rows:
            return None

        row = rows[0]
        return TagNormalizationResult(
            raw_tag=row["first_raw_tag"],
            normalized_raw_tag=row["normalized_raw_tag"],
            canonical_tags=row.get("canonical_tags") or [],
            source=row["resolution_source"],
            matched=bool(row.get("matched")),
        )

    def remember_passthrough(
        self,
        *,
        tag_type: TagType,
        raw_tag: str,
        normalized_raw_tag: str,
    ) -> None:
        body = [
            {
                "tag_type": tag_type,
                "normalized_raw_tag": normalized_raw_tag,
                "first_raw_tag": raw_tag.strip(),
                "last_raw_tag": raw_tag.strip(),
                "resolution_source": "passthrough",
                "canonical_tags": [],
                "matched": False,
            }
        ]
        api_request = request.Request(
            f"{self.base_url}/tag_normalization_memory"
            f"?on_conflict=tag_type,normalized_raw_tag",
            data=json.dumps(body).encode("utf-8"),
            headers={
                **self.headers,
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )

        try:
            with request.urlopen(api_request, timeout=10):
                return
        except error.HTTPError as exc:
            raise TagNormalizationError(
                "Supabase normalization memory write failed."
            ) from exc
        except error.URLError as exc:
            raise TagNormalizationError(
                "Could not reach Supabase normalization memory."
            ) from exc


class ClaudeTagNormalizationProvider:
    provider_name = "claude"

    @property
    def model_name(self) -> str:
        return settings.anthropic_model

    def classify(self, *, tag_type: TagType, raw_tag: str) -> TagClassification:
        if not settings.anthropic_api_key:
            raise TagNormalizationError("AI tag normalization is not configured.")

        allowed_tags = get_canonical_tags(tag_type)
        schema = {
            "type": "object",
            "properties": {
                "canonical_tags": {
                    "type": "array",
                    "items": {"type": "string", "enum": list(allowed_tags)},
                    "maxItems": 3,
                },
                "no_match": {"type": "boolean"},
            },
            "required": ["canonical_tags", "no_match"],
            "additionalProperties": False,
        }

        try:
            payload = create_message_payload(
                request_type="tag normalization",
                model=settings.anthropic_model,
                api_key=settings.anthropic_api_key,
                body={
                    "model": settings.anthropic_model,
                    "max_tokens": 900,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(
                                        {
                                            "tag_type": tag_type,
                                            "raw_tag": raw_tag,
                                            "allowed_canonical_tags": list(allowed_tags),
                                        }
                                    ),
                                }
                            ],
                        },
                    ],
                    "tools": [
                        {
                            "name": "emit_tag_classification",
                            "description": "Return matching canonical tags.",
                            "input_schema": schema,
                        }
                    ],
                    "tool_choice": {
                        "type": "tool",
                        "name": "emit_tag_classification",
                    },
                },
                timeout=25,
            )
        except AnthropicRequestError as exc:
            raise TagNormalizationError(str(exc)) from exc

        try:
            classification = TagClassification.model_validate(
                find_tool_input(
                    payload,
                    request_type="tag normalization",
                    tool_name="emit_tag_classification",
                    declined_message="Claude declined the normalization request.",
                    no_output_message="Claude returned no normalization output.",
                )
            )
        except Exception as exc:
            raise TagNormalizationError(
                "The AI normalization output failed validation."
            ) from exc

        allowed_set = set(allowed_tags)
        invalid_tags = [
            tag for tag in classification.canonical_tags if tag not in allowed_set
        ]
        if invalid_tags:
            raise TagNormalizationError(
                "The AI normalization output included unsupported tags."
            )

        if classification.no_match:
            return TagClassification(canonical_tags=[], no_match=True)

        return classification



def get_canonical_tags(tag_type: TagType) -> tuple[str, ...]:
    if tag_type == "interest":
        return INTEREST_CANONICAL_TAGS
    if tag_type == "project":
        return PROJECT_CANONICAL_TAGS
    return CCA_CANONICAL_TAGS


def normalize_tags(
    *,
    tag_type: TagType,
    raw_tags: list[str],
    allow_ai_fallback: bool,
    provider: TagNormalizationProvider | None = None,
    memory_store: TagNormalizationMemoryStore | None = None,
) -> list[TagNormalizationResult]:
    results: list[TagNormalizationResult] = []

    for raw_tag in raw_tags:
        normalized_raw_tag = normalize_raw_tag(raw_tag)

        if not normalized_raw_tag:
            continue

        if memory_store is not None:
            remembered_result = memory_store.lookup(
                tag_type=tag_type,
                normalized_raw_tag=normalized_raw_tag,
            )
            if remembered_result is not None:
                results.append(
                    TagNormalizationResult(
                        raw_tag=raw_tag,
                        normalized_raw_tag=normalized_raw_tag,
                        canonical_tags=remembered_result.canonical_tags,
                        source=remembered_result.source,
                        matched=remembered_result.matched,
                    )
                )
                continue

        deterministic_match = _match_deterministically(
            tag_type=tag_type,
            normalized_raw_tag=normalized_raw_tag,
        )
        if deterministic_match is not None:
            results.append(
                TagNormalizationResult(
                    raw_tag=raw_tag,
                    normalized_raw_tag=normalized_raw_tag,
                    canonical_tags=deterministic_match.canonical_tags,
                    source="rule",
                    matched=True,
                )
            )
            continue

        if allow_ai_fallback and provider is not None:
            try:
                classification = provider.classify(
                    tag_type=tag_type,
                    raw_tag=raw_tag.strip(),
                )
            except TagNormalizationError as exc:
                if str(exc) == "AI tag normalization is not configured.":
                    classification = TagClassification(
                        canonical_tags=[],
                        no_match=True,
                    )
                else:
                    raise

            if classification.canonical_tags and not classification.no_match:
                results.append(
                    TagNormalizationResult(
                        raw_tag=raw_tag,
                        normalized_raw_tag=normalized_raw_tag,
                        canonical_tags=classification.canonical_tags,
                        source="ai",
                        matched=True,
                    )
                )
                continue

        results.append(
            TagNormalizationResult(
                raw_tag=raw_tag,
                normalized_raw_tag=normalized_raw_tag,
                canonical_tags=[],
                source="passthrough",
                matched=False,
            )
        )
        if memory_store is not None:
            memory_store.remember_passthrough(
                tag_type=tag_type,
                raw_tag=raw_tag,
                normalized_raw_tag=normalized_raw_tag,
            )

    return results


def normalize_raw_tag(raw_tag: str) -> str | None:
    simplified_tag = _simplify_tag(raw_tag)
    normalized_tag = re.sub(r"[^a-z0-9/+ ]", " ", simplified_tag)
    normalized_tag = re.sub(r"\s+", " ", normalized_tag).strip()
    return normalized_tag or None


def normalize_interest_tags_for_matching(interests: list[str]) -> set[str]:
    normalized_tags: set[str] = set()

    for interest in interests:
        normalized_tags.update(_expand_interest_match_tokens(interest))

    return normalized_tags


def normalize_profile_tags_for_matching(tags: list[str]) -> set[str]:
    normalized_tags: set[str] = set()

    for tag in tags:
        normalized_tag = normalize_raw_tag(tag)
        if normalized_tag:
            normalized_tags.add(normalized_tag)

    return normalized_tags


def _match_deterministically(
    *,
    tag_type: TagType,
    normalized_raw_tag: str,
) -> DeterministicMatch | None:
    canonical_tags = get_canonical_tags(tag_type)
    canonical_by_key = {_canonical_key(tag): tag for tag in canonical_tags}

    exact_match = canonical_by_key.get(normalized_raw_tag)
    if exact_match:
        return DeterministicMatch(canonical_tags=[exact_match], source="rule")

    if tag_type == "interest":
        alias_match = INTEREST_ALIAS_MAP.get(normalized_raw_tag)
        if alias_match:
            return DeterministicMatch(canonical_tags=list(alias_match), source="rule")

    best_candidate: str | None = None
    best_score = 0.0
    second_best_score = 0.0

    for canonical_tag in canonical_tags:
        candidate_key = _canonical_key(canonical_tag)
        score = SequenceMatcher(
            None,
            normalized_raw_tag,
            candidate_key,
        ).ratio()
        if normalized_raw_tag in candidate_key or candidate_key in normalized_raw_tag:
            score = max(score, 0.9)

        if score > best_score:
            second_best_score = best_score
            best_score = score
            best_candidate = canonical_tag
        elif score > second_best_score:
            second_best_score = score

    if (
        best_candidate is not None
        and best_score >= 0.92
        and best_score - second_best_score >= 0.08
    ):
        return DeterministicMatch(canonical_tags=[best_candidate], source="rule")

    return None


def _canonical_key(canonical_tag: str) -> str:
    return normalize_raw_tag(canonical_tag) or canonical_tag.strip().lower()


def _simplify_tag(raw_tag: str) -> str:
    simplified = re.sub(r"\s+", " ", raw_tag.strip().lower()).strip()
    return simplified.replace("&", "and")


def _expand_interest_match_tokens(raw_tag: str) -> set[str]:
    normalized_tag = normalize_raw_tag(raw_tag)
    if not normalized_tag:
        return set()

    if normalized_tag in INTEREST_MATCH_TOKENS:
        return set(INTEREST_MATCH_TOKENS[normalized_tag])

    return {normalized_tag}


def _find_output_text(payload: object) -> str:
    if not isinstance(payload, dict):
        raise TagNormalizationError(
            "The AI provider returned an invalid normalization response."
        )

    candidates = payload.get("candidates")
    if isinstance(candidates, list):
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            if candidate.get("finishReason") in {"SAFETY", "RECITATION"}:
                raise TagNormalizationError(
                    "The AI provider declined the normalization request."
                )
            content = candidate.get("content")
            if not isinstance(content, dict):
                continue
            parts = content.get("parts")
            if not isinstance(parts, list):
                continue
            for part in parts:
                if not isinstance(part, dict):
                    continue
                text = part.get("text")
                if isinstance(text, str) and text:
                    return text

    raise TagNormalizationError("The AI provider returned no normalization output.")
