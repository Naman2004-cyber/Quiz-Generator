"""
Comprehensive ML Model Analysis Script for Aura Learn
Analyzes: model performance, data distribution, feature importances, 
cluster quality, and identifies potential issues.
"""
import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.cluster import KMeans
from collections import Counter

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# ─────────────────────────────────────────────
# 1. Load model and data
# ─────────────────────────────────────────────
print("=" * 70)
print("  AURA LEARN — ML MODEL COMPREHENSIVE ANALYSIS")
print("=" * 70)

# Load model registry
registry_path = os.path.join(MODELS_DIR, "current_model.json")
with open(registry_path, 'r') as f:
    registry = json.load(f)

print(f"\n📦 Model Registry:")
print(f"   Version: v{registry['version']}")
print(f"   File: {registry['filename']}")
print(f"   Registered RMSE: {registry['rmse']:.6f}")

# Load the pickle
model_path = os.path.join(MODELS_DIR, registry['filename'])
with open(model_path, 'rb') as f:
    payload = pickle.load(f)

rf_model = payload['rf_model']
gb_model = payload['gb_model']
kmeans_model = payload['kmeans_model']
scaler = payload['scaler']
km_scaler = payload['km_scaler']
topic_encoder = payload['topic_encoder']
diff_encoder = payload['diff_encoder']
cluster_labels = payload.get('_cluster_labels', {})

# Model sizes
model_sizes = {}
for fname in os.listdir(MODELS_DIR):
    fpath = os.path.join(MODELS_DIR, fname)
    if os.path.isfile(fpath):
        model_sizes[fname] = os.path.getsize(fpath)

print(f"\n📁 Model Files on Disk:")
for name, size in model_sizes.items():
    print(f"   {name}: {size / 1024:.1f} KB")

# ─────────────────────────────────────────────
# 2. Model Architecture Details
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  MODEL ARCHITECTURE")
print("=" * 70)

print(f"\n🌲 RandomForest Regressor:")
print(f"   n_estimators: {rf_model.n_estimators}")
print(f"   max_depth: {rf_model.max_depth}")
print(f"   max_features: {rf_model.max_features}")
print(f"   min_samples_split: {rf_model.min_samples_split}")
print(f"   min_samples_leaf: {rf_model.min_samples_leaf}")
print(f"   Number of features: {rf_model.n_features_in_}")

print(f"\n🚀 GradientBoosting Regressor:")
print(f"   n_estimators: {gb_model.n_estimators}")
print(f"   max_depth: {gb_model.max_depth}")
print(f"   learning_rate: {gb_model.learning_rate}")
print(f"   loss: {gb_model.loss}")
print(f"   min_samples_split: {gb_model.min_samples_split}")
print(f"   Number of features: {gb_model.n_features_in_}")

print(f"\n🎯 KMeans Clustering:")
print(f"   n_clusters: {kmeans_model.n_clusters}")
print(f"   n_init: {kmeans_model.n_init}")
print(f"   max_iter: {kmeans_model.max_iter}")
print(f"   inertia: {kmeans_model.inertia_:.2f}")
print(f"   n_iterations_run: {kmeans_model.n_iter_}")

print(f"\n🏷️ Cluster Labels:")
for cid, info in cluster_labels.items():
    print(f"   Cluster {cid}: {info['profile_name']} — {info['description']}")

# ─────────────────────────────────────────────
# 3. Feature Importance Analysis
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  FEATURE IMPORTANCE ANALYSIS")
print("=" * 70)

feature_cols = ['accuracy', 'time_per_question', 'hints_per_question', 'answer_changes',
                'rolling_mean_score', 'score_std', 'improvement_trend', 'attempt_frequency',
                'topic_encoded', 'diff_encoded']

rf_importances = rf_model.feature_importances_
gb_importances = gb_model.feature_importances_

print(f"\n{'Feature':<25} {'RF Importance':>15} {'GB Importance':>15} {'Avg':>10}")
print("-" * 68)
combined = []
for i, feat in enumerate(feature_cols):
    avg = (rf_importances[i] + gb_importances[i]) / 2
    combined.append((feat, rf_importances[i], gb_importances[i], avg))

combined.sort(key=lambda x: -x[3])
for feat, rf_imp, gb_imp, avg in combined:
    bar = "█" * int(avg * 50)
    print(f"   {feat:<23} {rf_imp:>12.4f}   {gb_imp:>12.4f}   {avg:>8.4f}  {bar}")

