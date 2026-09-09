import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

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
            public_benefit TEXT,
            scope_deliverables TEXT,
            lead_contractor TEXT,
            nodal_officer TEXT,
            funding_mode TEXT,
            current_stage TEXT,
            last_inspection TEXT,
            citizen_helpline TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    ''')

    # Graceful migration for existing SQLite projects tables
    existing_cols = [row[1] for row in cursor.execute('PRAGMA table_info(projects)').fetchall()]
    new_cols = [
        ('public_benefit', 'TEXT'),
        ('scope_deliverables', 'TEXT'),
        ('lead_contractor', 'TEXT'),
        ('nodal_officer', 'TEXT'),
        ('funding_mode', 'TEXT'),
        ('current_stage', 'TEXT'),
        ('last_inspection', 'TEXT'),
        ('citizen_helpline', 'TEXT')
    ]
    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            cursor.execute(f'ALTER TABLE projects ADD COLUMN {col_name} {col_type}')

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

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            designation TEXT,
            ministry TEXT,
            clearance TEXT DEFAULT 'Level-2 (Authorized)',
            role TEXT DEFAULT 'OFFICER',
            created_at TEXT
        )
    ''')

    # Seed default authorized government users if table is empty
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        default_users = [
            (
                'Dr. Rajesh Verma, IAS',
                'admin.pmo@nic.in',
                generate_password_hash('Admin@2026'),
                'Cabinet Secretary / PMO Nodal Administrator',
                'Cabinet Secretariat & PMO',
                'Level-3 (Cabinet Confidential)',
                'ADMIN',
                now_str
            ),
            (
                'Amit Singhal, IRSE',
                'js.morth@gov.in',
                generate_password_hash('Infra@2026'),
                'Joint Secretary (Highways & Corridors)',
                'Ministry of Road Transport & Highways',
                'Level-2 (Secret)',
                'OFFICER',
                now_str
            ),
            (
                'Priya Nambiar, IRTS',
                'director.infra@gov.in',
                generate_password_hash('Rail@2026'),
                'Director (EVM & Mega-Projects)',
                'Ministry of Railways & DFCCIL',
                'Level-2 (Secret)',
                'OFFICER',
                now_str
            )
        ]
        cursor.executemany('''
            INSERT INTO users (name, email, password_hash, designation, ministry, clearance, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', default_users)

    conn.commit()
    conn.close()

def create_user(name, email, password, designation='', ministry='', clearance='Level-2 (Authorized)', role='OFFICER'):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    email_clean = email.strip().lower()
    name_clean = name.strip()
    
    cursor.execute('SELECT id FROM users WHERE LOWER(email) = ?', (email_clean,))
    if cursor.fetchone():
        conn.close()
        return {'success': False, 'error': 'An account with this Official Email already exists.'}
        
    pw_hash = generate_password_hash(password)
    cursor.execute('''
        INSERT INTO users (name, email, password_hash, designation, ministry, clearance, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name_clean, email_clean, pw_hash, designation.strip(), ministry.strip(), clearance, role, now_str))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        'success': True,
        'user': {
            'id': user_id,
            'name': name_clean,
            'email': email_clean,
            'designation': designation.strip() or 'Authorized Officer',
            'ministry': ministry.strip() or 'National Infrastructure',
            'clearance': clearance,
            'role': role,
            'created_at': now_str
        }
    }

def get_user_by_email(email):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE LOWER(email) = ?', (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    return row_to_dict(row)

