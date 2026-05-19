# Email & PDF System - Setup Guide

## ✅ What's Been Implemented

### Backend Services

1. **Email Service** (`backend/services/emailService.js`)
   - Send welcome emails with login credentials
   - Send exam result PDFs via email
   - Professional HTML templates with ExamRoom branding
   - Microsoft 365 SMTP integration

2. **PDF Service** (`backend/services/pdfService.js`)
   - Professional A4 PDF generation
   - Student information header
   - Color-coded score summary
   - Question-by-question breakdown
   - Explanations for incorrect answers
   - Page numbering

3. **API Endpoints** (added to `backend/routes/adminRoutes.js`)
   - `GET /api/admin/submissions/:submissionId/pdf` - Download PDF
   - `POST /api/admin/submissions/:submissionId/email` - Email PDF to student

4. **Modified User Creation** (`backend/controllers/adminController.js`)
   - Auto-generates username/password if not provided
   - Accepts `sendEmail` parameter
   - Sends welcome email with credentials
   - Returns credentials in response for manual sharing

### Frontend Features

1. **User Creation** ([src/pages/Admin/Users.jsx](src/pages/Admin/Users.jsx))
   - Email input field (optional)
   - "Send credentials via email" checkbox
   - Auto-enabled when valid email provided
   - Disabled for @placeholder.local emails

2. **Submission Detail** ([src/pages/Admin/SubmissionDetail.jsx](src/pages/Admin/SubmissionDetail.jsx))
   - "Download PDF" button - generates professional PDF
   - "Email Results" button - sends PDF to student email
   - Success feedback when email sent
   - Disabled if no valid email address

3. **API Integration** ([src/api.js](src/api.js))
   - `apiDownloadSubmissionPDF()` - fetches PDF blob
   - `apiEmailSubmissionPDF()` - triggers email send

### Dependencies Installed

Backend packages (already installed via npm install):
- `nodemailer@^6.9.8` - Email sending
- `pdfkit@^0.14.0` - PDF generation

---

## 🔧 Configuration Required

### Step 1: Backend Environment Variables

⚠️ **IMPORTANT**: Never commit `.env` files! Use environment variables or secrets management.

#### Option A: Set Environment Variables Directly (Recommended for Production)

**On Linux/Mac:**
```bash
export EMAIL_HOST=smtp.office365.com
export EMAIL_PORT=587
export EMAIL_SECURE=false
export EMAIL_USER=info@examroomedu.com
export EMAIL_PASSWORD=your_actual_password_here
```

**On Windows (PowerShell):**
```powershell
$env:EMAIL_HOST="smtp.office365.com"
$env:EMAIL_PORT="587"
$env:EMAIL_SECURE="false"
$env:EMAIL_USER="info@examroomedu.com"
$env:EMAIL_PASSWORD="your_actual_password_here"
```

**Using PM2 (recommended for persistent deployment):**
```bash
pm2 start server.js --name backend --update-env -- \
  EMAIL_HOST=smtp.office365.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=info@examroomedu.com \
  EMAIL_PASSWORD=your_actual_password_here
```

#### Option B: Local `.env` File (Development Only)

Only if using locally and `.env` is in `.gitignore`:

```env
# Email Configuration (Microsoft 365 / Office 365)
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=info@examroomedu.com
EMAIL_PASSWORD=your_actual_password_here
```

**Verify `.env` is excluded from git:**
```bash
git check-ignore backend/.env  # Should output: backend/.env
```

### Step 2: Microsoft 365 Account Setup

1. **Use your existing Microsoft 365 email**: `info@examroomedu.com`

2. **Enable SMTP Authentication**:
   - Log into Microsoft 365 Admin Center
   - Go to Users → Active Users
   - Select the account (`info@examroomedu.com`)
   - Click "Mail" → "Manage email apps"
   - Enable "Authenticated SMTP"
   - Save changes

3. **Get the password**:
   - Use the account's regular password
   - OR create an app-specific password if MFA is enabled:
     - Go to Microsoft Account Security
     - Select "Advanced security options"
     - Under "App passwords", create new password
     - Use this password in EMAIL_PASSWORD

### Step 3: Start/Restart Backend Server

**Using PM2 with environment variables:**
```bash
cd backend
pm2 start server.js --name backend --update-env -- \
  EMAIL_HOST=smtp.office365.com \
  EMAIL_PORT=587 \
  EMAIL_SECURE=false \
  EMAIL_USER=info@examroomedu.com \
  EMAIL_PASSWORD=your_actual_password_here
```

