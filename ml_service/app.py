import logging
import sys
import io
import base64
import traceback
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# Machine Learning Imports
from sklearn.linear_model import LinearRegression

# -----------------------------------------------------------------------------
# 1. LOGGING SETUP
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("RecruitAI-ML")

matplotlib.use('Agg')

app = FastAPI(title="RecruitAI ML Service")

logger.info("✅ ML Service is starting up...")

# -----------------------------------------------------------------------------
# 2. DATA MODELS
# -----------------------------------------------------------------------------
class CandidateStats(BaseModel):
    years_exp: float = Field(..., description="Years of experience")
    skill_score: int = Field(..., description="Calculated score based on skills count or match")
    education_tier: int = Field(default=2, description="1=Top, 2=Mid, 3=Low")
    prev_companies_tier: int = Field(default=2, description="1=Top, 2=Mid, 3=Low")

class PredictionRequest(BaseModel):
    candidate: CandidateStats
    config: Dict[str, Any]

# Models for Fine-Tuning
class TrainingExample(BaseModel):
    years_exp: float
    skill_score: int
    education_tier: int
    rating: float # 1-10 rating from HR

class FineTuneRequest(BaseModel):
    candidates: List[TrainingExample]
    current_benchmark: Dict[str, Any]

# -----------------------------------------------------------------------------
# 3. HELPER FUNCTIONS
# -----------------------------------------------------------------------------
def calculate_component_scores(cand_data, benchmark):
    """
    Helper to calculate the raw 0-100 scores for Exp, Skills, Edu.
    Used by both Predict and Fine-Tune to ensure consistency.
    Returns tuple: (score_exp, score_skill, score_edu)
    """
    # 1. Experience
    b_exp_target = float(benchmark.get('avgYearsExperience', 5))
    if b_exp_target == 0: b_exp_target = 5.0
    exp_ratio = cand_data.years_exp / b_exp_target
    score_exp = min(exp_ratio, 1.5) * 100

    # 2. Skills
    # Handle if input is object or raw score
    raw_skill = cand_data.skill_score
    if raw_skill <= 20: 
        score_skill = (raw_skill / 10.0) * 100
    else:
        score_skill = float(raw_skill)
    score_skill = min(score_skill, 100.0)

    # 3. Education
    edu_map = {1: 100, 2: 70, 3: 40}
    score_edu = edu_map.get(cand_data.education_tier, 40)

    return score_exp, score_skill, score_edu

def generate_radar_chart(candidate: CandidateStats, benchmark: Dict[str, Any]):
    try:
        categories = ['Experience', 'Skills', 'Education', 'Prev Comp']
        
        # Normalize Data for Chart (0-10 Scale)
        c_exp = min(candidate.years_exp, 15) / 1.5 
        c_skill = candidate.skill_score
        if c_skill > 10: c_skill = c_skill / 10.0
        c_edu = (4 - candidate.education_tier) * 3.3
        c_prev = (4 - candidate.prev_companies_tier) * 3.3
        cand_values = [c_exp, c_skill, c_edu, c_prev]

        b_exp = min(float(benchmark.get('avgYearsExperience', 5)), 15) / 1.5
        b_skill = 8.0 
        b_edu = (4 - float(benchmark.get('educationTierTarget', 2))) * 3.3
        b_prev = 6.6 
        avg_values = [b_exp, b_skill, b_edu, b_prev]

        # Close polygon
        cand_values += [cand_values[0]]
        avg_values += [avg_values[0]]
        
        N = len(categories)
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        angles += [angles[0]]

        fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
        plt.xticks(angles[:-1], categories)
        
        ax.plot(angles, cand_values, linewidth=2, linestyle='solid', label='Candidate', color='#2563eb')
        ax.fill(angles, cand_values, '#2563eb', alpha=0.1)
        
        ax.plot(angles, avg_values, linewidth=2, linestyle='dashed', label='Gold Standard', color='#f59e0b')
        ax.fill(angles, avg_values, '#f59e0b', alpha=0.05)
        
        plt.legend(loc='upper right', bbox_to_anchor=(1.1, 1.1))
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', transparent=True)
        plt.close(fig)
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception as e:
        logger.error(f"Chart Error: {e}")
        return None

