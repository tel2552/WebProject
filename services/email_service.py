import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ตั้งค่าข้อมูลอีเมล
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "ddds33970@gmail.com"
EMAIL_PASSWORD = "itkkyhrhlhkhsfjb"

def send_email(title, complaint_id, recipient_email, team_name):
    subject = "New Complaint Received"
    review_url = f"http://your-website.com/review-complaint/{complaint_id}"# นี้แค่ตัวอย่าง URL ควรเปลี่ยนหลังมี domain หลักแล้ว

    email_content = f"""
    <html>
        <body>
            <p>เรียน ทีม {team_name},</p>
            <p>เราได้รับการร้องเรียนใหม่:</p>
            <p><strong>เรื่อง:</strong> {title}</p>
            <p><strong>คำร้องเรียนหมายเลข:</strong> {complaint_id}</p>
            <p>กรุณาคลิกลิงก์ด้านล่างเพื่อตรวจสอบข้อร้องเรียน:</p>
            <a href="{review_url}">Review Complaint</a>
            <p>Thank you,</p>
        </body>
    </html>
    """
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(email_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_near_overdue_notification_email(complaint_title, complaint_id, team_name, recipient_email, overdue_date_str):
    """
    Sends an email notification for a complaint that is nearing its overdue date.

    Args:
        complaint_title (str): The title of the complaint.
        complaint_id (str): The ID of the complaint.
        team_name (str): The name of the team responsible.
        recipient_email (str): The email address of the recipient (team).
        overdue_date_str (str): The date when the complaint will become overdue (e.g., "dd/mm/yyyy").
    """
    subject = f"แจ้งเตือน: คำร้องเรียน '{complaint_title}' ใกล้ถึงกำหนดดำเนินการ"
    review_url = f"http://your-website.com/admin/complaints/{complaint_id}" # ตัวอย่าง URL ควรเปลี่ยนหลังมี domain หลักแล้ว

    email_content = f"""
    <html>
        <body>
            <p>เรียน ทีม {team_name},</p>
            <p>คำร้องเรียนหมายเลข '<strong>{complaint_id}</strong>' เรื่อง '<strong>{complaint_title}</strong>' ซึ่งทีมของท่านเป็นผู้รับผิดชอบ จะถึงกำหนดดำเนินการในวันพรุ่งนี้ (<strong>{overdue_date_str}</strong>).</p>
            <p>กรุณาตรวจสอบและดำเนินการโดยด่วน</p>
            <p>ท่านสามารถตรวจสอบรายละเอียดคำร้องเรียนได้ที่: <a href="{review_url}">ดูรายละเอียดคำร้องเรียน</a></p>
            <p>ขอแสดงความนับถือ,</p>
            <p>ระบบจัดการคำร้องเรียน</p>
        </body>
    </html>
    """
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(email_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
        print(f"Successfully sent near overdue notification email to {recipient_email} for complaint ID {complaint_id}")
    except Exception as e:
        print(f"Failed to send near overdue notification email for complaint ID {complaint_id}: {e}")

def send_forwarded_for_approval_email(complaint_title: str, complaint_id: str, team_name: str, forwarded_by: str, recipient_email: str, details_url: str):
    """
    Sends an email notification to an approver for a complaint that has been forwarded.

    Args:
        complaint_title (str): The title of the complaint.
        complaint_id (str): The ID of the complaint.
        team_name (str): The name of the team that handled the complaint.
        forwarded_by (str): The name/username of the admin who forwarded the complaint.
        recipient_email (str): The email address of the approver.
        details_url (str): URL for the approver to view complaint details.
    """
    subject = f"โปรดอนุมัติ: คำร้องเรียน '{complaint_title}' (ID: {complaint_id}) ได้รับการส่งต่อ"

    email_content = f"""
    <html>
        <body>
            <p>เรียน ผู้จัดการ/ผู้มีอำนาจอนุมัติ,</p>
            <p>คำร้องเรียนต่อไปนี้ได้รับการตรวจสอบเบื้องต้นและส่งต่อเพื่อขออนุมัติจากท่าน:</p>
            <p><strong>เรื่อง:</strong> {complaint_title}</p>
            <p><strong>หมายเลขคำร้องเรียน:</strong> {complaint_id}</p>
            <p><strong>ทีมผู้ดำเนินการเบื้องต้น:</strong> {team_name}</p>
            <p><strong>ผู้ส่งต่อ:</strong> {forwarded_by}</p>
            <p>กรุณาตรวจสอบรายละเอียดและดำเนินการอนุมัติผ่านระบบโดยคลิกที่ลิงก์ด้านล่าง:</p>
            <p><a href="{details_url}">ตรวจสอบและอนุมัติคำร้องเรียน</a></p>
            <p>ขอแสดงความนับถือ,</p>
            <p>ระบบจัดการคำร้องเรียน</p>
        </body>
    </html>
    """
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(email_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
        print(f"Successfully sent 'Forwarded for Approval' email to {recipient_email} for complaint ID {complaint_id}")
    except Exception as e:
        print(f"Failed to send 'Forwarded for Approval' email for complaint ID {complaint_id}: {e}")

def send_complaint_reverted_for_revision_email(
    complaint_title: str, 
    complaint_id: str, 
    team_name: str, 
    recipient_email: str, 
    rejection_reason: str, 
    reverted_by: str,
    details_url: str
):
    """
    Sends an email notification when a complaint is reverted for revision.

    Args:
        complaint_title (str): The title of the complaint.
        complaint_id (str): The ID of the complaint.
        team_name (str): The name of the team responsible.
        recipient_email (str): The email address of the team/admin to notify.
        rejection_reason (str): The reason provided by the approver for reverting.
        reverted_by (str): The name/username of the approver who reverted the complaint.
        details_url (str): URL for the team to view complaint details and revise.
    """
    subject = f"แก้ไขเพิ่มเติม: คำร้องเรียน '{complaint_title}' (ID: {complaint_id}) ถูกส่งกลับเพื่อแก้ไข"

    email_content = f"""
    <html>
        <body>
            <p>เรียน ทีม {team_name},</p>
            <p>คำร้องเรียนเรื่อง '<strong>{complaint_title}</strong>' (หมายเลข: <strong>{complaint_id}</strong>) ได้ถูกส่งกลับมาเพื่อให้ท่านดำเนินการแก้ไขเพิ่มเติม</p>
            <p><strong>ผู้ส่งกลับ:</strong> {reverted_by}</p>
            <p><strong>เหตุผล/คำแนะนำจากผู้อนุมัติ:</strong></p>
            <p>{rejection_reason}</p>
            <p>กรุณาตรวจสอบรายละเอียดและดำเนินการแก้ไขผ่านระบบโดยคลิกที่ลิงก์ด้านล่าง:</p>
            <p><a href="{details_url}">ตรวจสอบและแก้ไขคำร้องเรียน</a></p>
            <p>ขอแสดงความนับถือ,</p>
            <p>ระบบจัดการคำร้องเรียน</p>
        </body>
    </html>
    """
    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(email_content, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.sendmail(EMAIL_ADDRESS, recipient_email, msg.as_string())
        print(f"Successfully sent 'Reverted for Revision' email to {recipient_email} for complaint ID {complaint_id}")
    except Exception as e:
        print(f"Failed to send 'Reverted for Revision' email for complaint ID {complaint_id}: {e}")