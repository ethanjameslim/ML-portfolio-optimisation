"""
Entry-point script: builds ML features from raw prices.

Run from project root:
    PYTHONPATH=src python scripts/make_features.py
"""

from ml_optimisation.preprocess import main

if __name__ == "__main__":
    main()