import uuid
import re

def resolve_entities(extracted_data, graph_service):
    """
    Match extracted entities against existing nodes in the graph.
    Very basic string distance implementation for demonstration.
    Returns:
      - 'new_entities': list of nodes to create
      - 'matches': list of confirmed/potential matches to existing nodes
    """
    existing_nodes = graph_service.get_full_graph().get("nodes", [])
    
    new_nodes = []
    resolved_matches = []
    
    # Simple mapping of extracted id -> resolved id for relationship tracking
    id_map = {}
    
    for ent in extracted_data["entities"]:
        best_match = None
        best_score = 0
        
        # very basic normalizer
        norm_name = re.sub(r'[^a-z0-9]', '', ent["name"].lower())
        
        for node in existing_nodes:
            if node.get("label") != ent["label"]:
                continue
            
            n_name = node.get("name") or node.get("id") or ""
            norm_n = re.sub(r'[^a-z0-9]', '', n_name.lower())
            
            if norm_name and norm_n:
                # exact match check
                if norm_name == norm_n:
                    best_match = node
                    best_score = 100
                    break
                
                # substring check
                if len(norm_name) > 4 and (norm_name in norm_n or norm_n in norm_name):
                    best_match = node
                    best_score = 80
                    
        if best_match and best_score >= 90:
            # high confidence, auto-merge
            id_map[ent["id"]] = best_match["id"]
            resolved_matches.append({
                "extracted": ent,
                "matched_node": best_match,
                "confidence": best_score,
                "status": "Confirmed"
            })
        else:
            # create new node
            new_id = f"NEW-{str(uuid.uuid4())[:8]}"
            id_map[ent["id"]] = new_id
            
            # assign a better node shape/icon class by adding it as a property
            # For networkx store, just sending properties as is.
            new_node = {
                "id": new_id,
                "label": ent["label"],
                "name": ent["name"],
                "source": "NLP_Extraction"
            }
            new_nodes.append(new_node)
            
            if best_match:
                # low confidence, queue for resolution (in Phase 3)
                resolved_matches.append({
                    "extracted": ent,
                    "matched_node": best_match,
                    "confidence": best_score,
                    "status": "Pending"
                })
                
    
    # Map relationships
    new_relationships = []
    for rel in extracted_data.get("relationships", []):
        s_id = id_map.get(rel["source"])
        t_id = id_map.get(rel["target"])
        if s_id and t_id:
            new_relationships.append({
                "id": f"EXT-REL-{str(uuid.uuid4())[:8]}",
                "source": s_id,
                "target": t_id,
                "type": rel["type"],
                "confidence": "Potential",
                "extracted_from": "Narrative"
            })
            
    return {
        "new_nodes": new_nodes,
        "new_edges": new_relationships,
        "matches": resolved_matches
    }