# ─────────────────────────────────────────────
# 4. Data Analysis
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  TRAINING DATA ANALYSIS")
print("=" * 70)

data_path = os.path.join(DATA_DIR, "aggregated_training_data.json")
with open(data_path, 'r') as f:
    training_data = json.load(f)

df = pd.DataFrame(training_data)
print(f"\n📊 Dataset Overview:")
print(f"   Total records: {len(df):,}")
print(f"   Columns: {list(df.columns)}")

print(f"\n📈 Score Distribution:")
print(f"   Mean:   {df['score'].mean():.2f}")
print(f"   Median: {df['score'].median():.2f}")
print(f"   StdDev: {df['score'].std():.2f}")
print(f"   Min:    {df['score'].min():.2f}")
print(f"   Max:    {df['score'].max():.2f}")
print(f"   Skewness: {df['score'].skew():.3f}")

# Percentiles
for p in [10, 25, 50, 75, 90]:
    print(f"   P{p}: {df['score'].quantile(p/100):.2f}")

# Score binning
bins = [0, 20, 40, 60, 80, 100]
labels = ['0-20', '21-40', '41-60', '61-80', '81-100']
df['score_bin'] = pd.cut(df['score'], bins=bins, labels=labels, include_lowest=True)
print(f"\n📊 Score Bins:")
for label in labels:
    count = (df['score_bin'] == label).sum()
    pct = count / len(df) * 100
    bar = "█" * int(pct)
    print(f"   {label:>8}: {count:>7,} ({pct:>5.1f}%)  {bar}")

# Topic distribution
if 'topic' in df.columns:
    print(f"\n📚 Topic Distribution (Top 15):")
    topic_counts = df['topic'].value_counts().head(15)
    for topic, count in topic_counts.items():
        pct = count / len(df) * 100
        print(f"   {topic[:40]:<40} {count:>6,} ({pct:>5.1f}%)")
    print(f"   ... Total unique topics: {df['topic'].nunique()}")

# Difficulty distribution
if 'difficulty' in df.columns:
    print(f"\n⚙️ Difficulty Distribution:")
    diff_counts = df['difficulty'].value_counts()
    for diff, count in diff_counts.items():
        pct = count / len(df) * 100
        avg_score = df[df['difficulty'] == diff]['score'].mean()
        print(f"   {diff:<10} {count:>7,} ({pct:>5.1f}%)  Avg Score: {avg_score:.1f}")

# Questions per quiz
if 'totalQuestions' in df.columns:
    print(f"\n❓ Questions Per Quiz:")
    print(f"   Mean:   {df['totalQuestions'].mean():.1f}")
    print(f"   Median: {df['totalQuestions'].median():.1f}")
    print(f"   Min:    {df['totalQuestions'].min()}")
    print(f"   Max:    {df['totalQuestions'].max()}")

# Time analysis
if 'avgTimePerQuestionSec' in df.columns:
    print(f"\n⏱️ Avg Time Per Question (seconds):")
    print(f"   Mean:   {df['avgTimePerQuestionSec'].mean():.1f}")
    print(f"   Median: {df['avgTimePerQuestionSec'].median():.1f}")
    print(f"   StdDev: {df['avgTimePerQuestionSec'].std():.1f}")
elif 'timeSpentSeconds' in df.columns and 'totalQuestions' in df.columns:
    df['time_per_q'] = df['timeSpentSeconds'] / df['totalQuestions']
    print(f"\n⏱️ Time Per Question (seconds):")
    print(f"   Mean:   {df['time_per_q'].mean():.1f}")
    print(f"   Median: {df['time_per_q'].median():.1f}")

# Hints usage
if 'hintsPerQuestion' in df.columns:
    print(f"\n💡 Hints Per Question:")
    print(f"   Mean:   {df['hintsPerQuestion'].mean():.3f}")
    print(f"   Median: {df['hintsPerQuestion'].median():.3f}")
    print(f"   % sessions with 0 hints: {(df['hintsPerQuestion'] == 0).sum() / len(df) * 100:.1f}%")

