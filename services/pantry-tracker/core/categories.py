"""Rules-based ingredient categorization for Indian kitchen ingredients.

Categories:
- staple: Kitchen staples that are always available -- NEVER order these.
- fresh: Fresh items (vegetables, fruits, dairy, herbs) -- ALWAYS order if in today's plan.
- pantry: Shelf-stable items (dals, rice, grains) -- Smart reorder based on usage patterns.
"""

import re

# ---------------------------------------------------------------------------
# Kitchen staples -- NEVER order
# ---------------------------------------------------------------------------
KITCHEN_STAPLES: set[str] = {
    # Salt & seasoning
    "salt", "black salt", "rock salt", "sendha namak", "kala namak",
    "black pepper", "pepper", "kali mirch",
    # Basic spices (powdered)
    "turmeric", "haldi", "turmeric powder",
    "red chilli powder", "lal mirch", "chilli powder", "red chili powder",
    "cumin powder", "jeera powder",
    "coriander powder", "dhaniya powder",
    "garam masala", "kitchen king masala", "chaat masala",
    "amchur powder", "amchur",
    # Whole spices (basic)
    "cumin seeds", "jeera", "cumin",
    "mustard seeds", "rai", "sarson",
    "hing", "asafoetida",
    "ajwain", "carom seeds",
    "methi seeds", "fenugreek seeds",
    "curry leaves", "kadhi patta",
    "bay leaf", "tej patta",
    # Oils & fats
    "cooking oil", "oil", "vegetable oil", "sunflower oil", "mustard oil",
    "refined oil", "canola oil",
    "ghee", "desi ghee", "clarified butter",
    "butter",
    # Sweeteners
    "sugar", "cheeni", "jaggery", "gur", "shakkar",
    # Flours
    "atta", "wheat flour", "whole wheat flour",
    "maida", "all purpose flour", "refined flour",
    "besan", "gram flour", "chickpea flour",
    "sooji", "rava", "semolina", "suji",
    "rice flour", "chawal ka atta",
    "corn flour", "cornstarch", "makki ka atta",
    # Leavening
    "baking soda", "baking powder",
    # Acids
    "vinegar", "white vinegar",
    "lemon", "nimbu",
}

# ---------------------------------------------------------------------------
# Fresh items patterns -- ALWAYS order if in plan
# ---------------------------------------------------------------------------
FRESH_PATTERNS: list[re.Pattern[str]] = [
    # Vegetables
    re.compile(
        r"\b(tomato|tamatar|onion|pyaaz|potato|aloo|capsicum|shimla mirch|"
        r"cauliflower|gobi|cabbage|patta gobi|spinach|palak|"
        r"brinjal|baingan|eggplant|lady.?finger|bhindi|okra|"
        r"carrot|gajar|beetroot|chukandar|radish|mooli|"
        r"beans|french beans|peas|matar|green peas|"
        r"bottle gourd|lauki|ghiya|ridge gourd|tori|turai|"
        r"bitter gourd|karela|pumpkin|kaddu|"
        r"mushroom|khumbi|"
        r"sweet potato|shakarkandi|"
        r"zucchini|broccoli|"
        r"cucumber|kheera|kakdi|"
        r"corn|makai|"
        r"spring onion|hara pyaaz|"
        r"drumstick|sahjan|moringa)\b",
        re.IGNORECASE,
    ),
    # Leafy greens
    re.compile(
        r"\b(methi|fenugreek leaves|sarson ka saag|saag|"
        r"bathua|amaranth|chaulai|lettuce|"
        r"mint|pudina|coriander leaves|dhaniya|cilantro|"
        r"fresh herbs|basil|tulsi|curry leaves fresh)\b",
        re.IGNORECASE,
    ),
    # Fruits
    re.compile(
        r"\b(banana|kela|apple|seb|mango|aam|papaya|"
        r"grapes|angoor|pomegranate|anar|"
        r"watermelon|tarbooz|muskmelon|kharbooja|"
        r"guava|amrood|chiku|sapota|"
        r"orange|santra|mosambi|sweet lime|"
        r"pineapple|ananas|strawberry|kiwi|"
        r"coconut|nariyal|fresh coconut)\b",
        re.IGNORECASE,
    ),
    # Dairy
    re.compile(
        r"\b(paneer|cottage cheese|"
        r"curd|dahi|yogurt|yoghurt|"
        r"milk|doodh|"
        r"cream|malai|fresh cream|"
        r"cheese|mozzarella|cheddar|"
        r"buttermilk|chaas|"
        r"khoya|mawa)\b",
        re.IGNORECASE,
    ),
    # Fresh protein
    re.compile(
        r"\b(chicken|murgh|"
        r"mutton|gosht|lamb|"
        r"fish|machhi|machli|"
        r"prawns|jhinga|shrimp|"
        r"eggs?|anda|ande|"
        r"tofu|fresh tofu)\b",
        re.IGNORECASE,
    ),
    # Fresh garnishes
    re.compile(
        r"\b(ginger|adrak|"
        r"garlic|lahsun|"
        r"green chilli|hari mirch|green chili|"
        r"fresh lemon|lime|kairi|raw mango)\b",
        re.IGNORECASE,
    ),
]

