"""Anthropic SDK wrapper with prompt caching, retries, and JSON parsing."""

from __future__ import annotations

import json
import logging
from typing import Any

import anthropic

from config import settings

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Wrapper around the Anthropic Python SDK with caching and retry logic."""

    def __init__(self) -> None:
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self._model = settings.claude_model
        self._max_tokens = settings.claude_max_tokens
        self._max_retries = settings.claude_max_retries

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """Send a request to Claude and parse the JSON response.

        Uses prompt caching on the system prompt for cost savings.
        Retries up to max_retries times on invalid JSON.
        """
        max_tokens = max_tokens or self._max_tokens
        last_error: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            try:
                logger.info(
                    "Claude API call attempt %d/%d (model=%s)",
                    attempt, self._max_retries, self._model,
                )

                response = self._client.messages.create(
                    model=self._model,
                    max_tokens=max_tokens,
                    system=[
                        {
                            "type": "text",
                            "text": system_prompt,
                            "cache_control": {"type": "ephemeral"},
                        }
                    ],
                    messages=[
                        {"role": "user", "content": user_prompt},
                    ],
                )

                raw_text = self._extract_text(response)
                parsed = self._parse_json(raw_text)

                logger.info(
                    "Claude API success on attempt %d. Input tokens: %d, Output tokens: %d",
                    attempt,
                    response.usage.input_tokens,
                    response.usage.output_tokens,
                )

                return parsed

            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning(
                    "Invalid JSON from Claude on attempt %d: %s",
                    attempt, str(exc)[:200],
                )
                # On retry, append a correction hint to the user prompt
                if attempt < self._max_retries:
                    user_prompt = (
                        user_prompt
                        + "\n\nIMPORTANT: Your previous response was not valid JSON. "
                        "Please output ONLY valid JSON with no markdown formatting, "
                        "no code fences, and no text outside the JSON object."
                    )
            except anthropic.APIError as exc:
                last_error = exc
                logger.error(
                    "Anthropic API error on attempt %d: %s", attempt, str(exc)[:300]
                )
                if attempt >= self._max_retries:
                    break
            except Exception as exc:
                last_error = exc
                logger.error(
                    "Unexpected error on attempt %d: %s", attempt, str(exc)[:300]
                )
                if attempt >= self._max_retries:
                    break

        raise RuntimeError(
            f"Failed to get valid JSON from Claude after {self._max_retries} attempts"
        ) from last_error

    @staticmethod
    def _extract_text(response: anthropic.types.Message) -> str:
        """Extract text content from a Claude response."""
        parts: list[str] = []
        for block in response.content:
            if hasattr(block, "text"):
                parts.append(block.text)
        return "\n".join(parts).strip()

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        """Parse JSON from Claude's response, stripping markdown fences if present."""
        cleaned = text.strip()

        # Strip markdown code fences
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first line (```json or ```) and last line (```)
            if lines[-1].strip() == "```":
                lines = lines[1:-1]
            else:
                lines = lines[1:]
            cleaned = "\n".join(lines).strip()

        return json.loads(cleaned)


# Module-level singleton
claude_client = ClaudeClient()
