import json
import re
import sys
from flask import Flask, jsonify, request

app = Flask(__name__)


def normalize_email(value):
    return value.strip().casefold() if isinstance(value, str) and value.strip() else None


def normalize_phone(value):
    digits = re.sub(r"\D", "", value or "")
    return digits if digits else None


@app.post("/deduplicate")
def deduplicate():
    payload = request.get_json(silent=True) or {}
    existing = payload.get("existing", [])
    incoming = payload.get("incoming", [])
    existing_emails = {normalize_email(item.get("email")) for item in existing if normalize_email(item.get("email"))}
    existing_phones = {normalize_phone(item.get("phone")) for item in existing if normalize_phone(item.get("phone"))}
    seen_emails = set(existing_emails)
    seen_phones = set(existing_phones)
    accepted, duplicates = [], []

    for item in incoming:
        email = normalize_email(item.get("email"))
        phone = normalize_phone(item.get("phone"))
        reasons = []
        if email and email in existing_emails:
            reasons.append("E-mail já cadastrado na campanha")
        elif email and email in seen_emails:
            reasons.append("E-mail duplicado dentro deste arquivo")
        if phone and phone in existing_phones:
            reasons.append("Telefone já cadastrado na campanha")
        elif phone and phone in seen_phones:
            reasons.append("Telefone duplicado dentro deste arquivo")
        if reasons:
            duplicates.append({"row": item.get("row"), "name": item.get("name", ""), "reasons": reasons})
            continue
        accepted.append(item)
        if email:
            seen_emails.add(email)
        if phone:
            seen_phones.add(phone)

    return jsonify({"accepted": accepted, "duplicates": duplicates})


if __name__ == "__main__":
    try:
        payload = json.loads(sys.stdin.read() or "{}")
        with app.test_client() as client:
            response = client.post("/deduplicate", json=payload)
            sys.stdout.write(json.dumps(response.get_json()))
    except Exception as error:
        sys.stderr.write(str(error))
        sys.exit(1)
