import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from datetime import datetime

class ProjectRiskMLEngine:
    def __init__(self):
        self._init_models()

    def _generate_synthetic_training_data(self, n_samples=600):
        """
        Generates realistic synthetic data representing project monitoring metrics:
        Features:
        0: planned_progress_pct (0 to 100)
        1: actual_progress_pct (0 to 100)
        2: progress_deviation (planned - actual)
        3: budget_lakhs (10 to 50000)
        4: actual_expenditure_lakhs
        5: expenditure_ratio (actual_expenditure / budget)
        6: planned_duration_months (1 to 60)
        7: delayed_activities_count (0 to 15)
        8: resource_availability_score (0: Low, 1: Medium, 2: High)
        9: milestone_status_score (0: Critical Delay, 1: Minor Delay, 2: On Schedule)
        """
        np.random.seed(42)
        
        planned_prog = np.random.uniform(10, 100, n_samples)
        deviation = np.random.normal(5, 15, n_samples)
        actual_prog = np.clip(planned_prog - deviation, 0, 100)
        
        budget = np.random.uniform(50, 15000, n_samples)
        # expenditure factor correlated with progress and deviation
        expenditure_factor = (actual_prog / 100.0) + (deviation / 100.0) * np.random.uniform(0.5, 1.2, n_samples)
        expenditure_factor = np.clip(expenditure_factor, 0.05, 1.6)
        actual_expenditure = budget * expenditure_factor
        
        planned_duration = np.random.uniform(6, 48, n_samples)
        delayed_activities = np.random.poisson(lam=np.clip(deviation / 5.0 + 1.5, 0, 12))
        
        resource_score = np.random.choice([0, 1, 2], size=n_samples, p=[0.25, 0.45, 0.30])
        milestone_score = np.random.choice([0, 1, 2], size=n_samples, p=[0.20, 0.35, 0.45])

        X = []
        y_delay_days = []
        y_cost_overrun = []
        y_risk_class = [] # 0: Low, 1: Medium, 2: High

        for i in range(n_samples):
            p_dev = planned_prog[i] - actual_prog[i]
            exp_ratio = actual_expenditure[i] / budget[i]
            expected_exp_ratio = actual_prog[i] / 100.0
            cost_dev_ratio = exp_ratio - expected_exp_ratio
            
            # True Delay calculation in days
            base_delay = (p_dev / 100.0) * (planned_duration[i] * 30.0)
            act_delay = delayed_activities[i] * 4.5
            resource_penalty = (2 - resource_score[i]) * 7.0
            milestone_penalty = (2 - milestone_score[i]) * 10.0
            delay = max(0.0, base_delay + act_delay + resource_penalty + milestone_penalty + np.random.normal(0, 3))
            
            # True Cost overrun calculation in Lakhs
            if cost_dev_ratio > 0:
                overrun = (cost_dev_ratio * budget[i]) + (delayed_activities[i] * 0.02 * budget[i])
            else:
                overrun = max(0.0, (delayed_activities[i] * 0.01 * budget[i]) - abs(cost_dev_ratio * 0.2 * budget[i]))
            overrun = max(0.0, overrun + np.random.normal(0, budget[i] * 0.01))

            # Composite Risk
            risk_score = (
                (p_dev * 1.5) +
                (cost_dev_ratio * 100 * 1.2) +
                (delayed_activities[i] * 5.0) +
                ((2 - resource_score[i]) * 12.0) +
                ((2 - milestone_score[i]) * 15.0)
            )
            
            if risk_score > 45:
                risk_class = 2 # High
            elif risk_score > 18:
                risk_class = 1 # Medium
            else:
                risk_class = 0 # Low

            features = [
                planned_prog[i],
                actual_prog[i],
                p_dev,
                budget[i],
                actual_expenditure[i],
                exp_ratio,
                planned_duration[i],
                delayed_activities[i],
                resource_score[i],
                milestone_score[i]
            ]
            X.append(features)
            y_delay_days.append(delay)
            y_cost_overrun.append(overrun)
            y_risk_class.append(risk_class)

        return np.array(X), np.array(y_delay_days), np.array(y_cost_overrun), np.array(y_risk_class)

    def _init_models(self):
        """Train baseline ML models on synthetic project dataset"""
        X, y_delay, y_overrun, y_risk = self._generate_synthetic_training_data()
        
        self.delay_model = GradientBoostingRegressor(n_estimators=75, max_depth=4, random_state=42)
        self.delay_model.fit(X, y_delay)

        self.overrun_model = GradientBoostingRegressor(n_estimators=75, max_depth=4, random_state=42)
        self.overrun_model.fit(X, y_overrun)

        self.risk_classifier = RandomForestClassifier(n_estimators=80, max_depth=5, random_state=42)
        self.risk_classifier.fit(X, y_risk)

    def _extract_features(self, data):
        """Converts project dict into normalized feature vector"""
        budget = float(data.get('budget', 500))
        actual_exp = float(data.get('actual_expenditure', 100))
        actual_prog = float(data.get('completion_percentage', 30))
        planned_duration = float(data.get('planned_duration', 12))
        delayed_activities = int(data.get('delayed_activities', 0))
        
        # Calculate planned progress using dates if available, or estimated
        planned_prog = float(data.get('planned_progress', actual_prog + 5.0))
        if 'start_date' in data and 'expected_completion_date' in data:
            try:
                start = datetime.strptime(data['start_date'], '%Y-%m-%d')
                end = datetime.strptime(data['expected_completion_date'], '%Y-%m-%d')
                now = datetime.now()
                total_days = max(1, (end - start).days)
                elapsed_days = max(0, (now - start).days)
                calc_planned = min(100.0, (elapsed_days / total_days) * 100.0)
                if not data.get('override_planned_progress'):
                    planned_prog = round(calc_planned, 1)
            except Exception:
                pass

        planned_prog = min(100.0, max(0.0, planned_prog))
        p_dev = planned_prog - actual_prog
        exp_ratio = actual_exp / max(1.0, budget)

        # Resource score: High=2, Medium=1, Low=0
        res_raw = str(data.get('resource_availability', 'Medium')).lower()
        if 'high' in res_raw:
            resource_score = 2
        elif 'low' in res_raw:
            resource_score = 0
        else:
            resource_score = 1

        # Milestone score: On Schedule=2, Minor Delay=1, Critical Delay=0
        ms_raw = str(data.get('milestone_status', 'On Schedule')).lower()
        if 'critical' in ms_raw:
            milestone_score = 0
        elif 'minor' in ms_raw or 'delayed' in ms_raw:
            milestone_score = 1
        else:
            milestone_score = 2

        features = np.array([
            planned_prog,
            actual_prog,
            p_dev,
            budget,
            actual_exp,
            exp_ratio,
            planned_duration,
            delayed_activities,
            resource_score,
            milestone_score
        ]).reshape(1, -1)

        return features, {
            'planned_prog': planned_prog,
            'actual_prog': actual_prog,
            'p_dev': p_dev,
            'budget': budget,
            'actual_exp': actual_exp,
            'exp_ratio': exp_ratio,
            'delayed_activities': delayed_activities,
            'resource_score': resource_score,
            'milestone_score': milestone_score
        }

    def evaluate_project(self, data):
        """
        Main inference function:
        Returns predicted delay, cost overrun, risk levels, explainability factors, and recommendations.
        """
        features, meta = self._extract_features(data)

        # 1. ML Delay prediction
        pred_delay_raw = float(self.delay_model.predict(features)[0])
        pred_delay_days = max(0, int(round(pred_delay_raw)))

        # 2. ML Cost Overrun prediction
        pred_overrun_raw = float(self.overrun_model.predict(features)[0])
        pred_overrun_lakhs = max(0.0, round(pred_overrun_raw, 2))

        # 3. ML Risk Classification & Probabilities
        risk_class_idx = int(self.risk_classifier.predict(features)[0])
        risk_probs = self.risk_classifier.predict_proba(features)[0]
        # Classes: 0: Low, 1: Medium, 2: High
        risk_labels = ['LOW', 'MEDIUM', 'HIGH']
        overall_risk = risk_labels[risk_class_idx]
        
        # Calculate a continuous AI Risk Health Score (0 - 100, where 100 is best health / lowest risk)
        # P(Low)*100 + P(Med)*50 + P(High)*0
        health_score = int(round(risk_probs[0] * 100 + risk_probs[1] * 55 + risk_probs[2] * 15))
        health_score = max(5, min(98, health_score))
        risk_score = 100 - health_score

        # Delay Risk level
        if pred_delay_days > 20 or meta['milestone_score'] == 0:
            delay_risk = 'HIGH'
        elif pred_delay_days > 7 or meta['milestone_score'] == 1:
            delay_risk = 'MEDIUM'
        else:
            delay_risk = 'LOW'

        # Cost Overrun Risk level
        expected_cost_lakhs = (meta['actual_prog'] / 100.0) * meta['budget']
        cost_deviation = meta['actual_exp'] - expected_cost_lakhs
        cost_deviation_pct = (cost_deviation / meta['budget']) * 100.0 if meta['budget'] > 0 else 0

        if cost_deviation_pct > 12.0 or pred_overrun_lakhs > (0.10 * meta['budget']):
            cost_risk = 'HIGH'
        elif cost_deviation_pct > 4.0 or pred_overrun_lakhs > (0.04 * meta['budget']):
            cost_risk = 'MEDIUM'
        else:
            cost_risk = 'LOW'

        # 4. Explainable AI (XAI) - Major Risk Factors
        factors = []
        if meta['p_dev'] > 3.0:
            factors.append({
                'factor': 'Actual progress is below planned schedule',
                'impact': 'HIGH' if meta['p_dev'] > 12 else 'MEDIUM',
                'detail': f"Project is lag-behind by {round(meta['p_dev'], 1)}% against the baseline schedule timeline.",
                'score_contribution': min(35, int(meta['p_dev'] * 1.5))
            })

        if meta['delayed_activities'] > 0:
            factors.append({
                'factor': 'Multiple critical activities are delayed',
                'impact': 'HIGH' if meta['delayed_activities'] >= 4 else 'MEDIUM',
                'detail': f"{meta['delayed_activities']} sub-activities have exceeded their critical path deadlines.",
                'score_contribution': min(30, meta['delayed_activities'] * 6)
            })

        if cost_deviation_pct > 3.0:
            factors.append({
                'factor': 'Expenditure is increasing faster than physical progress',
                'impact': 'HIGH' if cost_deviation_pct > 10 else 'MEDIUM',
                'detail': f"Current burn rate indicates ₹{round(cost_deviation, 2)} Lakhs spent ahead of delivered milestones.",
                'score_contribution': min(25, int(cost_deviation_pct * 1.8))
            })

        if meta['resource_score'] == 0:
            factors.append({
                'factor': 'Available resources are critically insufficient for current workload',
                'impact': 'HIGH',
                'detail': 'Severe manpower, technical machinery, or vendor resource constraints reported.',
                'score_contribution': 20
            })
        elif meta['resource_score'] == 1:
            factors.append({
                'factor': 'Moderate resource constraints detected',
                'impact': 'LOW',
                'detail': 'Resource utilization is near capacity with limited contingency buffer.',
                'score_contribution': 10
            })

        if meta['milestone_score'] == 0:
            factors.append({
                'factor': 'Critical milestone delivery deadline breached',
                'impact': 'HIGH',
                'detail': 'Contractual milestone not achieved within authorized window.',
                'score_contribution': 25
            })

        if not factors:
            factors.append({
                'factor': 'Project performance metrics are aligned with planned baselines',
                'impact': 'POSITIVE',
                'detail': 'Timelines, milestone adherence, and budget burn rate are in optimal ranges.',
                'score_contribution': 0
            })

        # Priority Risk Identification
        if delay_risk == 'HIGH' and cost_risk == 'HIGH':
            priority_risk = 'Schedule Delay & Cost Overrun'
        elif delay_risk == 'HIGH':
            priority_risk = 'Schedule Delay'
        elif cost_risk == 'HIGH':
            priority_risk = 'Budget Overrun'
        elif meta['resource_score'] == 0:
            priority_risk = 'Resource Bottleneck'
        elif overall_risk == 'MEDIUM':
            priority_risk = 'Milestone Slippage'
        else:
            priority_risk = 'None (On Schedule)'

        # 5. Smart Recommendations Generation
        recommendations = []
        if meta['delayed_activities'] > 0 or meta['p_dev'] > 5.0:
            recommendations.append({
                'title': 'Review & Expedite Delayed Activities',
                'action': 'Conduct immediate critical path analysis on delayed tasks and assign fast-track recovery teams.',
                'priority': 'High' if delay_risk == 'HIGH' else 'Medium',
                'icon': 'clock'
            })
        
        if meta['resource_score'] < 2:
            recommendations.append({
                'title': 'Reallocate Available Resources',
                'action': 'Re-deploy cross-functional workforce and equipment from non-critical tasks to clear bottlenecks.',
                'priority': 'High' if meta['resource_score'] == 0 else 'Medium',
                'icon': 'users'
            })

        if cost_risk in ['HIGH', 'MEDIUM']:
            recommendations.append({
                'title': 'Audit Expenditure & Cost Controls',
                'action': 'Implement variance analysis on material procurement, vendor payouts, and monitor burn rate closely.',
                'priority': 'High' if cost_risk == 'HIGH' else 'Medium',
                'icon': 'trending-down'
            })

        if meta['milestone_score'] != 2 or meta['p_dev'] > 8:
            recommendations.append({
                'title': 'Rebaseline & Prioritize Critical Milestones',
                'action': 'Reschedule intermediate milestones with primary contractors while holding key completion dates firm.',
                'priority': 'Medium',
                'icon': 'flag'
            })

        recommendations.append({
            'title': 'Continuous AI Monitoring',
            'action': 'Maintain weekly data entry intervals to let predictive models adapt to newly completed tasks.',
            'priority': 'Low',
            'icon': 'cpu'
        })

        # Automated Alert generation if risk exceeds threshold
        alert = None
        if overall_risk == 'HIGH':
            alert = {
                'type': 'CRITICAL_RISK',
                'severity': 'Critical',
                'title': f'CRITICAL RISK DETECTED: {data.get("name", "Project")}',
                'message': f'Predicted delay of {pred_delay_days} days and projected cost overrun of ₹{pred_overrun_lakhs} Lakhs.',
                'actions': [r['title'] for r in recommendations[:3]]
            }
        elif overall_risk == 'MEDIUM':
            alert = {
                'type': 'WARNING_RISK',
                'severity': 'Warning',
                'title': f'MODERATE RISK: {data.get("name", "Project")}',
                'message': f'Early warnings detected in schedule adherence ({pred_delay_days} days potential delay).',
                'actions': [r['title'] for r in recommendations[:2]]
            }

        return {
            'overall_risk': overall_risk,
            'delay_risk': delay_risk,
            'cost_risk': cost_risk,
            'health_score': health_score,
            'risk_score': risk_score,
            'predicted_delay_days': pred_delay_days,
            'estimated_cost_overrun': pred_overrun_lakhs,
            'priority_risk': priority_risk,
            'major_risk_factors': factors,
            'recommendations': recommendations,
            'alert': alert,
            'metrics_summary': {
                'planned_progress': meta['planned_prog'],
                'actual_progress': meta['actual_prog'],
                'progress_deviation': round(meta['p_dev'], 1),
                'cost_deviation_lakhs': round(cost_deviation, 2),
                'delayed_activities': meta['delayed_activities'],
                'budget': meta['budget'],
                'actual_expenditure': meta['actual_exp']
            }
        }

    def answer_ai_query(self, query, project=None, all_projects=None):
        """
        AI Project Intelligence Assistant engine (Prototype Screen 6).
        Answers natural language queries from stakeholders using analytical project data.
        """
        query_lower = query.lower().strip()
        
        # If user asks why a specific project is at risk
        if project:
            eval_res = self.evaluate_project(project)
            p_name = project.get('name', 'This project')
            
            if 'why' in query_lower or 'reason' in query_lower or 'risk' in query_lower:
                reasons = []
                for f in eval_res['major_risk_factors']:
                    if f['impact'] in ['HIGH', 'MEDIUM']:
                        reasons.append(f['factor'].lower())
                
                if not reasons:
                    return {
                        'answer': f"**{p_name}** is currently in good standing with an AI Health Score of **{eval_res['health_score']}%** ({eval_res['overall_risk']} Risk). Actual progress ({project.get('completion_percentage')}%) is on track with scheduled milestones, and expenditure remains within safe margins.",
                        'project': p_name,
                        'risk': eval_res['overall_risk']
                    }
                
                reasons_str = "; ".join(reasons)
                rec_actions = [f"• {r['title']}: {r['action']}" for r in eval_res['recommendations'][:3]]
                rec_str = "\n".join(rec_actions)
                
                return {
                    'answer': f"**{p_name}** is classified at **{eval_res['overall_risk']} RISK** (Health Score: **{eval_res['health_score']}%**) primarily because: **{reasons_str}**.\n\n"
                              f"• **Predicted Schedule Delay:** {eval_res['predicted_delay_days']} Days\n"
                              f"• **Estimated Cost Overrun:** ₹{eval_res['estimated_cost_overrun']} Lakhs\n"
                              f"• **Priority Risk:** {eval_res['priority_risk']}\n\n"
                              f"**Recommended Stakeholder Actions:**\n{rec_str}",
                    'project': p_name,
                    'risk': eval_res['overall_risk']
                }

            if 'recommend' in query_lower or 'action' in query_lower or 'fix' in query_lower or 'how' in query_lower:
                recs = [f"**{i+1}. {r['title']}** ({r['priority']} Priority)\n{r['action']}" for i, r in enumerate(eval_res['recommendations'])]
                return {
                    'answer': f"### Recommended Action Plan for {p_name}:\n\n" + "\n\n".join(recs),
                    'project': p_name,
                    'risk': eval_res['overall_risk']
                }

            if 'delay' in query_lower or 'timeline' in query_lower or 'schedule' in query_lower:
                return {
                    'answer': f"**{p_name}** currently has **{eval_res['predicted_delay_days']} days** of predicted schedule delay ({eval_res['delay_risk']} Delay Risk). There are **{project.get('delayed_activities', 0)} delayed activities** on the critical path.",
                    'project': p_name,
                    'delay_days': eval_res['predicted_delay_days']
                }

            if 'cost' in query_lower or 'budget' in query_lower or 'expenditure' in query_lower or 'money' in query_lower:
                return {
                    'answer': f"**{p_name}** has an approved budget of **₹{project.get('budget')} Lakhs** with actual expenditure recorded at **₹{project.get('actual_expenditure')} Lakhs** ({(float(project.get('actual_expenditure',0))/max(1, float(project.get('budget',1)))*100):.1f}% utilized). The ML model predicts an estimated cost overrun of **₹{eval_res['estimated_cost_overrun']} Lakhs** ({eval_res['cost_risk']} Cost Overrun Risk).",
                    'project': p_name,
                    'overrun': eval_res['estimated_cost_overrun']
                }

        # Global queries across all projects
        if all_projects:
            total = len(all_projects)
            high_risk = [p for p in all_projects if p.get('overall_risk') == 'HIGH']
            med_risk = [p for p in all_projects if p.get('overall_risk') == 'MEDIUM']
            low_risk = [p for p in all_projects if p.get('overall_risk') == 'LOW']

            if 'critical' in query_lower or 'high risk' in query_lower or 'worst' in query_lower:
                if not high_risk:
                    return {'answer': "Great news! Currently, no projects are flagged under High Critical Risk."}
                names = [f"• **{p['name']}** ({p['category']}, ₹{p['budget']} Lakhs budget) - Predicted Delay: {p.get('predicted_delay_days', 0)} days" for p in high_risk]
                return {
                    'answer': f"There are currently **{len(high_risk)} critical high-risk projects** requiring immediate intervention:\n\n" + "\n".join(names)
                }

            if 'summary' in query_lower or 'overview' in query_lower or 'status' in query_lower or 'health' in query_lower:
                avg_health = round(sum(p.get('health_score', 70) for p in all_projects) / max(1, total), 1)
                return {
                    'answer': f"### Portfolio Health Summary\n"
                              f"• **Total Projects Monitored:** {total}\n"
                              f"• **On Track (Low Risk):** {len(low_risk)}\n"
                              f"• **Attention Needed (Medium Risk):** {len(med_risk)}\n"
                              f"• **Critical (High Risk):** {len(high_risk)}\n"
                              f"• **Average System Health Index:** {avg_health}%\n\n"
                              f"You can select any specific project to inspect detailed ML risk factors or generate immediate remediation plans."
                }

        return {
            'answer': "I am your **AI Project Intelligence Assistant**. You can ask me:\n"
                      "• *'Why is [Project Name] at high risk?'*\n"
                      "• *'Which projects are critical?'*\n"
                      "• *'Show portfolio summary and health index'*\n"
                      "• *'What are the recommended actions for schedule delays?'*"
        }

# Global singleton instance
ml_engine = ProjectRiskMLEngine()