def authenticate_user(email, password, name=None):
    user = get_user_by_email(email)
    if not user:
        return {'success': False, 'error': 'Official Email / Government ID not found.'}
    
    if not check_password_hash(user['password_hash'], password):
        return {'success': False, 'error': 'Incorrect Security Password.'}
    
    # If a name was entered in the login form, use it for user display if desired
    display_name = name.strip() if (name and name.strip()) else user['name']
    
    user_dict = {
        'id': user['id'],
        'name': display_name,
        'email': user['email'],
        'designation': user.get('designation') or 'Authorized Officer',
        'ministry': user.get('ministry') or 'National Infrastructure',
        'clearance': user.get('clearance') or 'Level-2 (Authorized)',
        'role': user.get('role') or 'OFFICER',
        'loginTime': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    return {'success': True, 'user': user_dict}

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

    name = data.get('name', 'Untitled Project')
    category = data.get('category') or data.get('ministry') or 'Infrastructure'
    location = data.get('location', 'Pan-India')
    budget = float(data.get('budget') if data.get('budget') is not None else (data.get('sanctioned_budget_cr') or 0.0))
    planned_duration = float(data.get('planned_duration') if data.get('planned_duration') is not None else (data.get('planned_duration_months') or 36.0))
    start_date = data.get('start_date', now_str[:10])
    expected_completion_date = data.get('expected_completion_date', now_str[:10])
    completion_percentage = float(data.get('completion_percentage') if data.get('completion_percentage') is not None else (data.get('physical_progress_pct') or 0.0))
    actual_expenditure = float(data.get('actual_expenditure') if data.get('actual_expenditure') is not None else (data.get('expenditure') or data.get('actual_expenditure_cr') or 0.0))
    delayed_activities = int(data.get('delayed_activities', 0))
    resource_availability = data.get('resource_availability', 'Medium')
    milestone_status = data.get('milestone_status', 'On Schedule')
    planned_progress = float(eval_res.get('metrics_summary', {}).get('planned_progress', completion_percentage))

    cursor.execute('''
        INSERT INTO projects (
            name, category, location, budget, planned_duration,
            start_date, expected_completion_date, completion_percentage,
            actual_expenditure, delayed_activities, resource_availability,
            milestone_status, planned_progress, delay_risk, cost_risk,
            overall_risk, health_score, risk_score, predicted_delay_days,
            estimated_cost_overrun, priority_risk,
            public_benefit, scope_deliverables, lead_contractor, nodal_officer,
            funding_mode, current_stage, last_inspection, citizen_helpline,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        name,
        category,
        location,
        budget,
        planned_duration,
        start_date,
        expected_completion_date,
        completion_percentage,
        actual_expenditure,
        delayed_activities,
        resource_availability,
        milestone_status,
        planned_progress,
        eval_res.get('delay_risk', 'Low'),
        eval_res.get('cost_risk', 'Low'),
        eval_res.get('overall_risk', 'LOW'),
        eval_res.get('health_score', 85.0),
        eval_res.get('risk_score', 15.0),
        eval_res.get('predicted_delay_days', 0),
        eval_res.get('estimated_cost_overrun', 0.0),
        eval_res.get('priority_risk', 'Low'),
        data.get('public_benefit', ''),
        data.get('scope_deliverables', ''),
        data.get('lead_contractor', ''),
        data.get('nodal_officer', ''),
        data.get('funding_mode', ''),
        data.get('current_stage', ''),
        data.get('last_inspection', ''),
        data.get('citizen_helpline', ''),
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
        ''', (new_id, name, alt['type'], alt['severity'], alt['title'], alt['message'], now_str))

    conn.commit()
    conn.close()
    return new_id

def update_project(project_id, data, eval_res):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    name = data.get('name', 'Untitled Project')
    category = data.get('category') or data.get('ministry') or 'Infrastructure'
    location = data.get('location', 'Pan-India')
    budget = float(data.get('budget') if data.get('budget') is not None else (data.get('sanctioned_budget_cr') or 0.0))
    planned_duration = float(data.get('planned_duration') if data.get('planned_duration') is not None else (data.get('planned_duration_months') or 36.0))
    start_date = data.get('start_date', now_str[:10])
    expected_completion_date = data.get('expected_completion_date', now_str[:10])
    completion_percentage = float(data.get('completion_percentage') if data.get('completion_percentage') is not None else (data.get('physical_progress_pct') or 0.0))
    actual_expenditure = float(data.get('actual_expenditure') if data.get('actual_expenditure') is not None else (data.get('expenditure') or data.get('actual_expenditure_cr') or 0.0))
    delayed_activities = int(data.get('delayed_activities', 0))
    resource_availability = data.get('resource_availability', 'Medium')
    milestone_status = data.get('milestone_status', 'On Schedule')
    planned_progress = float(eval_res.get('metrics_summary', {}).get('planned_progress', completion_percentage))

    cursor.execute('''
        UPDATE projects SET
            name = ?, category = ?, location = ?, budget = ?, planned_duration = ?,
            start_date = ?, expected_completion_date = ?, completion_percentage = ?,
            actual_expenditure = ?, delayed_activities = ?, resource_availability = ?,
            milestone_status = ?, planned_progress = ?, delay_risk = ?, cost_risk = ?,
            overall_risk = ?, health_score = ?, risk_score = ?, predicted_delay_days = ?,
            estimated_cost_overrun = ?, priority_risk = ?,
            public_benefit = ?, scope_deliverables = ?, lead_contractor = ?, nodal_officer = ?,
            funding_mode = ?, current_stage = ?, last_inspection = ?, citizen_helpline = ?,
            updated_at = ?
        WHERE id = ?
    ''', (
        name,
        category,
        location,
        budget,
        planned_duration,
        start_date,
        expected_completion_date,
        completion_percentage,
        actual_expenditure,
        delayed_activities,
        resource_availability,
        milestone_status,
        planned_progress,
        eval_res.get('delay_risk', 'Low'),
        eval_res.get('cost_risk', 'Low'),
        eval_res.get('overall_risk', 'LOW'),
        eval_res.get('health_score', 85.0),
        eval_res.get('risk_score', 15.0),
        eval_res.get('predicted_delay_days', 0),
        eval_res.get('estimated_cost_overrun', 0.0),
        eval_res.get('priority_risk', 'Low'),
        data.get('public_benefit', ''),
        data.get('scope_deliverables', ''),
        data.get('lead_contractor', ''),
        data.get('nodal_officer', ''),
        data.get('funding_mode', ''),
        data.get('current_stage', ''),
        data.get('last_inspection', ''),
        data.get('citizen_helpline', ''),
        now_str,
        project_id
    ))

    if eval_res.get('alert'):
        alt = eval_res['alert']
        cursor.execute('''
            INSERT INTO alerts (project_id, project_name, alert_type, severity, title, message, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')
        ''', (project_id, name, alt['type'], alt['severity'], alt['title'], alt['message'], now_str))

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
