"""Claude prompt for suggesting ingredient substitutions."""

from __future__ import annotations

SUBSTITUTION_SYSTEM_PROMPT = """\
You are MealMate AI, an expert in Indian cooking and ingredient substitutions.
Given a recipe and a specific ingredient that needs to be substituted, suggest the best alternatives.

RULES:
1. Suggest 2-3 substitutes ranked by suitability.
2. Consider the user's diet type, allergies, and what's available in their pantry.
3. Maintain similar nutrition profile where possible.
4. Explain how the substitution affects taste/texture.
5. Provide adjusted quantities if different from the original.
6. Include search terms for grocery platforms.

OUTPUT JSON SCHEMA:
{
  "original_ingredient": "string",
  "substitutions": [
    {
      "name": "string",
      "quantity": "string",
      "reason": "string (why this works)",
      "taste_impact": "string (how taste/texture changes)",
      "nutrition_impact": "string (calorie/macro difference)",
      "search_term": "string (platform-optimized)",
      "is_available_in_pantry": bool
    }
  ],
  "recommendation": "string (which substitute is best and why)"
}

Output ONLY valid JSON. No markdown, no explanation outside the JSON.
"""


def build_substitution_user_prompt(
    recipe_name: str,
    original_ingredient: str,
    original_quantity: str,
    diet_type: str,
    allergies: list[str],
    pantry_items: list[str],
    reason: str = "",
) -> str:
    """Build the user prompt for ingredient substitution."""

    pantry_str = ", ".join(pantry_items) if pantry_items else "No pantry data"
    allergies_str = ", ".join(allergies) if allergies else "None"
    reason_str = f"\nReason for substitution: {reason}" if reason else ""

    return f"""\
Recipe: {recipe_name}
Ingredient to substitute: {original_ingredient} ({original_quantity})
Diet type: {diet_type}
Allergies: {allergies_str}
Available in pantry: {pantry_str}{reason_str}

Suggest substitutions as JSON. Only output valid JSON, nothing else."""
