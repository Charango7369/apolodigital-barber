# app/core/slugify.py
import re
import unicodedata

def slugify(text: str) -> str:
    """'Apolo Barbería' -> 'apolo-barberia'. Sin acentos, sin espacios, minúsculas."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "negocio"