# Unique students
if 'student_id' in df.columns:
    print(f"\n👥 Students:")
    print(f"   Unique students: {df['student_id'].nunique():,}")
    quizzes_per_student = df.groupby('student_id').size()
    print(f"   Quizzes per student (mean): {quizzes_per_student.mean():.1f}")
    print(f"   Quizzes per student (median): {quizzes_per_student.median():.1f}")
    print(f"   Quizzes per student (max): {quizzes_per_student.max()}")

# ─────────────────────────────────────────────
# 5. Re-evaluate Model Performance
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  MODEL PERFORMANCE RE-EVALUATION")
print("=" * 70)

# Reconstruct features using the analyzer
sys.path.insert(0, os.path.dirname(__file__))
from ml_models import QuizMLAnalyzer

analyzer = QuizMLAnalyzer()  # This loads the model from disk

# Build features on the full dataset
feat_df = analyzer._build_features(pd.DataFrame(training_data), mode="predict")
scaled_feature_cols = [f"{c}_scaled" for c in analyzer._feature_cols]

# Temporal split 80/20
split_idx = int(len(feat_df) * 0.8)
train_part = feat_df.iloc[:split_idx]
test_part = feat_df.iloc[split_idx:]

X_test = test_part[scaled_feature_cols]
y_test = test_part['score']

rf_preds = analyzer.rf_model.predict(X_test)
gb_preds = analyzer.gb_model.predict(X_test)
ensemble_preds = 0.6 * rf_preds + 0.4 * gb_preds

print(f"\n📐 Evaluation on Test Set ({len(test_part):,} samples, 20% temporal holdout):")

for name, preds in [("RandomForest", rf_preds), ("GradientBoosting", gb_preds), ("Ensemble (0.6 RF + 0.4 GB)", ensemble_preds)]:
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"\n   {name}:")
    print(f"      RMSE:  {rmse:.4f}")
    print(f"      MAE:   {mae:.4f}")
    print(f"      R²:    {r2:.4f}")

# Residual analysis
residuals = y_test.values - ensemble_preds
print(f"\n📉 Ensemble Residual Analysis:")
print(f"   Mean residual:    {residuals.mean():.4f}")
print(f"   Std residual:     {residuals.std():.4f}")
print(f"   Max over-predict: {residuals.min():.4f}")
print(f"   Max under-predict:{residuals.max():.4f}")
print(f"   % within ±5 pts: {(np.abs(residuals) <= 5).mean() * 100:.1f}%")
print(f"   % within ±10 pts:{(np.abs(residuals) <= 10).mean() * 100:.1f}%")
print(f"   % within ±20 pts:{(np.abs(residuals) <= 20).mean() * 100:.1f}%")

# ─────────────────────────────────────────────
# 6. Cluster Analysis 
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  CLUSTER / STUDENT PROFILING ANALYSIS")
print("=" * 70)

km_feature_cols = ['score', 'score_std', 'improvement_trend', 'accuracy', 'time_per_question', 'hints_per_question']

if 'student_id' in feat_df.columns:
    student_agg = feat_df.groupby('student_id').agg({
        'score': 'mean',
        'score_std': 'mean',
        'improvement_trend': 'mean',
        'accuracy': 'mean',
        'time_per_question': 'mean',
        'hints_per_question': 'mean'
    }).fillna(0)
    
    km_feats_df = student_agg[km_feature_cols]
    km_scaled = analyzer.km_scaler.transform(km_feats_df)
    cluster_ids = analyzer.kmeans_model.predict(km_scaled)
    student_agg['cluster'] = cluster_ids
    
    print(f"\n👥 Students Profiled: {len(student_agg):,}")
    print(f"\n📊 Cluster Distribution:")
    cluster_counts = Counter(cluster_ids)
    for cid in sorted(cluster_counts.keys()):
        count = cluster_counts[cid]
        pct = count / len(student_agg) * 100
        label = cluster_labels.get(str(cid), cluster_labels.get(cid, {})).get('profile_name', 'Unknown')
        cluster_students = student_agg[student_agg['cluster'] == cid]
        avg_score = cluster_students['score'].mean()
        avg_acc = cluster_students['accuracy'].mean()
        print(f"   Cluster {cid} ({label}): {count:,} students ({pct:.1f}%)  AvgScore: {avg_score:.1f}  AvgAcc: {avg_acc:.2f}")

    # Cluster centers
    print(f"\n📍 Cluster Centers (scaled):")
    centers = analyzer.kmeans_model.cluster_centers_
    print(f"   {'Feature':<25} ", end="")
    for i in range(centers.shape[0]):
        print(f"  C{i:>2}", end="")
    print()
    for j, feat in enumerate(km_feature_cols):
        print(f"   {feat:<25} ", end="")
        for i in range(centers.shape[0]):
            print(f" {centers[i][j]:>5.2f}", end="")
        print()

