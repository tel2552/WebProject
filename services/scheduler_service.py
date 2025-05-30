# backend_scheduler.py
from datetime import datetime, timedelta
try:
    from database import complaints_collection, email_recipients_collection
    from services.email_service import send_near_overdue_notification_email
except ImportError:
    # Fallback for running directly if paths are not set up for module import
    # This might happen if you run `python backend_scheduler.py` from its own directory
    # without the project root in PYTHONPATH.
    # For a real deployment, ensure your project structure and PYTHONPATH are correct.
    import sys
    import os
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')) # Adjust '..' if scheduler is deeper
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    from database import complaints_collection, email_recipients_collection
    from services.email_service import send_near_overdue_notification_email


# --- Configuration Constants ---
SEVERITY_LIMITS = {
    "medium": 7,    # days
    "high": 3,       # days
    "critical": 1,   # days
    "low": float('inf')  # Low severity complaints do not become overdue by this logic
}

# Statuses eligible for becoming overdue
OVERDUE_ELIGIBLE_STATUSES = ["Pending", "Admit", "Resolved"]
# Note: "Admit" is the backend status, frontend might display it as "On Process"

# --- Helper Functions ---
def get_team_email_address(team_name: str) -> str | None:
    """
    Retrieves the email address for a given team name from the database.
    """
    if not team_name:
        return None
    recipient_doc = email_recipients_collection.find_one({"team": team_name})
    return recipient_doc["email"] if recipient_doc and "email" in recipient_doc else None

def parse_complaint_date(date_str: str) -> datetime | None:
    """
    Parses the complaint date string into a datetime object.
    Handles common ISO formats and simple YYYY-MM-DD.
    """
    if not date_str:
        return None
    try:
        # Attempt to parse ISO 8601 format (e.g., from datetime.utcnow().isoformat() or JavaScript new Date().toISOString())
        if 'T' in date_str:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None) # Ensure naive datetime for comparison
        # Attempt to parse YYYY-MM-DD
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        print(f"Warning: Could not parse date string: {date_str}")
        return None

# --- Main Scheduler Logic ---
def check_and_notify_near_overdue_complaints():
    """
    Checks for complaints that are one day away from becoming overdue and sends email notifications.
    """
    print(f"[{datetime.now()}] Running 'Near Overdue' complaints check...")
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) # Normalize to start of day UTC

    # Query for complaints that:
    # 1. Are in an eligible status.
    # 2. Have a severity level that can become overdue.
    # 3. Have not already been marked as 'near_overdue_notified'.
    # 4. Do not have a 'completion_date' or 'cancellation_date' (or similar fields indicating they are closed).
    query = {
        "status": {"$in": OVERDUE_ELIGIBLE_STATUSES},
        "severity_level": {"$in": list(SEVERITY_LIMITS.keys() - {'low'})}, # Exclude 'low' severity
        "near_overdue_notified": {"$ne": True}, # Or {"$exists": False} if the field might not be present
        # Add conditions to exclude already completed/cancelled complaints if you have such fields
        # e.g., "complete_date": {"$exists": False}, "cancellation_reason": {"$exists": False}
    }

    complaints_to_check = list(complaints_collection.find(query))
    notifications_sent_count = 0

    if not complaints_to_check:
        print(f"[{datetime.now()}] No complaints found matching the 'Near Overdue' criteria.")
        return

    print(f"[{datetime.now()}] Found {len(complaints_to_check)} complaints to evaluate for 'Near Overdue' notification.")

    for complaint in complaints_to_check:
        complaint_id_str = str(complaint["_id"])
        complaint_date_str = complaint.get("date")
        severity_level = complaint.get("severity_level", "").lower()
        team_name = complaint.get("team")
        complaint_title = complaint.get("title", "N/A")

        if not complaint_date_str or not severity_level or severity_level == 'low' or severity_level not in SEVERITY_LIMITS:
            # print(f"Skipping complaint {complaint_id_str}: Missing date, severity, or invalid severity '{severity_level}'.")
            continue

        complaint_date_obj = parse_complaint_date(complaint_date_str)
        if not complaint_date_obj:
            print(f"Skipping complaint {complaint_id_str}: Could not parse date '{complaint_date_str}'.")
            continue
        
        # Normalize complaint_date_obj to start of day for consistent day difference calculation
        complaint_date_obj = complaint_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)

        limit_days = SEVERITY_LIMITS[severity_level]
        days_passed = (today - complaint_date_obj).days

        # Check if the complaint is exactly one day away from becoming overdue
        if days_passed == (limit_days - 1):
            print(f"Complaint {complaint_id_str} ('{complaint_title}') is 1 day from overdue (Limit: {limit_days} days, Passed: {days_passed} days).")
            
            recipient_email = get_team_email_address(team_name)
            if not recipient_email:
                print(f"Warning: No email address found for team '{team_name}' for complaint {complaint_id_str}. Cannot send notification.")
                continue

            overdue_on_date = today + timedelta(days=1) # It will be overdue tomorrow
            overdue_date_str_for_email = overdue_on_date.strftime("%d/%m/%Y")

            try:
                send_near_overdue_notification_email(
                    complaint_title=complaint_title,
                    complaint_id=complaint_id_str,
                    team_name=team_name,
                    recipient_email=recipient_email,
                    overdue_date_str=overdue_date_str_for_email
                )
                # Mark the complaint as notified to prevent duplicate emails
                complaints_collection.update_one(
                    {"_id": complaint["_id"]},
                    {"$set": {"near_overdue_notified": True, "near_overdue_notified_at": datetime.utcnow()}}
                )
                notifications_sent_count += 1
                print(f"Successfully sent 'Near Overdue' notification for complaint {complaint_id_str} to {recipient_email}.")
            except Exception as e:
                print(f"Error sending 'Near Overdue' notification or updating status for complaint {complaint_id_str}: {e}")
        # else:
            # print(f"Complaint {complaint_id_str} is not 1 day from overdue. Days passed: {days_passed}, Limit: {limit_days}")


    print(f"[{datetime.now()}] 'Near Overdue' check finished. Notifications sent: {notifications_sent_count}.")

# --- Main Execution (for manual run or cron job) ---
if __name__ == "__main__":
    print("Starting manual check for near overdue complaints...")
    check_and_notify_near_overdue_complaints()
    print("Manual check finished.")

