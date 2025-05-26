import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ตั้งค่าข้อมูลอีเมล
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "ddds33970@gmail.com"
EMAIL_PASSWORD = "itkkyhrhlhkhsfjb"

def send_email(title, complaint_id, recipient_email):
    subject = "New Complaint Received"
    review_url = f"http://your-website.com/review-complaint/{complaint_id}"

    email_content = f"""
    <html>
        <body>
            <p>Dear Team,</p>
            <p>We have received a new complaint:</p>
            <p><strong>Title:</strong> {title}</p>
            <p><strong>Complaint ID:</strong> {complaint_id}</p>
            <p>Please click the link below to review the complaint:</p>
            <a href="{review_url}">Review Complaint</a>
            <p>Thank you,</p>
            <p>Your Team</p>
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