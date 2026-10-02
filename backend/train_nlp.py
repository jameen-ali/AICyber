import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# 0 = Safe/Legitimate, 1 = Phishing/Social Engineering Threat
training_data = [
    ("Hey, are we still meeting for lunch at 1 PM today?", 0),
    ("Your project review is scheduled for tomorrow morning. Please bring notes.", 0),
    ("Can you send me the link to the shared documentation folder?", 0),
    ("Hey mom, I lost my phone. This is my temporary new number, please message me here.", 1),
    ("URGENT: Your banking access is suspended due to unusual activity. Verify here: http://bit.ly/bank-auth", 1),
    ("CRITICAL SECURITY ALERT: Detect unauthorized login attempt on your account. Click to secure: http://secure-id.com", 1),
    ("Congratulations! You won a $1000 Amazon gift card. Claim your reward immediately: http://win-now.xyz", 1),
    ("Dear customer, your utility bill payment is overdue. Pay now to avoid immediate disconnection.", 1),
    ("Just checking in to see if you finished the code compilation successfully.", 0)
]

X_train = [item[0] for item in training_data]
y_train = [item[1] for item in training_data]

print("Initializing Naive Bayes pipeline...")

# Build a pipeline combining TF-IDF extraction with the Naive Bayes Classifier
pipeline = make_pipeline(
    TfidfVectorizer(stop_words='english', lowercase=True),
    MultinomialNB()
)

# Train the model
pipeline.fit(X_train, y_train)
print("Model trained successfully!")

# Save the trained pipeline into the backend directory
model_path = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")
joblib.dump(pipeline, model_path)
print(f"Model saved locally at: {model_path}")