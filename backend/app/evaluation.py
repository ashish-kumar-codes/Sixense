"""
Evaluation metrics for the Investigative Priority Score.

IMPORTANT: the "ground truth" here is a synthetic label generated at the
same time as the demo data (data/ground_truth.json) -- it marks the
person nodes that were deliberately placed in dense synthetic "ring"
clusters or given many synthetic FIR touches. It exists ONLY to let this
demo show a legitimate evaluation methodology (precision/recall/F1,
threshold sweep, confusion matrix) for a scoring system. It is never
shown to an investigator as if it were a real assessment, and a real
deployment would need labelled outcomes from actual case dispositions,
not a synthetic proxy like this one.
"""
import json
import os

import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix

from . import config


def load_ground_truth(data_dir=None):
    data_dir = data_dir or config.DATA_DIR
    path = os.path.join(data_dir, "ground_truth.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def evaluate_scores(scores: dict, threshold=None, top_k=None, data_dir=None):
    """
    scores: {person_id: {"score": float, ...}}
    Provide either `threshold` (flag if score >= threshold) or `top_k`
    (flag the top-K scored persons). Defaults to top_k = size of ground truth.
    """
    gt = load_ground_truth(data_dir)
    if gt is None:
        return {"error": "ground_truth.json not found -- run the data generator first."}

    truth_set = set(gt["high_risk_person_ids"])
    person_ids = list(scores.keys())
    if not person_ids:
        return {"error": "no scores computed yet."}

    if top_k is None and threshold is None:
        top_k = len(truth_set)

    y_true = np.array([1 if pid in truth_set else 0 for pid in person_ids])

    if threshold is not None:
        y_pred = np.array([1 if scores[pid]["score"] >= threshold else 0 for pid in person_ids])
        method = {"mode": "threshold", "value": threshold}
    else:
        ranked = sorted(person_ids, key=lambda p: scores[p]["score"], reverse=True)
        flagged = set(ranked[:top_k])
        y_pred = np.array([1 if pid in flagged else 0 for pid in person_ids])
        method = {"mode": "top_k", "value": top_k}

    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    return {
        "method": method,
        "n_entities": len(person_ids),
        "n_ground_truth_positive": int(truth_set.__len__()),
        "precision": round(float(precision), 3),
        "recall": round(float(recall), 3),
        "f1_score": round(float(f1), 3),
        "confusion_matrix": {
            "true_positive": int(tp), "false_positive": int(fp),
            "true_negative": int(tn), "false_negative": int(fn),
        },
        "note": ("Computed against SYNTHETIC ground-truth labels generated alongside "
                 "the demo dataset, used only to validate the scoring methodology."),
    }


def threshold_sweep(scores: dict, data_dir=None, steps=20):
    """Precision/recall/F1 at increasing top-K cutoffs -- useful for a
    demo chart of the score's discriminative power."""
    gt = load_ground_truth(data_dir)
    if gt is None or not scores:
        return []
    n = len(scores)
    ks = sorted(set(max(1, int(n * i / steps)) for i in range(1, steps + 1)))
    return [
        {"top_k": k, **{key: val for key, val in evaluate_scores(scores, top_k=k, data_dir=data_dir).items()
                        if key in ("precision", "recall", "f1_score")}}
        for k in ks
    ]
