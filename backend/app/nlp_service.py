import os
import json
import re
import uuid

def extract_entities_and_relationships(text: str):
    """
    Extract entities and relationships from unstructured text.
    If an LLM API Key is present, we could use it here.
    For now, this is a rule-based mock implementation that acts like an LLM.
    """
    
    entities = []
    relationships = []
    
    # Mock rule-based extraction:
    # Find names (capitalized words)
    words = text.split()
    names = []
    current_name = []
    
    for word in words:
        clean_word = re.sub(r'[^a-zA-Z]', '', word)
        if clean_word and clean_word[0].isupper():
            current_name.append(clean_word)
        else:
            if current_name:
                name_str = " ".join(current_name)
                # Filter out some common capitalized words that start sentences
                if name_str not in ["During", "Informant", "A", "Suspicious", "Intelligence", "Financial"]:
                    names.append(name_str)
                current_name = []
    if current_name:
        name_str = " ".join(current_name)
        if name_str not in ["During", "Informant", "A", "Suspicious", "Intelligence", "Financial"]:
            names.append(name_str)
            
    # Naive classification
    for name in set(names):
        entity_id = f"ext-{str(uuid.uuid4())[:8]}"
        label = "Person"
        if any(keyword in name for keyword in ["Sector", "Zone", "Block"]):
            label = "Location"
        elif any(keyword in name for keyword in ["Car", "Truck", "Motorcycle", "Van"]):
            label = "Vehicle"
        elif any(keyword in name for keyword in ["Company", "NGO", "Trust", "Corporation", "Bank"]):
            label = "Organization"
            
        entities.append({
            "id": entity_id,
            "label": label,
            "name": name
        })
        
    # Naive relationships (connect all extracted entities to the first person found)
    persons = [e for e in entities if e["label"] == "Person"]
    if persons:
        primary_person = persons[0]
        for e in entities:
            if e["id"] != primary_person["id"]:
                rel_type = "ASSOCIATED_WITH"
                if e["label"] == "Location":
                    rel_type = "LOCATED_AT"
                elif e["label"] == "Vehicle":
                    rel_type = "OWNS"
                
                relationships.append({
                    "source": primary_person["id"],
                    "target": e["id"],
                    "type": rel_type
                })

    return {
        "entities": entities,
        "relationships": relationships
    }
