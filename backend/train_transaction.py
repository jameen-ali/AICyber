"""
AI CyberShield Core - Transaction Anomaly Detection Model Training
Demonstration Transaction Dataset & Isolation Forest Model Trainer

NOTE:
This dataset is a clearly labeled DEMONSTRATION DATASET created specifically
for academic demonstration and PBL evaluation of unsupervised anomaly detection.
This model is NOT intended for production financial fraud prevention.
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# Channel encoding map
CHANNEL_MAP = {"web": 0, "mobile": 1, "pos": 2, "atm": 3, "branch": 4}

# Transaction type encoding map
TYPE_MAP = {
    "online_purchase": 0,
    "transfer": 1,
    "withdrawal": 2,
    "payment": 3,
    "other": 4,
}

FEATURE_COLUMNS = [
    "amount",
    "transaction_hour",
    "account_age_days",
    "previous_amount",
    "amount_difference",
    "amount_ratio",
    "recent_transaction_count",
    "international_flag",
    "channel_encoded",
    "transaction_type_encoded",
]


def generate_demonstration_dataset(n_normal=1200, n_anomalies=60, random_state=42):
    """
    Generates a demonstration dataset representing normal transaction patterns
    and rare anomalous patterns for unsupervised anomaly detection.
    """
    np.random.seed(random_state)

    # ── 1. Normal Transactions (~95%) ──
    # Typical everyday transactions: amounts ₹50 - ₹4,500, active hours 7-22,
    # established accounts 30-1800 days, low velocity 1-8 transactions, mostly domestic
    normal_amounts = np.random.exponential(scale=650, size=n_normal) + 50
    normal_amounts = np.clip(normal_amounts, 50, 6000)

    # Previous amounts correlated with current
    normal_prev_amounts = normal_amounts * np.random.uniform(0.5, 1.8, size=n_normal) + np.random.normal(0, 50, size=n_normal)
    normal_prev_amounts = np.clip(normal_prev_amounts, 30, 7000)

    # Hours peaked during daytime (9:00 - 21:00)
    hour_probs = np.array([
        0.01, 0.005, 0.005, 0.005, 0.01, 0.02, 0.03,  # 00 - 06
        0.05, 0.07, 0.08, 0.08, 0.08, 0.08, 0.08,      # 07 - 13
        0.07, 0.07, 0.07, 0.07, 0.06, 0.04, 0.02,      # 14 - 20
        0.015, 0.01, 0.005                             # 21 - 23
    ])
    hour_probs = hour_probs / np.sum(hour_probs)
    normal_hours = np.random.choice(list(range(24)), size=n_normal, p=hour_probs)

    normal_account_ages = np.random.gamma(shape=3.0, scale=120, size=n_normal) + 30
    normal_account_ages = np.clip(normal_account_ages, 15, 2500)

    normal_recent_counts = np.random.poisson(lam=3.2, size=n_normal) + 1
    normal_recent_counts = np.clip(normal_recent_counts, 1, 12)

    # 96% domestic, 4% international
    normal_intl = np.random.choice([0, 1], size=n_normal, p=[0.96, 0.04])

    normal_channels = np.random.choice([0, 1, 2, 3, 4], size=n_normal, p=[0.40, 0.35, 0.15, 0.07, 0.03])
    normal_types = np.random.choice([0, 1, 2, 3, 4], size=n_normal, p=[0.45, 0.20, 0.15, 0.15, 0.05])

    normal_diff = np.abs(normal_amounts - normal_prev_amounts)
    normal_ratio = normal_amounts / (normal_prev_amounts + 1.0)

    df_normal = pd.DataFrame({
        "amount": normal_amounts,
        "transaction_hour": normal_hours,
        "account_age_days": normal_account_ages,
        "previous_amount": normal_prev_amounts,
        "amount_difference": normal_diff,
        "amount_ratio": normal_ratio,
        "recent_transaction_count": normal_recent_counts,
        "international_flag": normal_intl,
        "channel_encoded": normal_channels,
        "transaction_type_encoded": normal_types,
        "is_synthetic_anomaly": 0,
    })

    # ── 2. Anomalous Transactions (~5%) ──
    # Outlier characteristics: sudden huge amount jumps, middle-of-night high-value transfers,
    # velocity spikes (20-80 transactions), very new accounts with massive transactions, international spikes
    anomaly_amounts = []
    anomaly_prev = []
    anomaly_hours = []
    anomaly_ages = []
    anomaly_recent = []
    anomaly_intl = []
    anomaly_channels = []
    anomaly_types = []

    for i in range(n_anomalies):
        scenario = i % 5
        if scenario == 0:
            # Massive amount outlier
            amt = np.random.uniform(35000, 120000)
            prev = np.random.uniform(200, 1500)
            hr = np.random.choice([1, 2, 3, 4, 14, 23])
            age = np.random.uniform(60, 400)
            cnt = np.random.randint(2, 8)
            intl = np.random.choice([0, 1], p=[0.6, 0.4])
            ch = np.random.choice([0, 1])
            tp = 1  # transfer
        elif scenario == 1:
            # High frequency / card testing velocity burst
            amt = np.random.uniform(1500, 8000)
            prev = np.random.uniform(500, 3000)
            hr = np.random.choice([0, 1, 2, 3, 4, 5])
            age = np.random.uniform(30, 200)
            cnt = np.random.randint(25, 75)  # rapid burst
            intl = 1
            ch = 0  # web
            tp = 0  # online purchase
        elif scenario == 2:
            # Brand new account sudden high transfer
            amt = np.random.uniform(25000, 85000)
            prev = np.random.uniform(50, 300)
            hr = np.random.choice([2, 3, 11, 15, 23])
            age = np.random.uniform(1, 8)  # brand new account!
            cnt = np.random.randint(8, 25)
            intl = np.random.choice([0, 1])
            ch = 1  # mobile
            tp = 1  # transfer
        elif scenario == 3:
            # Extreme amount ratio jump (small baseline, sudden 50x transaction)
            amt = np.random.uniform(18000, 60000)
            prev = np.random.uniform(50, 150)
            hr = np.random.choice([22, 23, 1, 2, 13])
            age = np.random.uniform(120, 600)
            cnt = np.random.randint(4, 15)
            intl = 1
            ch = 0
            tp = 2  # withdrawal / purchase
        else:
            # Late night international transfer spike
            amt = np.random.uniform(15000, 50000)
            prev = np.random.uniform(800, 2500)
            hr = np.random.choice([1, 2, 3, 4])  # dead of night
            age = np.random.uniform(40, 250)
            cnt = np.random.randint(12, 35)
            intl = 1
            ch = 0
            tp = 1

        anomaly_amounts.append(amt)
        anomaly_prev.append(prev)
        anomaly_hours.append(hr)
        anomaly_ages.append(age)
        anomaly_recent.append(cnt)
        anomaly_intl.append(intl)
        anomaly_channels.append(ch)
        anomaly_types.append(tp)

    df_anom = pd.DataFrame({
        "amount": anomaly_amounts,
        "transaction_hour": anomaly_hours,
        "account_age_days": anomaly_ages,
        "previous_amount": anomaly_prev,
        "amount_difference": np.abs(np.array(anomaly_amounts) - np.array(anomaly_prev)),
        "amount_ratio": np.array(anomaly_amounts) / (np.array(anomaly_prev) + 1.0),
        "recent_transaction_count": anomaly_recent,
        "international_flag": anomaly_intl,
        "channel_encoded": anomaly_channels,
        "transaction_type_encoded": anomaly_types,
        "is_synthetic_anomaly": 1,
    })

    df = pd.concat([df_normal, df_anom], ignore_index=True)
    return df


def train_and_save_model():
    print("=" * 60)
    print("AI CyberShield - Transaction Anomaly Model Training")
    print("Dataset: Demonstration transaction dataset (PBL Prototype)")
    print("Model: Isolation Forest (unsupervised anomaly detection)")
    print("=" * 60)

    df = generate_demonstration_dataset(n_normal=1200, n_anomalies=60, random_state=42)
    print(f"Dataset generated: {len(df)} records ({len(df[df['is_synthetic_anomaly'] == 0])} normal, {len(df[df['is_synthetic_anomaly'] == 1])} synthetic anomalies)")

    X = df[FEATURE_COLUMNS].copy()

    # Isolation Forest pipeline:
    # 1. StandardScaler to normalize different feature scales (amounts vs counts vs hours)
    # 2. Isolation Forest with contamination=0.05
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", IsolationForest(
            n_estimators=150,
            contamination=0.05,
            max_samples="auto",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    print("Fitting Isolation Forest model...")
    pipeline.fit(X)

    # Sanity checks on training data
    scores = pipeline.decision_function(X)
    preds = pipeline.predict(X)

    normal_scores = scores[df["is_synthetic_anomaly"] == 0]
    anom_scores = scores[df["is_synthetic_anomaly"] == 1]

    print(f"Normal samples decision score - Mean: {normal_scores.mean():.4f}, Min: {normal_scores.min():.4f}, Max: {normal_scores.max():.4f}")
    print(f"Anomaly samples decision score - Mean: {anom_scores.mean():.4f}, Min: {anom_scores.min():.4f}, Max: {anom_scores.max():.4f}")
    print(f"Synthetic anomaly detection rate: {(preds[df['is_synthetic_anomaly'] == 1] == -1).mean() * 100:.1f}%")

    model_path = os.path.join(os.path.dirname(__file__), "transaction_model.pkl")
    joblib.dump(pipeline, model_path)
    print(f"Successfully saved transaction anomaly pipeline to: {model_path}")
    print("Training complete.")


if __name__ == "__main__":
    train_and_save_model()
