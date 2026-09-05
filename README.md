# NIM-PRIS | National Infrastructure Monitoring & Project Risk Intelligence System

An AI-powered Enterprise & Government Monitoring Platform for strategic mega-infrastructure projects, modeled after **PM GatiShakti National Master Plan**, **MoSPI OCMS**, and **Cabinet Committee on Infrastructure (CCI)** oversight workflows.

---

## 🏛️ Executive Features

1. **National-Scale Strategic Projects Registry**:
   * Pre-populated with **18+ real mega-corridors** across India (Delhi-Mumbai Expressway, Western DFC, Bullet Train, Zojila Tunnel, Khavda Ultra-Mega Solar Park, Ken-Betwa River Interlinking, Dholera Semiconductor Fab, RRTS Namo Bharat).
   * Detailed metadata: Union Ministry, EPC executing contractor, geographic zone, land acquisition %, and environmental clearance stage.

2. **Earned Value Management (EVM) Analytics**:
   * **SPI (Schedule Performance Index)**: Compares Earned Value (EV) against Planned Value (PV).
   * **CPI (Cost Performance Index)**: Measures capital efficiency against actual cost incurred.
   * Schedule Variance (SV) and Cost Variance (CV) in ₹ Crores.

3. **Machine Learning Predictive Risk Engine**:
   * **Delay Regression Forecaster**: Predicts expected delivery lag in days based on schedule slippage, activity lags, and land acquisition bottlenecks.
   * **Cost Escalation Estimator**: Forecasts projected budget overrun in ₹ Crores.
   * **Composite Risk Classification**: Categorizes projects into `LOW`, `MEDIUM`, and `HIGH` risk with an **AI Health Index (0–100%)**.
   * **Explainable AI (XAI)**: Generates detailed root-cause diagnoses for inter-ministerial review.

4. **Stakeholder & Ministerial Tools**:
   * **Official Cabinet Briefing Dossier**: 1-click printable formal executive briefing document.
   * **Master CSV Dataset Export**: Download full project and risk metrics for review meetings.
   * **AI Ministerial Policy Advisor**: Conversational intelligence for rapid answers to policy and bottleneck queries.
   * **What-If Policy Simulation Sandbox**: Model hypothetical policy interventions before committing capital.

---

## 🚀 Instant Deployment to GitHub Pages (Permanent 24/7 URL)

To make this website permanently accessible on the web for anyone to view 24/7 without needing a server running:

1. **Create a new repository on GitHub** (e.g. named `nim-pris` or `infrastructure-monitor`).
2. Push this folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of NIM-PRIS Platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```
3. On GitHub, go to your repository **Settings** → **Pages**:
   * Under **Branch**, select `main` and `/ (root)`.
   * Click **Save**.
4. Within 1 minute, GitHub will give you your **permanent public link**:
   👉 `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`

---

## 💻 Running Locally with Python Flask

```bash
pip install -r requirements.txt
python app.py
```
Visit `http://127.0.0.1:5000` in your web browser.