# -----------------------------------------------------------------------------
# 4. PREDICTION ENDPOINT
# -----------------------------------------------------------------------------
@app.post("/predict")
async def predict_score(data: PredictionRequest):
    try:
        cand = data.candidate
        config = data.config
        
        # Get Weights
        weights = config.get('scoringWeights') or config.get('weights') or {}
        benchmark = config.get('goldStandardBenchmark') or config.get('benchmark') or {}

        w_exp = float(weights.get('experienceWeight', 30))
        w_skill = float(weights.get('skillsWeight', 40))
        w_edu = float(weights.get('educationWeight', 20))
        w_prev = float(weights.get('prevCompanyWeight', 10))
        
        # Calculate Scores
        score_exp, score_skill, score_edu = calculate_component_scores(cand, benchmark)
        score_prev = 75 # Static placeholder for now
        
        # Weighted Average
        total_weight = w_exp + w_skill + w_edu + w_prev
        if total_weight == 0: total_weight = 100
        
        final_score = (
            (score_exp * w_exp) +
            (score_skill * w_skill) +
            (score_edu * w_edu) +
            (score_prev * w_prev)
        ) / total_weight
        
        chart_b64 = generate_radar_chart(cand, benchmark)
        
        analysis = (
            f"Based on weighted scoring: Experience contribution ({score_exp:.0f}/100), "
            f"Skills match ({score_skill:.0f}/100), and Education tier ({score_edu:.0f}/100). "
        )

        return {
            "success_score": round(final_score, 1),
            # FIX: Use 'chart_b64' in the check, not 'chart_base64'
            "chart_base64": f"data:image/png;base64,{chart_b64}" if chart_b64 else None,
            "analysis": analysis,
            "debug_details": {"exp": score_exp, "skill": score_skill, "edu": score_edu}
        }

    except Exception as e:
        logger.error("Prediction Error")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 5. FINE-TUNING ENDPOINT (Feature 3: AI Learning)
# -----------------------------------------------------------------------------
@app.post("/fine_tune")
async def fine_tune_weights(data: FineTuneRequest):
    logger.info("==========================================================")
    logger.info("🧠 FINE-TUNE REQUEST: Learning from User Feedback")
    logger.info("==========================================================")

    try:
        candidates = data.candidates
        benchmark = data.current_benchmark
        
        if len(candidates) < 5:
            logger.warn("⚠️ Not enough data points to tune (need at least 5). Returning default.")
            return {"status": "skipped", "reason": "Insufficient data"}

        # 1. Prepare Training Data
        # X = [ExpScore, SkillScore, EduScore]
        # y = UserRating (scaled to 0-100)
        X = []
        y = []

        logger.info(f"📚 Training on {len(candidates)} rated candidates...")

        for c in candidates:
            # Re-calculate what the system *thought* the scores were
            s_exp, s_skill, s_edu = calculate_component_scores(c, benchmark)
            X.append([s_exp, s_skill, s_edu])
            
            # Scale 1-10 rating to 10-100 range
            y.append(c.rating * 10)

        # 2. Train Linear Regression Model
        # fit_intercept=False because we want a weighted sum model (Success = w1*x1 + w2*x2...)
        # positive=True forces weights to be non-negative (Requires scikit-learn >= 0.24)
        model = LinearRegression(positive=True, fit_intercept=False)
        model.fit(X, y)

        # 3. Extract Coefficients (The raw new weights)
        raw_weights = model.coef_ # [w_exp, w_skill, w_edu]
        logger.info(f"   Raw Learned Coefficients: {raw_weights}")

        # 4. Normalize to Percentage (Summing to 90, keeping 10 for PrevCompany)
        # We reserve 10% for 'prevCompanyWeight' since it's hardcoded currently and we can't optimize it
        TARGET_SUM = 90.0
        total_raw = np.sum(raw_weights)

        if total_raw == 0:
            logger.warn("⚠️ Model coefficients are all zero. Fallback to defaults.")
            return {"status": "failed", "reason": "Model convergence failed"}

        norm_factor = TARGET_SUM / total_raw
        
        new_w_exp = round(raw_weights[0] * norm_factor)
        new_w_skill = round(raw_weights[1] * norm_factor)
        new_w_edu = round(raw_weights[2] * norm_factor)
        
        # Adjust rounding errors to ensure exact sum to 90
        current_sum = new_w_exp + new_w_skill + new_w_edu
        diff = TARGET_SUM - current_sum
        new_w_skill += diff # Dump remainder into skills

        new_weights = {
            "experienceWeight": int(new_w_exp),
            "skillsWeight": int(new_w_skill),
            "educationWeight": int(new_w_edu),
            "prevCompanyWeight": 10 # Keep constant
        }

        logger.info(f"✨ OPTIMIZED WEIGHTS CALCULATED: {new_weights}")
        return {
            "status": "success",
            "new_weights": new_weights
        }

    except Exception as e:
        logger.error("❌ Fine-Tuning Error")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)