**Or restart if already running:**
```bash
pm2 restart backend --update-env
```

**Or using npm (for development):**
```bash
cd backend
npm start
```

---

## 📧 How to Use

### Sending Credentials on Student Creation

1. Go to Admin → User Management
2. Click "New User"
3. Fill in Last Name, First Name
4. Enter student's email address
5. Leave Username and Password empty (auto-generated)
6. Check "Send credentials via email" (auto-checked)
7. Click "Create"
8. If email is enabled: Student receives email with credentials
9. If email is disabled: Credentials shown on screen for manual sharing

### Sending Exam Results

1. Go to Admin → Submissions
2. Click on a submission to view details
3. Click "Download PDF" to save locally
4. OR click "Email Results" to send to student's email
5. Confirm the email address in the popup
6. Success message appears when sent

---

## 📋 Email Templates

### Welcome Email (Student Credentials)

**Subject:** Welcome to ExamRoom - Your Login Credentials

**Content:**
- Welcome message with student name
- Username (copy-friendly)
- Password (copy-friendly)
- Login URL
- ExamRoom branding

### Exam Results Email

**Subject:** Your Exam Results - [Exam Title]

**Content:**
- Personalized greeting
- Score summary
- PDF attachment with detailed results
- ExamRoom branding

---

## 🔍 Testing the System

### Test 1: Send Welcome Email

```bash
# Create a test student with email
curl -X POST http://localhost:4000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "Student",
    "email": "your.test@email.com",
    "sendEmail": true
  }'
```

Check your test email inbox for the welcome email.

### Test 2: Email Exam Results

```bash
# Email a submission PDF
curl -X POST http://localhost:4000/api/admin/submissions/1/email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check the student's email inbox for the results.

### Test 3: Download PDF

```bash
# Download a submission PDF
curl -X GET http://localhost:4000/api/admin/submissions/1/pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output result.pdf
```

Open `result.pdf` to verify formatting.

---

## 🐛 Troubleshooting

### Email Not Sending

**Error: "Authentication failed"**
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Ensure SMTP Authentication is enabled in Microsoft 365
- Try using an app-specific password if MFA is enabled

**Error: "Connection timeout"**
- Check firewall isn't blocking port 587
- Verify EMAIL_HOST is `smtp.office365.com`
- Try EMAIL_PORT=25 or 465 as alternatives

**Error: "No valid email address"**
- Student must have a real email (not @placeholder.local)
- Update student email in User Management

### PDF Not Generating

**Error: "Failed to generate PDF"**
- Check backend logs for detailed error
- Ensure pdfkit is installed: `npm list pdfkit`
- Verify submission data is complete

**PDF looks wrong**
- Update `backend/services/pdfService.js` for custom formatting
- Adjust fonts, colors, or layout as needed

### Frontend Issues

**Button disabled**
- Email button requires valid email (not @placeholder.local)
- Check browser console for API errors

**Email success but not received**
- Check spam/junk folder
- Verify email address is correct
- Check backend logs for sending errors

---

## 📝 Next Steps (Optional Enhancements)

1. **Custom Email Templates**: Modify `emailService.js` for custom branding
2. **PDF Customization**: Adjust `pdfService.js` for different PDF layouts
3. **Bulk Email**: Add feature to email results to multiple students at once
4. **Email Queue**: Implement job queue for large email batches
5. **Email Tracking**: Add delivery confirmation and read receipts
6. **Attachment Options**: Allow attaching additional documents

---

## 🔐 Security Notes

- **NEVER commit `.env` files or credentials to git**
- Use environment variables or secrets management in production
- Use app-specific passwords for MFA-enabled accounts
- Regularly rotate email passwords
- Monitor email sending limits (Microsoft 365: 10,000/day)
- Validate email addresses before sending
- Sanitize user inputs in email templates
- Consider using secrets management tools:
  - PM2 ecosystem file with environment variables
  - Docker secrets
  - Cloud provider secrets (AWS Secrets Manager, Azure Key Vault)
  - HashiCorp Vault

---

## 📞 Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify environment variables are set correctly
3. Test SMTP connection separately
4. Review Microsoft 365 email settings
5. Check backend/frontend console for errors

**Backend Logs Location**: Check your PM2 logs or console output
**Frontend Errors**: Open browser DevTools → Console tab
