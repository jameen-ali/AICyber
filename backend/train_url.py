import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Feature extraction function for structural URL analysis
def extract_url_features(url):
    # Strip whitespace and common prefixes for cleaning
    clean_url = url.replace("http://", "").replace("https://", "")
    
    return {
        "url_length": len(url),
        "dot_count": clean_url.count("."),
        "hyphen_count": clean_url.count("-"),
        "is_ip": 1 if any(char.isdigit() for char in clean_url.split('/')[0].replace('.', '')) and clean_url.split('/')[0].replace('.', '').isdigit() else 0,
        "has_at_symbol": 1 if "@" in url else 0
    }

# 0 = Safe, 1 = Malicious/Phishing Link
training_urls = [
    ("https://google.com", 0),
    ("https://github.com/trending", 0),
    ("https://wikipedia.org/wiki/Main_Page", 0),
    ("http://secure-login-bank-verification.com/update", 1),
    ("http://192.168.1.105/signin.html", 1),
    ("https://verify-amazon-account-details.xyz/login", 1),
    ("https://paypal-security-alert-update.net/home", 1),
    ("https://stackoverflow.com/questions", 0)
]

# Extract feature records
features_list = []
labels = []
for url, label in training_urls:
    features_list.append(extract_url_features(url))
    labels.append(label)

# Convert to DataFrame for the Random Forest model training step
X_train = pd.DataFrame(features_list)
y_train = labels

print("Training Random Forest ensemble model for URL signatures...")
rf_model = RandomForestClassifier(n_estimators=50, random_state=42)
rf_model.fit(X_train, y_train)

# Save the trained model wrapper locally
model_path = os.path.join(os.path.dirname(__file__), "url_model.pkl")
joblib.dump(rf_model, model_path)
print(f"URL Analysis Model successfully saved at: {model_path}")