import json
import logging
from urllib import error, request

logger = logging.getLogger(__name__)


class GeminiRequestError(Exception):
    pass


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
