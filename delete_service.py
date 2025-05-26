from datetime import timedelta, datetime
from database import complaints_collection
from apscheduler.schedulers.background import BackgroundScheduler

# Initialize Background Scheduler
scheduler = BackgroundScheduler()

# Function to delete old cancelled complaints
def delete_old_cancelled_complaints():
    print("Starting job: delete_old_cancelled_complaints")
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    # Find and delete complaints that were cancelled more than 30 days ago
    complaints_collection.delete_many({
        "status": "Cancelled",
        "cancelled_date": {"$lte": thirty_days_ago}
    })
    print("Job completed: delete_old_cancelled_complaints")

# Start the scheduler
def start_scheduler():
    scheduler.add_job(delete_old_cancelled_complaints, 'interval', days=1)
    scheduler.start()