# ─────────────────────────────────────────────
# 7. Encoder Analysis
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  LABEL ENCODER ANALYSIS")
print("=" * 70)

print(f"\n🏷️ Topic Encoder ({len(topic_encoder.classes_)} classes):")
for i, cls in enumerate(topic_encoder.classes_[:20]):
    print(f"   {i}: {cls}")
if len(topic_encoder.classes_) > 20:
    print(f"   ... and {len(topic_encoder.classes_) - 20} more")

print(f"\n🏷️ Difficulty Encoder ({len(diff_encoder.classes_)} classes):")
for i, cls in enumerate(diff_encoder.classes_):
    print(f"   {i}: {cls}")

# ─────────────────────────────────────────────
# 8. Scaler Analysis
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  STANDARD SCALER STATS")
print("=" * 70)

print(f"\n{'Feature':<25} {'Mean':>12} {'Scale (Std)':>12}")
print("-" * 52)
for i, feat in enumerate(feature_cols):
    print(f"   {feat:<23} {scaler.mean_[i]:>10.4f}   {scaler.scale_[i]:>10.4f}")

# ─────────────────────────────────────────────
# 9. Potential Issues & Recommendations
# ─────────────────────────────────────────────
print("\n" + "=" * 70)
print("  POTENTIAL ISSUES & RECOMMENDATIONS")
print("=" * 70)

issues = []
recommendations = []

# Check for data leakage indicators
if registry['rmse'] < 1.0:
    issues.append(f"⚠️  Suspiciously low RMSE ({registry['rmse']:.6f}). Could indicate data leakage or overfitting.")
    recommendations.append("Verify that the temporal train/test split is working correctly and no target leakage exists.")

# Check feature importance concentration
max_imp = max(rf_importances)
if max_imp > 0.5:
    dominant_feat = feature_cols[np.argmax(rf_importances)]
    issues.append(f"⚠️  Feature '{dominant_feat}' dominates RF importance ({max_imp:.2f}). Model may be over-reliant on a single signal.")
    recommendations.append(f"Consider engineering more diverse features or applying regularization to reduce dependence on '{dominant_feat}'.")

# Check answer_changes feature
answer_changes_idx = feature_cols.index('answer_changes')
if rf_importances[answer_changes_idx] < 0.01 and gb_importances[answer_changes_idx] < 0.01:
    issues.append("ℹ️  'answer_changes' feature has near-zero importance. Likely always 0 in training data.")

# Check cluster balance
if 'student_id' in feat_df.columns:
    min_cluster = min(cluster_counts.values())
    max_cluster = max(cluster_counts.values())
    if max_cluster / max(min_cluster, 1) > 5:
        issues.append(f"⚠️  Cluster imbalance: largest cluster has {max_cluster} vs smallest {min_cluster}.")
        recommendations.append("Consider adjusting n_clusters or using a more balanced clustering approach.")

# Check score distribution skew
skew_val = df['score'].skew()
if abs(skew_val) > 1:
    issues.append(f"⚠️  Score distribution is heavily skewed ({skew_val:.2f}). Model may underperform on the tail.")

# Ensemble weighting
recommendations.append("Current ensemble weighting is static (0.6 RF + 0.4 GB). Consider learned/dynamic weighting.")

# Hyperparameter tuning
recommendations.append("RF and GB use default hyperparameters (n_estimators=100). Cross-validated tuning could improve performance.")

# Data concerns
if 'answerChanges' in df.columns or 'answer_changes' in df.columns:
    col_name = 'answerChanges' if 'answerChanges' in df.columns else 'answer_changes'
    if df[col_name].nunique() <= 1:
        issues.append(f"ℹ️  '{col_name}' has only 1 unique value — this feature carries no signal.")

print()
for issue in issues:
    print(f"   {issue}")

print(f"\n💡 Recommendations:")
for i, rec in enumerate(recommendations, 1):
    print(f"   {i}. {rec}")

print("\n" + "=" * 70)
print("  ANALYSIS COMPLETE")
print("=" * 70)