# ---------------------------------------------------------------------------
# Pantry items patterns -- Smart reorder
# ---------------------------------------------------------------------------
PANTRY_PATTERNS: list[re.Pattern[str]] = [
    # Dals / lentils
    re.compile(
        r"\b(toor dal|arhar dal|masoor dal|moong dal|urad dal|chana dal|"
        r"rajma|kidney beans|"
        r"chole|chickpeas|kabuli chana|"
        r"lobia|black eyed peas|rongi|"
        r"dal|lentil|pulses|"
        r"soya chunks|soya bean|nutrela|"
        r"sprouts)\b",
        re.IGNORECASE,
    ),
    # Rice & grains
    re.compile(
        r"\b(basmati rice|rice|chawal|"
        r"quinoa|millets|ragi|bajra|jowar|"
        r"oats|rolled oats|"
        r"poha|flattened rice|chura|"
        r"daliya|broken wheat|bulgur|"
        r"sabudana|sago|"
        r"pasta|noodles|macaroni|"
        r"vermicelli|seviyan|sevai|"
        r"bread|pav|bun)\b",
        re.IGNORECASE,
    ),
    # Whole spices (specialty)
    re.compile(
        r"\b(saffron|kesar|"
        r"cardamom|elaichi|"
        r"cinnamon|dalchini|"
        r"cloves|laung|"
        r"star anise|chakri phool|"
        r"nutmeg|jaiphal|"
        r"mace|javitri|"
        r"fennel seeds|saunf|"
        r"poppy seeds|khus khus|"
        r"sesame seeds|til|"
        r"nigella seeds|kalonji)\b",
        re.IGNORECASE,
    ),
    # Nuts & dried fruits
    re.compile(
        r"\b(almonds|badam|"
        r"cashew|kaju|"
        r"peanuts|moongfali|"
        r"walnuts|akhrot|"
        r"pistachios|pista|"
        r"raisins|kishmish|"
        r"dates|khajoor|"
        r"dried figs|anjeer|"
        r"flax seeds|alsi|"
        r"chia seeds|"
        r"sunflower seeds|"
        r"pumpkin seeds)\b",
        re.IGNORECASE,
    ),
    # Canned / packaged
    re.compile(
        r"\b(tomato puree|tomato paste|tomato sauce|passata|"
        r"coconut milk|coconut cream|"
        r"condensed milk|"
        r"tamarind|imli|"
        r"pickle|achaar|"
        r"papad|papadum|"
        r"jam|honey|shahad|"
        r"ketchup|soy sauce|"
        r"peanut butter|"
        r"mayonnaise)\b",
        re.IGNORECASE,
    ),
    # Beverages / misc
    re.compile(
        r"\b(tea|chai patti|"
        r"coffee|"
        r"cocoa|chocolate|"
        r"milk powder)\b",
        re.IGNORECASE,
    ),
]


def classify_ingredient(name: str) -> str:
    """Classify an ingredient into fresh / pantry / staple.

    Args:
        name: Ingredient name (case-insensitive).

    Returns:
        One of "staple", "fresh", or "pantry".
    """
    normalized = name.strip().lower()

    # 1. Exact / substring match against kitchen staples
    if normalized in KITCHEN_STAPLES:
        return "staple"
    # Check if any staple is a substring (e.g., "iodised salt" contains "salt")
    for staple in KITCHEN_STAPLES:
        if staple in normalized or normalized in staple:
            return "staple"

    # 2. Pattern match against fresh items
    for pattern in FRESH_PATTERNS:
        if pattern.search(normalized):
            return "fresh"

    # 3. Pattern match against pantry items
    for pattern in PANTRY_PATTERNS:
        if pattern.search(normalized):
            return "pantry"

    # Default: treat unknown ingredients as pantry (err on side of smart-reorder)
    return "pantry"


def is_kitchen_staple(name: str) -> bool:
    """Check if an ingredient is a kitchen staple (never order)."""
    return classify_ingredient(name) == "staple"


def is_fresh(name: str) -> bool:
    """Check if an ingredient is fresh (always order if in plan)."""
    return classify_ingredient(name) == "fresh"
