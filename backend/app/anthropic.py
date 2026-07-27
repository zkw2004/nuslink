import json
import logging
from urllib import error, request

logger = logging.getLogger(__name__)

ANTHROPIC_API_VERSION = "2023-06-01"


class AnthropicRequestError(Exception):
    pass


def create_message_payload(
    *,
    request_type: str,
    model: str,
    api_key: str,
    body: dict[str, object],
    timeout: int,
) -> dict[str, object]:
    encoded_body = json.dumps(body).encode("utf-8")
    api_request = request.Request(
        "https://api.anthropic.com/v1/messages",
        data=encoded_body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_API_VERSION,
        },
        method="POST",
    )

    try:
        with request.urlopen(api_request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = read_http_error_detail(exc)
        logger.warning(
            "Claude %s request failed with HTTP %s for model %s: %s",
            request_type,
            exc.code,
            model,
            detail,
        )
        raise AnthropicRequestError(
            f"Claude {request_type} request failed with HTTP {exc.code}: {detail}"
        ) from exc
    except (error.URLError, TimeoutError) as exc:
        logger.warning(
            "Claude %s request could not reach model %s: %s",
            request_type,
            model,
            exc,
        )
        raise AnthropicRequestError(
            f"Claude {request_type} request could not reach the provider."
        ) from exc
    except json.JSONDecodeError as exc:
        logger.warning(
            "Claude %s request returned invalid JSON for model %s",
            request_type,
            model,
        )
        raise AnthropicRequestError(
            f"Claude {request_type} request returned an invalid JSON response."
        ) from exc


def read_http_error_detail(exc: error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8")
    except Exception:
        body = ""

    if not body:
        return "No response body."

    return body[:800]


def find_tool_input(
    payload: object,
    *,
    request_type: str,
    tool_name: str,
    declined_message: str,
    no_output_message: str,
) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise AnthropicRequestError(f"Claude {request_type} returned an invalid response.")

    if payload.get("stop_reason") == "refusal":
        raise AnthropicRequestError(declined_message)

    content = payload.get("content")
    if isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            if block.get("type") != "tool_use" or block.get("name") != tool_name:
                continue
            tool_input = block.get("input")
            if isinstance(tool_input, dict):
                return tool_input

    raise AnthropicRequestError(no_output_message)
