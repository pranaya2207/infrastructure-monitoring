import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database.db import init_db, insert_project, get_db_connection
from ml_engine.model import ml_engine

SEED_PROJECTS = [
    # 2 Critical Projects (High Risk)
    {
        'name': 'Metro Rail Phase 2 - Blue Line Corridor',
        'category': 'Transportation',
        'location': 'Bengaluru, Karnataka',
        'budget': 8500.0,
        'planned_duration': 36.0,
        'start_date': '2024-01-15',
        'expected_completion_date': '2027-01-15',
        'completion_percentage': 32.0,
        'actual_expenditure': 4950.0,
        'delayed_activities': 6,
        'resource_availability': 'Low',
        'milestone_status': 'Critical Delay',
        'planned_progress': 54.0,
        'override_planned_progress': True
    },
    {
        'name': 'Smart City Integrated Water Pipeline Network',
        'category': 'Water Resources',
        'location': 'Chennai, Tamil Nadu',
        'budget': 3200.0,
        'planned_duration': 24.0,
        'start_date': '2024-06-01',
        'expected_completion_date': '2026-06-01',
        'completion_percentage': 28.0,
        'actual_expenditure': 2100.0,
        'delayed_activities': 5,
        'resource_availability': 'Low',
        'milestone_status': 'Critical Delay',
        'planned_progress': 52.0,
        'override_planned_progress': True
    },

    # 3 At Risk Projects (Medium Risk)
    {
        'name': 'National Highway 44 Expressway Widening (Sec-4)',
        'category': 'Infrastructure',
        'location': 'Hyderabad - Nagpur Corridor',
        'budget': 6400.0,
        'planned_duration': 30.0,
        'start_date': '2024-03-01',
        'expected_completion_date': '2026-09-01',
        'completion_percentage': 48.0,
        'actual_expenditure': 3650.0,
        'delayed_activities': 3,
        'resource_availability': 'Medium',
        'milestone_status': 'Minor Delay',
        'planned_progress': 58.0,
        'override_planned_progress': True
    },
    {
        'name': 'AI-Powered Municipal Traffic Control Center',
        'category': 'Software/IT',
        'location': 'Pune, Maharashtra',
        'budget': 950.0,
        'planned_duration': 18.0,
        'start_date': '2024-08-01',
        'expected_completion_date': '2026-02-01',
        'completion_percentage': 60.0,
        'actual_expenditure': 680.0,
        'delayed_activities': 2,
        'resource_availability': 'Medium',
        'milestone_status': 'Minor Delay',
        'planned_progress': 72.0,
        'override_planned_progress': True
    },
    {
        'name': 'Digital Health Records & Telemedicine Network',
        'category': 'Healthcare',
        'location': 'Jaipur, Rajasthan',
        'budget': 1450.0,
        'planned_duration': 18.0,
        'start_date': '2024-07-15',
        'expected_completion_date': '2026-01-15',
        'completion_percentage': 55.0,
        'actual_expenditure': 920.0,
        'delayed_activities': 2,
        'resource_availability': 'Medium',
        'milestone_status': 'Minor Delay',
        'planned_progress': 68.0,
        'override_planned_progress': True
    },

    # 7 On Track Projects (Low Risk)
    {
        'name': 'Solar Microgrid & Energy Storage Hub',
        'category': 'Energy',
        'location': 'Bhadla, Rajasthan',
        'budget': 4200.0,
        'planned_duration': 24.0,
        'start_date': '2024-02-01',
        'expected_completion_date': '2026-02-01',
        'completion_percentage': 82.0,
        'actual_expenditure': 3350.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 84.0,
        'override_planned_progress': True
    },
    {
        'name': 'State Optical Fiber Rural Connectivity Grid',
        'category': 'Software/IT',
        'location': 'Kerala State',
        'budget': 2100.0,
        'planned_duration': 20.0,
        'start_date': '2024-04-01',
        'expected_completion_date': '2025-12-01',
        'completion_percentage': 76.0,
        'actual_expenditure': 1520.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 78.0,
        'override_planned_progress': True
    },
    {
        'name': 'High-Speed Rail Station Redevelopment',
        'category': 'Transportation',
        'location': 'Ahmedabad, Gujarat',
        'budget': 5600.0,
        'planned_duration': 36.0,
        'start_date': '2024-05-01',
        'expected_completion_date': '2027-05-01',
        'completion_percentage': 42.0,
        'actual_expenditure': 2280.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 44.0,
        'override_planned_progress': True
    },
    {
        'name': 'Urban Stormwater Drainage & Flood Mitigation',
        'category': 'Infrastructure',
        'location': 'Kochi, Kerala',
        'budget': 1800.0,
        'planned_duration': 18.0,
        'start_date': '2024-09-01',
        'expected_completion_date': '2026-03-01',
        'completion_percentage': 52.0,
        'actual_expenditure': 910.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 53.0,
        'override_planned_progress': True
    },
    {
        'name': 'Interstate Electric Vehicle Fast Charging Corridors',
        'category': 'Energy',
        'location': 'Delhi - Mumbai Expressway',
        'budget': 1250.0,
        'planned_duration': 14.0,
        'start_date': '2024-10-01',
        'expected_completion_date': '2025-12-01',
        'completion_percentage': 68.0,
        'actual_expenditure': 810.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 70.0,
        'override_planned_progress': True
    },
    {
        'name': 'Automated Port Container Terminal Expansion',
        'category': 'Transportation',
        'location': 'Visakhapatnam, Andhra Pradesh',
        'budget': 7800.0,
        'planned_duration': 36.0,
        'start_date': '2024-03-15',
        'expected_completion_date': '2027-03-15',
        'completion_percentage': 46.0,
        'actual_expenditure': 3450.0,
        'delayed_activities': 1,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 47.0,
        'override_planned_progress': True
    },
    {
        'name': 'Smart Grid AMI Advanced Metering Deployment',
        'category': 'Energy',
        'location': 'Indore, Madhya Pradesh',
        'budget': 1600.0,
        'planned_duration': 16.0,
        'start_date': '2024-11-01',
        'expected_completion_date': '2026-03-01',
        'completion_percentage': 38.0,
        'actual_expenditure': 580.0,
        'delayed_activities': 0,
        'resource_availability': 'High',
        'milestone_status': 'On Schedule',
        'planned_progress': 39.0,
        'override_planned_progress': True
    }
]

def seed():
    print("Initializing SQLite database...")
    init_db()
    
    # Clear existing projects & alerts if re-seeding
    conn = get_db_connection()
    conn.execute('DELETE FROM projects')
    conn.execute('DELETE FROM alerts')
    conn.commit()
    conn.close()

    print(f"Seeding {len(SEED_PROJECTS)} projects with ML predictions...")
    for proj in SEED_PROJECTS:
        eval_res = ml_engine.evaluate_project(proj)
        insert_project(proj, eval_res)
        print(f"  + Added '{proj['name']}' -> Risk: {eval_res['overall_risk']} (Health: {eval_res['health_score']}%)")

    print("Seeding completed successfully!")

if __name__ == '__main__':
    seed()
