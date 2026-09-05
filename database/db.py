import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'projects.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Projects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            budget REAL NOT NULL,
            planned_duration REAL NOT NULL,
            start_date TEXT NOT NULL,
            expected_completion_date TEXT NOT NULL,
            completion_percentage REAL NOT NULL,
            actual_expenditure REAL NOT NULL,
            delayed_activities INTEGER NOT NULL DEFAULT 0,
            resource_availability TEXT NOT NULL DEFAULT 'Medium',
            milestone_status TEXT NOT NULL DEFAULT 'On Schedule',
            planned_progress REAL,
            delay_risk TEXT,
            cost_risk TEXT,
            overall_risk TEXT,
            health_score INTEGER,
            risk_score INTEGER,
            predicted_delay_days INTEGER,
            estimated_cost_overrun REAL,
            priority_risk TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    ''')

    # Alerts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            project_name TEXT,
            alert_type TEXT,
            severity TEXT,
            title TEXT,
            message TEXT,
            created_at TEXT,
            status TEXT DEFAULT 'Active'
        )
    ''')

    conn.commit()
    conn.close()

def row_to_dict(row):
    return {key: row[key] for key in row.keys()} if row else None

def get_all_projects():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM projects ORDER BY overall_risk DESC, health_score ASC')
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

def get_project_by_id(project_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)

def insert_project(data, eval_res):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        INSERT INTO projects (
            name, category, location, budget, planned_duration,
            start_date, expected_completion_date, completion_percentage,
            actual_expenditure, delayed_activities, resource_availability,
            milestone_status, planned_progress, delay_risk, cost_risk,
            overall_risk, health_score, risk_score, predicted_delay_days,
            estimated_cost_overrun, priority_risk, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['category'],
        data['location'],
        float(data['budget']),
        float(data['planned_duration']),
        data['start_date'],
        data['expected_completion_date'],
        float(data['completion_percentage']),
        float(data['actual_expenditure']),
        int(data.get('delayed_activities', 0)),
        data.get('resource_availability', 'Medium'),
        data.get('milestone_status', 'On Schedule'),
        float(eval_res['metrics_summary']['planned_progress']),
        eval_res['delay_risk'],
        eval_res['cost_risk'],
        eval_res['overall_risk'],
        eval_res['health_score'],
        eval_res['risk_score'],
        eval_res['predicted_delay_days'],
        eval_res['estimated_cost_overrun'],
        eval_res['priority_risk'],
        now_str,
        now_str
    ))
    new_id = cursor.lastrowid

    # If alert generated, add to alerts table
    if eval_res.get('alert'):
        alt = eval_res['alert']
        cursor.execute('''
            INSERT INTO alerts (project_id, project_name, alert_type, severity, title, message, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        ''', (new_id, data['name'], alt['type'], alt['severity'], alt['title'], alt['message'], now_str))

    conn.commit()
    conn.close()
    return new_id

def update_project(project_id, data, eval_res):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    cursor.execute('''
        UPDATE projects SET
            name = ?, category = ?, location = ?, budget = ?, planned_duration = ?,
            start_date = ?, expected_completion_date = ?, completion_percentage = ?,
            actual_expenditure = ?, delayed_activities = ?, resource_availability = ?,
            milestone_status = ?, planned_progress = ?, delay_risk = ?, cost_risk = ?,
            overall_risk = ?, health_score = ?, risk_score = ?, predicted_delay_days = ?,
            estimated_cost_overrun = ?, priority_risk = ?, updated_at = ?
        WHERE id = ?
    ''', (
        data['name'],
        data['category'],
        data['location'],
        float(data['budget']),
        float(data['planned_duration']),
        data['start_date'],
        data['expected_completion_date'],
        float(data['completion_percentage']),
        float(data['actual_expenditure']),
        int(data.get('delayed_activities', 0)),
        data.get('resource_availability', 'Medium'),
        data.get('milestone_status', 'On Schedule'),
        float(eval_res['metrics_summary']['planned_progress']),
        eval_res['delay_risk'],
        eval_res['cost_risk'],
        eval_res['overall_risk'],
        eval_res['health_score'],
        eval_res['risk_score'],
        eval_res['predicted_delay_days'],
        eval_res['estimated_cost_overrun'],
        eval_res['priority_risk'],
        now_str,
        project_id
    ))

    if eval_res.get('alert'):
        alt = eval_res['alert']
        cursor.execute('''
            INSERT INTO alerts (project_id, project_name, alert_type, severity, title, message, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        ''', (project_id, data['name'], alt['type'], alt['severity'], alt['title'], alt['message'], now_str))

    conn.commit()
    conn.close()

def delete_project(project_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    cursor.execute('DELETE FROM alerts WHERE project_id = ?', (project_id,))
    conn.commit()
    conn.close()

def get_all_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM alerts ORDER BY id DESC LIMIT 50')
    rows = cursor.fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]

def resolve_alert(alert_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE alerts SET status = "Resolved" WHERE id = ?', (alert_id,))
    conn.commit()
    conn.close()
