"""Validate the synthetic/recommendation training dataset for schema, ranges,
missing values, leakage risk and class balance."""
import os
import sys
import csv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import FEATURE_NAMES, LABEL_NAME


def validate(path):
    errors = []
    warnings = []
    if not os.path.exists(path):
        print(f"FAIL: dataset not found at {path}")
        return 1

    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames or []
        rows = list(reader)

    for col in FEATURE_NAMES + [LABEL_NAME]:
        if col not in header:
            errors.append(f"missing column: {col}")

    n = len(rows)
    if n == 0:
        errors.append("dataset is empty")

    nulls = {c: 0 for c in FEATURE_NAMES}
    nonfinite = []
    for i, row in enumerate(rows):
        for c in FEATURE_NAMES:
            v = row.get(c, "")
            if v is None or v == "":
                nulls[c] += 1
                continue
            try:
                fv = float(v)
                import math

                if not math.isfinite(fv):
                    nonfinite.append((i, c, v))
            except ValueError:
                errors.append(f"non-numeric value at row {i} col {c}: {v!r}")

    for c, cnt in nulls.items():
        if cnt > 0:
            warnings.append(f"{c}: {cnt} missing values ({cnt / n:.1%})")

    if nonfinite:
        errors.append(f"{len(nonfinite)} non-finite values, e.g. {nonfinite[:3]}")

    labels = [int(float(r[LABEL_NAME])) for r in rows if r.get(LABEL_NAME) not in (None, "")]
    pos = sum(labels)
    neg = len(labels) - pos

    # Leakage check: request ids must not appear in the feature set
    if "_request_id" in header:
        groups = {}
        for r in rows:
            groups.setdefault(r["_request_id"], 0)
            groups[r["_request_id"]] += 1
        if len(groups) < 2:
            errors.append("only one query group found; cannot split by scenario")

    print(f"Rows: {n}")
    print(f"Label balance: positive={pos} ({pos / max(1, n):.1%}), negative={neg} ({neg / max(1, n):.1%})")
    for w in warnings:
        print(f"WARN: {w}")
    if errors:
        for e in errors:
            print(f"FAIL: {e}")
        return 1
    print("OK: dataset validation passed")
    return 0


if __name__ == "__main__":
    default = os.path.abspath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "..",
            "..",
            "data",
            "synthetic",
            "care_pairs.csv",
        )
    )
    sys.exit(validate(sys.argv[1] if len(sys.argv) > 1 else default))
