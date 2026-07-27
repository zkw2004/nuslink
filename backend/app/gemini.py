import json
import logging
from urllib import error, request

logger = logging.getLogger(__name__)


class GeminiRequestError(Exception):
    pass


def to_gemini_response_schema(schema: dict[str, object]) -> dict[str, object]:
    """Convert JSON-schema conveniences into Gemini responseSchema format."""

    return _convert_schema_node(schema)


def _convert_schema_node(schema: object) -> dict[str, object]:
    if not isinstance(schema, dict):
        return {}

    converted: dict[str, object] = {}
    nullable = False

    schema_type = schema.get("type")
    if isinstance(schema_type, list):
        non_null_types = [item for item in schema_type if item != "null"]
        nullable = len(non_null_types) != len(schema_type)
        if len(non_null_types) == 1 and isinstance(non_null_types[0], str):
            converted["type"] = non_null_types[0]
    elif schema_type == "null":
        converted["type"] = "string"
        nullable = True
    elif isinstance(schema_type, str):
        converted["type"] = schema_type

    any_of = schema.get("anyOf")
    if isinstance(any_of, list):
        non_null_options = [
            option
            for option in any_of
            if not (isinstance(option, dict) and option.get("type") == "null")
        ]
        nullable = nullable or len(non_null_options) != len(any_of)
        if len(non_null_options) == 1:
            converted.update(_convert_schema_node(non_null_options[0]))
        else:
            converted["anyOf"] = [
                _convert_schema_node(option) for option in non_null_options
            ]

    for key in (
        "title",
        "description",
        "format",
        "enum",
        "minimum",
        "maximum",
        "minItems",
        "maxItems",
        "required",
    ):
        if key in schema:
            converted[key] = schema[key]

    properties = schema.get("properties")
    if isinstance(properties, dict):
        converted["properties"] = {
            key: _convert_schema_node(value) for key, value in properties.items()
        }

    items = schema.get("items")
    if isinstance(items, dict):
        converted["items"] = _convert_schema_node(items)

    if nullable:
        converted["nullable"] = True

    return converted


def generate_content_payload(
    *,
    request_type: str,
    model: str,
    api_key: str,
    body: dict[str, object],
    timeout: int,
) -> dict[str, object]:
    encoded_body = json.dumps(body).encode("utf-8")
    api_request = request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=encoded_body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(api_request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = read_http_error_detail(exc)
        logger.warning(
            "Gemini %s request failed with HTTP %s for model %s: %s",
            request_type,
            exc.code,
            model,
            detail,
        )
        raise GeminiRequestError(
            f"Gemini {request_type} request failed with HTTP {exc.code}: {detail}"
        ) from exc
    except (error.URLError, TimeoutError) as exc:
        logger.warning(
            "Gemini %s request could not reach model %s: %s",
            request_type,
            model,
            exc,
        )
        raise GeminiRequestError(
            f"Gemini {request_type} request could not reach the provider."
        ) from exc
    except json.JSONDecodeError as exc:
        logger.warning(
            "Gemini %s request returned invalid JSON for model %s",
            request_type,
            model,
        )
        raise GeminiRequestError(
            f"Gemini {request_type} request returned an invalid JSON response."
        ) from exc


def read_http_error_detail(exc: error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8")
    except Exception:
        body = ""

    if not body:
        return "No response body."

    return body[:800]


def find_output_text(
    payload: object,
    *,
    request_type: str,
    declined_message: str,
    no_output_message: str,
) -> str:
    if not isinstance(payload, dict):
        raise GeminiRequestError(f"Gemini {request_type} returned an invalid response.")

    candidates = payload.get("candidates")
    if isinstance(candidates, list):
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue

            finish_reason = candidate.get("finishReason")
            if finish_reason in {"SAFETY", "RECITATION"}:
                logger.warning(
                    "Gemini %s request was declined with finish reason %s",
                    request_type,
                    finish_reason,
                )
                raise GeminiRequestError(declined_message)

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

    raise GeminiRequestError(no_output_message)
