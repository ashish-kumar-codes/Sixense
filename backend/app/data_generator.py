"""
Synthetic data generator for Sixense.

Everything produced here is fake: names, numbers, amounts, coordinates.
It is written to be *structurally* realistic (clusters, hubs, noise,
a handful of deliberately dense "rings") so that centrality, community
detection and link prediction have something interesting to find --
not to resemble any real case, person, or organisation.

A hidden `ground_truth.json` is also produced. It is used ONLY by
evaluation.py to compute precision/recall/F1 for the demo's scoring
methodology. It is never shown to the "investigator" in the UI, and the
UI never claims a person "is" a criminal -- see app/config.py DISCLAIMER
and app/risk_scoring.py for the enforced vocabulary.
"""
import json
import os
import random
from datetime import datetime, timedelta

import numpy as np
from faker import Faker

from . import config

fake = Faker("en_IN")


def _rid(prefix, i):
    return f"{prefix}-{i:04d}"


def _rand_date(days_back=730):
    return datetime.now() - timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def generate_all(seed=None, out_dir=None):
    seed = seed if seed is not None else config.RANDOM_SEED
    random.seed(seed)
    np.random.seed(seed)
    Faker.seed(seed)
    out_dir = out_dir or config.DATA_DIR
    os.makedirs(out_dir, exist_ok=True)

    # ---------------------------------------------------------------- locations
    location_types = ["residence", "hotspot", "border-crossing", "market",
                       "transit-hub", "warehouse", "cyber-cafe", "financial-district"]
    locations = []
    for i in range(config.N_LOCATIONS):
        locations.append({
            "id": _rid("LOC", i),
            "type": "Location",
            "name": f"{fake.city()} {random.choice(['Sector', 'Zone', 'Block'])} {random.randint(1, 40)}",
            "location_type": random.choice(location_types),
            "lat": round(20.0 + random.random() * 12, 5),
            "lng": round(72.0 + random.random() * 15, 5),
        })

    # ---------------------------------------------------------------- persons
    occupations = ["Trader", "Transport Operator", "Shopkeeper", "Unemployed",
                   "Real Estate Agent", "IT Professional", "Student",
                   "Government Clerk", "Financier", "Import/Export Agent"]
    persons = []
    for i in range(config.N_PERSONS):
        persons.append({
            "id": _rid("P", i),
            "type": "Person",
            "name": fake.name(),
            "age": random.randint(19, 65),
            "gender": random.choice(["M", "F"]),
            "occupation": random.choice(occupations),
            "address_location_id": random.choice(locations)["id"],
            "known_since": _rand_date(1500).date().isoformat(),
        })
    person_ids = [p["id"] for p in persons]

    # ---------------- deliberately dense clusters ("rings") for demo effect
    n_rings = 3
    ring_size = 7
    rings = []
    used = set()
    for r in range(n_rings):
        pool = [p for p in person_ids if p not in used]
        ring_members = random.sample(pool, ring_size)
        used.update(ring_members)
        rings.append(ring_members)

    # ---------------------------------------------------------------- FIRs
    categories = ["Narcotics", "Extortion", "Cyber Fraud", "Financial Fraud",
                  "Theft", "Human Trafficking", "Illegal Arms", "Money Laundering",
                  "Assault", "Smuggling"]
    firs = []
    for i in range(config.N_FIRS):
        firs.append({
            "id": _rid("FIR", i),
            "type": "FIR",
            "fir_number": f"{random.randint(100,999)}/{2023 + random.randint(0,2)}",
            "category": random.choice(categories),
            "date_filed": _rand_date(700).date().isoformat(),
            "status": random.choice(["Under Investigation", "Chargesheet Filed", "Closed", "Cold"]),
            "summary": fake.sentence(nb_words=10),
            "location_id": random.choice(locations)["id"],
        })

    # ------------------------------------------------------ phones + calls
    phones = []
    person_phone_map = {}
    for i in range(config.N_PHONES):
        owner = random.choice(person_ids)
        ph = {
            "id": _rid("PH", i),
            "type": "Phone",
            "number": f"+91-{random.randint(70000,99999)}{random.randint(10000,99999)}",
            "carrier": random.choice(["Airtel", "Jio", "Vi", "BSNL"]),
            "owner_person_id": owner,
        }
        phones.append(ph)
        person_phone_map.setdefault(owner, []).append(ph["id"])

    calls = []
    all_phone_ids = [p["id"] for p in phones]
    for i in range(config.N_CALLS):
        a, b = random.sample(all_phone_ids, 2)
        calls.append({
            "id": _rid("CALL", i),
            "type": "CALL",
            "from_phone_id": a,
            "to_phone_id": b,
            "timestamp": _rand_date(365).isoformat(),
            "duration_sec": random.randint(5, 1800),
            "tower_location_id": random.choice(locations)["id"],
        })
    # inject dense in-ring calling
    idx = len(calls)
    for ring in rings:
        ring_phones = [pid for m in ring for pid in person_phone_map.get(m, [])]
        for _ in range(30):
            if len(ring_phones) < 2:
                break
            a, b = random.sample(ring_phones, 2)
            calls.append({
                "id": _rid("CALL", idx), "type": "CALL",
                "from_phone_id": a, "to_phone_id": b,
                "timestamp": _rand_date(60).isoformat(),
                "duration_sec": random.randint(30, 900),
                "tower_location_id": random.choice(locations)["id"],
            })
            idx += 1

    # ------------------------------------------------------- financial data
    banks = ["State Union Bank", "Continental Trust", "Nova Cooperative Bank", "Meridian Finance"]
    accounts = []
    person_account_map = {}
    for i in range(config.N_ACCOUNTS):
        owner = random.choice(person_ids)
        acc = {
            "id": _rid("ACC", i),
            "type": "Account",
            "account_number": f"AC{random.randint(10**9,10**10-1)}",
            "bank": random.choice(banks),
            "account_type": random.choice(["Savings", "Current", "Wallet"]),
            "owner_person_id": owner,
        }
        accounts.append(acc)
        person_account_map.setdefault(owner, []).append(acc["id"])

    transactions = []
    all_acc_ids = [a["id"] for a in accounts]
    for i in range(config.N_TRANSACTIONS):
        a, b = random.sample(all_acc_ids, 2)
        amount = round(np.random.lognormal(mean=8.5, sigma=1.2), 2)
        transactions.append({
            "id": _rid("TXN", i),
            "type": "TRANSFERRED_TO",
            "from_account_id": a,
            "to_account_id": b,
            "amount": amount,
            "currency": "INR",
            "timestamp": _rand_date(365).isoformat(),
            "channel": random.choice(["NEFT", "UPI", "Cash Deposit", "Wire", "RTGS"]),
        })
    # inject a circular layering pattern inside each ring (classic laundering shape)
    idx = len(transactions)
    for ring in rings:
        ring_accs = [aid for m in ring for aid in person_account_map.get(m, [])]
        if len(ring_accs) < 3:
            continue
        random.shuffle(ring_accs)
        for j in range(len(ring_accs)):
            a = ring_accs[j]
            b = ring_accs[(j + 1) % len(ring_accs)]
            amt = round(random.uniform(45000, 95000), 2)  # just under common reporting thresholds -> anomaly bait
            transactions.append({
                "id": _rid("TXN", idx), "type": "TRANSFERRED_TO",
                "from_account_id": a, "to_account_id": b, "amount": amt,
                "currency": "INR", "timestamp": _rand_date(45).isoformat(),
                "channel": "UPI",
            })
            idx += 1

    # ------------------------------------------------------ social media
    platforms = ["X", "Instagram", "Telegram", "Facebook"]
    social_profiles = []
    person_profile_map = {}
    for i in range(config.N_SOCIAL_PROFILES):
        owner = random.choice(person_ids)
        prof = {
            "id": _rid("SOC", i),
            "type": "SocialProfile",
            "platform": random.choice(platforms),
            "handle": "@" + fake.user_name(),
            "owner_person_id": owner,
            "followers": int(np.random.lognormal(mean=4, sigma=1.8)),
        }
        social_profiles.append(prof)
        person_profile_map.setdefault(owner, []).append(prof["id"])

    content_categories = ["general", "financial-offer", "travel", "meetup-coordination",
                           "coded-language-flagged", "recruitment-language-flagged", "grievance"]
    social_posts = []
    all_profile_ids = [p["id"] for p in social_profiles]
    for i in range(config.N_SOCIAL_POSTS):
        prof = random.choice(all_profile_ids)
        social_posts.append({
            "id": _rid("POST", i),
            "type": "SocialPost",
            "profile_id": prof,
            "timestamp": _rand_date(365).isoformat(),
            "content_category": random.choices(
                content_categories, weights=[55, 10, 10, 10, 7, 5, 3])[0],
            "sentiment": random.choice(["neutral", "negative", "positive", "urgent"]),
            "location_id": random.choice(locations)["id"] if random.random() < 0.4 else None,
        })
    # bump flagged-language posts inside rings
    idx = len(social_posts)
    for ring in rings:
        ring_profiles = [pid for m in ring for pid in person_profile_map.get(m, [])]
        for _ in range(8):
            if not ring_profiles:
                break
            prof = random.choice(ring_profiles)
            social_posts.append({
                "id": _rid("POST", idx), "type": "SocialPost", "profile_id": prof,
                "timestamp": _rand_date(45).isoformat(),
                "content_category": random.choice(
                    ["coded-language-flagged", "recruitment-language-flagged", "meetup-coordination"]),
                "sentiment": "urgent", "location_id": random.choice(locations)["id"],
            })
            idx += 1

    social_follows = []
    idx = 0
    for _ in range(int(config.N_SOCIAL_PROFILES * 1.5)):
        if len(all_profile_ids) < 2:
            break
        a, b = random.sample(all_profile_ids, 2)
        social_follows.append({"id": _rid("FOLLOWS", idx), "type": "FOLLOWS",
                                "from_profile_id": a, "to_profile_id": b})
        idx += 1

    # ---------------------------------------------------- FIR involvement
    fir_links = []
    idx = 0
    for fir in firs:
        n_involved = random.randint(1, 4)
        involved = random.sample(person_ids, n_involved)
        for p in involved:
            role = random.choices(
                ["Accused", "Complainant", "Witness", "Person of Interest"],
                weights=[35, 30, 20, 15])[0]
            confidence = "Confirmed" if role in ("Complainant",) else random.choice(["Confirmed", "Supported"])
            fir_links.append({
                "id": _rid("FIRLINK", idx), "type": "INVOLVED_IN",
                "person_id": p, "fir_id": fir["id"], "role": role,
                "confidence": confidence,
            })
            idx += 1
    # make ring members disproportionately "Accused" / "Person of Interest" across several FIRs
    idx = len(fir_links)
    for ring in rings:
        n_fir_touch = random.randint(3, 5)
        touched_firs = random.sample(firs, n_fir_touch)
        for fir in touched_firs:
            for p in random.sample(ring, min(3, len(ring))):
                fir_links.append({
                    "id": _rid("FIRLINK", idx), "type": "INVOLVED_IN",
                    "person_id": p, "fir_id": fir["id"],
                    "role": random.choice(["Accused", "Person of Interest"]),
                    "confidence": random.choice(["Confirmed", "Supported"]),
                })
                idx += 1

    # ---------------------------------------------------- associations
    associations = []
    idx = 0
    for _ in range(int(config.N_PERSONS * 1.2)):
        a, b = random.sample(person_ids, 2)
        associations.append({
            "id": _rid("ASSOC", idx), "type": "ASSOCIATED_WITH",
            "person_a_id": a, "person_b_id": b,
            "confidence": random.choice(["Confirmed", "Supported", "Potential"]),
            "basis": random.choice(["Co-accused", "Family", "Frequent contact", "Business", "Neighbour"]),
        })
        idx += 1
    for ring in rings:
        for a in ring:
            for b in ring:
                if a >= b:
                    continue
                if random.random() < 0.7:
                    associations.append({
                        "id": _rid("ASSOC", idx), "type": "ASSOCIATED_WITH",
                        "person_a_id": a, "person_b_id": b,
                        "confidence": "Confirmed", "basis": "Co-accused",
                    })
                    idx += 1

    # ---------------------------------------------------- LOCATED_AT (movement)
    located_at = []
    idx = 0
    for p in person_ids:
        n_visits = random.randint(1, 6)
        for _ in range(n_visits):
            located_at.append({
                "id": _rid("LOCAT", idx), "type": "LOCATED_AT",
                "person_id": p, "location_id": random.choice(locations)["id"],
                "timestamp": _rand_date(200).isoformat(),
            })
            idx += 1

    # ---------------------------------------------------- ground truth (hidden)
    ring_members_flat = set(m for ring in rings for m in ring)
    high_fir_persons = {l["person_id"] for l in fir_links
                         if l["role"] == "Accused"}
    ground_truth_high_risk = set()
    for p in person_ids:
        touches = sum(1 for l in fir_links if l["person_id"] == p and l["role"] in ("Accused", "Person of Interest"))
        if p in ring_members_flat or touches >= 3:
            ground_truth_high_risk.add(p)
    ground_truth = {
        "note": ("SYNTHETIC evaluation labels only. Generated from the same synthetic "
                 "seed used to build the dense demo clusters. Used exclusively to compute "
                 "precision/recall/F1 for the scoring methodology in evaluation.py. "
                 "Never surfaced to an investigator and never a real-world assessment."),
        "high_risk_person_ids": sorted(ground_truth_high_risk),
        "ring_members": {f"ring_{i}": members for i, members in enumerate(rings)},
    }

    payload = {
        "locations": locations,
        "persons": persons,
        "firs": firs,
        "phones": phones,
        "calls": calls,
        "accounts": accounts,
        "transactions": transactions,
        "social_profiles": social_profiles,
        "social_posts": social_posts,
        "social_follows": social_follows,
        "fir_links": fir_links,
        "associations": associations,
        "located_at": located_at,
    }

    for name, obj in payload.items():
        with open(os.path.join(out_dir, f"{name}.json"), "w") as f:
            json.dump(obj, f, indent=2, default=str)
    with open(os.path.join(out_dir, "ground_truth.json"), "w") as f:
        json.dump(ground_truth, f, indent=2)

    counts = {k: len(v) for k, v in payload.items()}
    counts["ground_truth_high_risk"] = len(ground_truth_high_risk)
    return counts


if __name__ == "__main__":
    print(json.dumps(generate_all(), indent=2))
