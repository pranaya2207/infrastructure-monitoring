import os
from flask import Flask, render_template, request, jsonify
from database.db import (
    init_db, get_all_projects, get_project_by_id,
    insert_project, update_project, delete_project,
    get_all_alerts, resolve_alert
)
from ml_engine.model import ml_engine

app = Flask(__name__)
app.config['SECRET_KEY'] = 'projectguard-ai-enterprise-secret'
app.config['TEMPLATES_AUTO_RELOAD'] = True

# Ensure DB is initialized
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    projects = get_all_projects()
    alerts = get_all_alerts()
    active_alerts = [a for a in alerts if a.get('status') == 'Active']

    total = len(projects)
    on_track = sum(1 for p in projects if p.get('overall_risk') == 'LOW')
    at_risk = sum(1 for p in projects if p.get('overall_risk') == 'MEDIUM')
    critical = sum(1 for p in projects if p.get('overall_risk') == 'HIGH')

    total_budget = sum(float(p.get('budget', 0)) for p in projects)
    total_expenditure = sum(float(p.get('actual_expenditure', 0)) for p in projects)
    
    health_scores = [p.get('health_score', 70) for p in projects]
    overall_health = round(sum(health_scores) / max(1, total), 1) if total > 0 else 100.0

    total_delay_days = sum(int(p.get('predicted_delay_days', 0)) for p in projects)
    total_overrun = round(sum(float(p.get('estimated_cost_overrun', 0)) for p in projects), 2)

    # Risk distribution for Chart.js
    risk_distribution = {
        'On Track': on_track,
        'At Risk': at_risk,
        'Critical': critical
    }

    # Category breakdown
    categories = {}
    for p in projects:
        cat = p.get('category', 'Other')
        if cat not in categories:
            categories[cat] = {'count': 0, 'budget': 0, 'expenditure': 0}
        categories[cat]['count'] += 1
        categories[cat]['budget'] += float(p.get('budget', 0))
        categories[cat]['expenditure'] += float(p.get('actual_expenditure', 0))

    return jsonify({
        'total_projects': total,
        'on_track': on_track,
        'at_risk': at_risk,
        'critical': critical,
        'overall_health_pct': overall_health,
        'total_budget_lakhs': round(total_budget, 2),
        'total_expenditure_lakhs': round(total_expenditure, 2),
        'cost_utilization_pct': round((total_expenditure / max(1.0, total_budget)) * 100, 1),
        'total_predicted_delay_days': total_delay_days,
        'total_estimated_overrun_lakhs': total_overrun,
        'active_alerts_count': len(active_alerts),
        'risk_distribution': risk_distribution,
        'category_stats': categories
    })

@app.route('/api/projects', methods=['GET'])
def list_projects():
    category = request.args.get('category')
    risk = request.args.get('risk')
    search = request.args.get('search', '').lower().strip()

    projects = get_all_projects()

    filtered = []
    for p in projects:
        if category and p.get('category') != category:
            continue
        if risk and p.get('overall_risk') != risk:
            continue
        if search and (search not in p.get('name', '').lower() and search not in p.get('location', '').lower()):
            continue
        filtered.append(p)

    return jsonify({'projects': filtered, 'count': len(filtered)})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_details(project_id):
    project = get_project_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Run comprehensive ML evaluation & explainability
    eval_res = ml_engine.evaluate_project(project)
    
    return jsonify({
        'project': project,
        'ai_analysis': eval_res
    })

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('budget'):
        return jsonify({'error': 'Missing required project attributes (name, budget)'}), 400

    # Evaluate ML risk
    eval_res = ml_engine.evaluate_project(data)
    new_id = insert_project(data, eval_res)
    created_project = get_project_by_id(new_id)

    return jsonify({
        'message': 'Project created successfully with AI Risk Assessment',
        'project_id': new_id,
        'project': created_project,
        'ai_analysis': eval_res
    }), 201

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project_data(project_id):
    project = get_project_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    data = request.get_json()
    # Merge existing data with update
    merged = dict(project)
    merged.update(data)

    eval_res = ml_engine.evaluate_project(merged)
    update_project(project_id, merged, eval_res)
    updated = get_project_by_id(project_id)

    return jsonify({
        'message': 'Project updated and AI risk re-evaluated',
        'project': updated,
        'ai_analysis': eval_res
    })

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def remove_project(project_id):
    project = get_project_by_id(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    delete_project(project_id)
    return jsonify({'message': f"Project '{project['name']}' deleted successfully"})

@app.route('/api/alerts', methods=['GET'])
def list_alerts():
    alerts = get_all_alerts()
    return jsonify({'alerts': alerts, 'count': len(alerts)})

@app.route('/api/alerts/<int:alert_id>/resolve', methods=['POST'])
def resolve_system_alert(alert_id):
    resolve_alert(alert_id)
    return jsonify({'message': 'Alert marked as resolved'})

@app.route('/api/assistant/chat', methods=['POST'])
def assistant_chat():
    payload = request.get_json() or {}
    query = payload.get('query', '')
    project_id = payload.get('project_id')

    if not query.strip():
        return jsonify({'answer': 'Please enter a question regarding projects, risks, delays, or mitigations.'})

    project = get_project_by_id(project_id) if project_id else None
    all_projects = get_all_projects()

    # If query mentions a specific project by name, find it
    if not project:
        query_lower = query.lower()
        for p in all_projects:
            if p['name'].lower() in query_lower or p['category'].lower() in query_lower:
                project = p
                break

    response = ml_engine.answer_ai_query(query, project=project, all_projects=all_projects)
    return jsonify(response)

@app.route('/api/predict/simulate', methods=['POST'])
def simulate_prediction():
    data = request.get_json() or {}
    eval_res = ml_engine.evaluate_project(data)
    return jsonify({'simulation': eval_res})

if __name__ == '__main__':
    print("Starting AI Project Monitoring Server...")
    app.run(host='127.0.0.1', port=5000, debug=False)
