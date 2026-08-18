import json
import re
import unicodedata
import sys
from flask import Flask, jsonify, request

app = Flask(__name__)


def normalize_text(value):
    if not isinstance(value, str) or not value.strip():
        return None
    value = unicodedata.normalize("NFD", value.strip().casefold())
    return "".join(char for char in value if unicodedata.category(char) != "Mn")


def normalize_email(value):
    return normalize_text(value)


def normalize_phone(value):
    digits = re.sub(r"\D", "", value or "")
    return digits if digits else None


def display_contact(item):
    return {
        "id": item.get("id"),
        "name": item.get("name", ""),
        "email": item.get("email"),
        "phone": item.get("phone"),
        "neighborhood": item.get("neighborhood"),
    }


@app.post("/deduplicate")
def deduplicate():
    payload = request.get_json(silent=True) or {}
    existing = payload.get("existing", [])
    incoming = payload.get("incoming", [])
    by_email, by_phone, by_name_neighborhood = {}, {}, {}
    for contact in existing:
        email = normalize_email(contact.get("email"))
        phone = normalize_phone(contact.get("phone"))
        name = normalize_text(contact.get("name"))
        neighborhood = normalize_text(contact.get("neighborhood"))
        if email:
            by_email.setdefault(email, []).append(contact)
        if phone:
            by_phone.setdefault(phone, []).append(contact)
        if name and neighborhood:
            by_name_neighborhood.setdefault((name, neighborhood), []).append(contact)

    new_contacts, updates, candidates = [], [], []
    seen_emails, seen_phones = set(), set()
    for item in incoming:
        email = normalize_email(item.get("email"))
        phone = normalize_phone(item.get("phone"))
        matches, reasons = [], []
        for contact in (by_email.get(email, []) if email else []):
            if contact not in matches:
                matches.append(contact)
                reasons.append("E-mail já cadastrado na campanha")
        for contact in (by_phone.get(phone, []) if phone else []):
            if contact not in matches:
                matches.append(contact)
            reasons.append("Telefone já cadastrado na campanha")
        if matches:
            updates.append({"row": item.get("row"), "name": item.get("name", ""), "existing": display_contact(matches[0]), "reasons": reasons})
            continue
        intra_reasons = []
        if email and email in seen_emails:
            intra_reasons.append("E-mail duplicado dentro deste arquivo")
        if phone and phone in seen_phones:
            intra_reasons.append("Telefone duplicado dentro deste arquivo")
        if intra_reasons:
            candidates.append({"row": item.get("row"), "name": item.get("name", ""), "existing": None, "reasons": intra_reasons})
            continue
        name = normalize_text(item.get("name"))
        neighborhood = normalize_text(item.get("neighborhood"))
        possible = by_name_neighborhood.get((name, neighborhood), []) if name and neighborhood else []
        if possible:
            candidates.append({"row": item.get("row"), "name": item.get("name", ""), "existing": display_contact(possible[0]), "reasons": ["Possível duplicidade por nome e bairro"]})
            continue
        new_contacts.append(item)
        if email:
            seen_emails.add(email)
        if phone:
            seen_phones.add(phone)

    return jsonify({"newContacts": new_contacts, "updates": updates, "candidates": candidates})


if __name__ == "__main__":
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        with app.test_client() as client:
            response = client.post("/deduplicate", json=payload)
            sys.stdout.write(json.dumps(response.get_json()))
    except Exception as error:
        sys.stderr.write(str(error))
        sys.exit(1)
