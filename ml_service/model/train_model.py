import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

# Ensure the model directory exists
os.makedirs("model", exist_ok=True)

def generate_dummy_data(n_samples=1000):
    np.random.seed(42)
    
    # Features
    # Experience: 0 to 15 years
    years_exp = np.random.randint(0, 16, n_samples)
    
    # Skill Score: 1 to 10 (Derived from resume keywords count in a real scenario)
    skill_score = np.random.randint(1, 11, n_samples)
    
    # Education Tier: 1 (Top Tier), 2 (Mid), 3 (Low/None)
    education_tier = np.random.choice([1, 2, 3], n_samples, p=[0.2, 0.5, 0.3])
    
    # Previous Companies Tier: 1 (FAANG/Big Tech) to 3 (Unknown startup)
    prev_companies_tier = np.random.randint(1, 4, n_samples)

    # Target: Success Score (0-100)
    # Formula logic: More exp is good, high skills are good, low tier number is good.
    # We add noise to simulate real-world unpredictability.
    
    base_score = (years_exp * 3) + (skill_score * 4) + ((4 - education_tier) * 10) + ((4 - prev_companies_tier) * 5)
    noise = np.random.normal(0, 5, n_samples)
    success_score = base_score + noise
    
    # Clip score to be between 0 and 100
    success_score = np.clip(success_score, 0, 100)
    
    df = pd.DataFrame({
        'years_exp': years_exp,
        'skill_score': skill_score,
        'education_tier': education_tier,
        'prev_companies_tier': prev_companies_tier,
        'success_score': success_score
    })
    
    return df

def train_and_save():
    print("Generating dummy dataset...")
    df = generate_dummy_data()
    
    X = df[['years_exp', 'skill_score', 'education_tier', 'prev_companies_tier']]
    y = df['success_score']
    
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save the model
    model_path = "model/recruit_model.pkl"
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
    
    # Calculate dataset averages for the radar chart comparison later
    averages = X.mean().to_dict()
    joblib.dump(averages, "model/dataset_averages.pkl")
    print("Dataset averages saved.")

if __name__ == "__main__":
    train_and_save()