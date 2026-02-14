const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const busboy = require('busboy');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

// Debug: log .env raw content so we can see why dotenv may not be injecting values
const fs = require('fs');
try {
  const rawEnv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  console.log('.env raw length=', rawEnv.length);
  console.log('.env preview lines=\n', rawEnv.split(/\r?\n/).slice(0, 30).join('\n'));
} catch (e) {
  console.log('Failed to read .env:', e && e.message ? e.message : e);
}

// OCR and PDF parsing utilities
let pdfParse;
let createTesseractWorker;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse not installed; PDF text extraction may be limited. Install with `npm i pdf-parse`.');
}
try {
  createTesseractWorker = require('tesseract.js').createWorker;
} catch (e) {
  console.warn('tesseract.js not installed; OCR fallback will be disabled. Install with `npm i tesseract.js`.');
}

const app = express();
// Enable CORS with permissive defaults but allow common custom headers and credentials
app.use(cors({ origin: true, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Email', 'X-Student-Email'] }));
// Ensure preflight requests are handled for all routes
// Rely on CORS middleware to handle preflight requests; avoid explicit app.options registration
// which can trigger path-to-regexp parsing errors in some environments.
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} ${req.url}`);
  next();
});
// Early check: reject requests with very large Content-Length to avoid ugly HTML errors
app.use((req, res, next) => {
  try {
    const len = req.headers['content-length'];
    if (len) {
      const n = parseInt(len, 10);
      if (!Number.isNaN(n) && n > 100 * 1024 * 1024) {
        console.error('Rejected request: content-length too large =', n);
        return res.status(413).json({ message: 'Payload too large', error: 'Content-Length exceeds 100MB' });
      }
      // log large but allowed sizes for debugging
      if (!Number.isNaN(n) && n > 5 * 1024 * 1024) {
        console.log(`Large request incoming: ${req.method} ${req.url} size=${n}`);
      }
    }
  } catch (e) {
    // ignore and continue
  }
  next();
});

// Increase body size limits to allow large base64 uploads in JSON/urlencoded/raw
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.raw({ limit: '100mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB (fallback to local URI)
let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pmsdb';
mongoUri = typeof mongoUri === 'string' ? mongoUri.replace(/^['"]|['"]$/g, '') : mongoUri;
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err && err.message ? err.message : err));

// Base schema fields shared by user types
const baseFields = {
  name: String,
  email: { type: String, index: true, unique: false },
  password: { type: String, required: true, select: false },
  phone: { type: String, match: [/^\d{10}$/, 'Phone must be exactly 10 digits'], index: false },
  studentId: String,
  resumeFileName: String,
  resumeData: String, // Base64 encoded resume file
  // notifications and feedback
  // profile picture fields
  profileFileName: String,
  profileData: String, // Base64 encoded image
  year: String,
  branch: String,
  course: String,
  skills: String,
  role: String,
  // note: ATS, notifications, feedback and project fields intentionally omitted from base schema
  // password reset fields
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // OTP fields for forgot password flow
  otp: String,
  otpExpire: Date,
  // faculty-specific fields (optional for other roles)
  employeeId: String,
  department: String,
  designation: String,
  specialization: String,
  // experience field removed from base schema by request
};

// Create schemas and models for each user type
// Students keep CGPA field; other user types do not have cgpa by design
const studentFields = {
  ...baseFields,
  cgpa: { type: Number, min: 0, max: 10, default: null },
  // ATS-related fields removed from student schema
};
const studentSchema = new mongoose.Schema(studentFields, { timestamps: true });
const facultySchema = new mongoose.Schema(baseFields, { timestamps: true });

// TPO schema
const tpoFields = { ...baseFields };
const tpoSchema = new mongoose.Schema(tpoFields, { timestamps: true });

// Admin schema: remove `department` and add `accessLevel`
const adminFields = { ...baseFields };
adminFields.accessLevel = { type: String, default: 'full' };
delete adminFields.department;
const adminSchema = new mongoose.Schema(adminFields, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);
const Faculty = mongoose.model('Faculty', facultySchema);
const Tpo = mongoose.model('Tpo', tpoSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Learning resources collection (documents or external links)
const learningResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['link', 'document'], default: 'document' },
  url: String, // for external links (videos, etc.)
  fileName: String,
  fileData: String, // base64 for stored documents
  mime: String,
  size: Number,
  uploadedBy: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const LearningResource = mongoose.model('LearningResource', learningResourceSchema);

// expose models collection list for controllers needing cross-collection checks
app.set('collections', [Student, Faculty, Tpo, Admin]);

// Suggestion / feedback schema between Admin and TPO
const suggestionSchema = new mongoose.Schema({
  fromRole: { type: String, required: true }, // 'admin' or 'tpo'
  toRole: { type: String, required: true },
  fromEmail: String,
  toEmail: String,
  message: { type: String, required: true },
  replies: [{ fromRole: String, fromEmail: String, message: String, createdAt: { type: Date, default: Date.now } }],
  read: { type: Boolean, default: false },
}, { timestamps: true });

const Suggestion = mongoose.model('Suggestion', suggestionSchema);

// attach auth helpers to schemas
try {
  const { applyAuthMethods } = require('./models/userHelpers');
  applyAuthMethods(studentSchema);
  applyAuthMethods(facultySchema);
  applyAuthMethods(tpoSchema);
  applyAuthMethods(adminSchema);
} catch (e) {
  console.warn('Auth helpers not attached:', e && e.message ? e.message : e);
}

// One-time admin cleanup: remove department and ensure accessLevel exists (default 'Full')
(async () => {
  try {
    const unsetRes = await Admin.updateMany({ department: { $exists: true } }, { $unset: { department: "" } });
    if (unsetRes && unsetRes.modifiedCount) console.log(`Removed 'department' from ${unsetRes.modifiedCount} admin document(s)`);

    const setRes = await Admin.updateMany({ accessLevel: { $exists: false } }, { $set: { accessLevel: 'full' } });
    if (setRes && setRes.modifiedCount) console.log(`Set accessLevel='full' on ${setRes.modifiedCount} admin document(s)`);
  } catch (e) {
    console.warn('Admin cleanup failed:', e && e.message ? e.message : e);
  }
})();

// Note: TPO experience cleanup removed; any existing fields should be handled via migration scripts if needed

// Login activity schema - stores signup/login events
const loginSchema = new mongoose.Schema({
  email: { type: String, index: true },
  role: String,
  activity: String, // 'signup' or 'login'
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Login = mongoose.model('Login', loginSchema);

// Helper to check if an email exists in any user collection
async function emailExists(email) {
  if (!email) return false;
  const collections = [Student, Faculty, Tpo, Admin];
  for (const Model of collections) {
    const found = await Model.findOne({ email }).lean();
    if (found) return true;
  }
  return false;
}

// Strict email validator: local part must include at least one alphabetic character
function isEmailStrict(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = String(email).split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!/[A-Za-z]/.test(local)) return false; // local must contain a letter
  if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return false; // basic domain check
  return true;
}

// --- ATS Scoring Endpoint ---
// Gemini/Generative-AI integration removed; use local fallback scorer instead.

// Helper to safely parse JSON that may be wrapped in markdown or code fences
function safeParseJson(maybeJson) {
  if (!maybeJson || typeof maybeJson !== 'string') return null;
  // strip markdown code fences
  const cleaned = maybeJson.replace(/```json\n?|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // attempt to extract the first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) { return null; }
    }
    return null;
  }
}

// ATS scoring removed: return 410 for any scoring attempts
app.post('/api/score-resume/:id', async (req, res) => {
  console.log('[ScoreResume] Request received but scoring has been removed.');
  return res.status(410).json({ message: 'ATS scoring has been removed from this application.' });
});

// Gemini endpoints removed — scoring now runs locally on the server without external APIs.

// Temporary: import a .scored.json file from uploads and apply it to the student matching resumeFileName
// Use: POST /api/import-scored/:resumeName  (resumeName should match student.resumeFileName, e.g. Resume_harshita.pdf)
// Import-scored dev endpoint disabled to prevent any local scoring or manual ATS imports.
// Previously this endpoint applied .scored.json files to student records; it is now intentionally disabled.
console.log('IMPORT ENDPOINT DISABLED (dev-only)');
app.post('/api/import-scored/:resumeName', async (req, res) => {
  console.log('[ImportScored] Attempt to import scored file blocked');
  return res.status(410).json({ message: 'Import-scored endpoint disabled. Local scoring/import is not supported.' });
});

// Helper to create routes for a given model and path
function setupUserRoutes(pathName, Model, singularKey) {
  // Use controller-based handlers for register/login
  const { makeAuthController } = require('./controllers/auth');
  const controller = makeAuthController(Model, singularKey, Login);

  // fetch by id
  app.get(`/api/${pathName}/:id`, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: 'Invalid ID format' });
      }
      const user = await Model.findById(req.params.id).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...safe } = user;
      return res.json(safe);
    } catch (err) {
      return res.status(500).json({ message: 'Error fetching user', error: err.message });
    }
  });

  // registration with uniqueness check
  app.post(`/api/${pathName}/register`, async (req, res) => {
    try {
      const data = { ...req.body };
      // validate email strictly
      if (!isEmailStrict(data.email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      if (await emailExists(data.email)) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      // Validate phone number if provided: must be exactly 10 digits
      if (data.phone) {
        const phoneStr = String(data.phone || '').trim();
        if (!/^\d{10}$/.test(phoneStr)) {
          return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }
        data.phone = phoneStr;
        // copy back to req.body so controller.register sees sanitized value
        req.body.phone = phoneStr;
      }
      return controller.register(req, res);
    } catch (err) {
      return res.status(500).json({ message: 'Registration error', error: err.message });
    }
  });

  app.post(`/api/${pathName}/login`, controller.login);
  app.post(`/api/${pathName}/forgot`, controller.forgotPassword);
  app.post(`/api/${pathName}/reset/:token`, controller.resetPassword);

  // OTP-based forgot password flow: request OTP
  app.post(`/api/${pathName}/otp-request`, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const user = await Model.findOne({ email }).lean();
      if (!user) return res.status(404).json({ message: 'Email not found' });

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await Model.updateOne({ email }, { otp, otpExpire });

      // Try to send OTP via email using configured SMTP or a test Ethereal account
      try {
        const nodemailer = require('nodemailer');
        let transporter;
        // If SMTP env vars provided, use them; otherwise create an Ethereal test account (dev)
        if (process.env.EMAIL_HOST || (process.env.EMAIL_USER && process.env.EMAIL_PASS)) {
          transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : (process.env.EMAIL_SECURE === 'true' ? 465 : 587),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            // In non-production dev environments, allow self-signed certs (helps in CI/local)
            tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
          });
        } else {
          // create ethereal test account
          const testAccount = await nodemailer.createTestAccount();
          // Ethereal/dev - allow self-signed certs in CI/dev by disabling strict TLS verification
          transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });
        }

        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@pms.edu',
          to: email,
          subject: 'Your OTP for Password Reset',
          text: `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.`,
        });

        // Log the result and (for Ethereal) a preview URL
        console.log('OTP email sent, messageId=', info.messageId);
        const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
        if (preview) {
          console.log('Preview URL (Ethereal):', preview);
        }

        // DEBUG: log the env flag and preview presence
        console.log('RETURN_EMAIL_PREVIEW=', process.env.RETURN_EMAIL_PREVIEW, 'previewExists=', !!preview);

        // Optionally return preview URL in API response for debugging if enabled
        if (process.env.RETURN_EMAIL_PREVIEW === 'true' && preview) {
          return res.json({ message: 'OTP sent to your email', previewUrl: preview });
        }

        return res.json({ message: 'OTP sent to your email' });
      } catch (emailErr) {
        console.warn('Email send failed:', emailErr && emailErr.message ? emailErr.message : emailErr);
        // For security, do NOT return the OTP in API responses unless explicitly enabled.
        // Use env var RETURN_OTP=true to return OTPs in development/testing only.
        if (process.env.RETURN_OTP === 'true') {
          return res.json({ message: 'OTP requested (development mode)', otp });
        }
        return res.json({ message: 'OTP requested; check your email for the code' });
      }
    } catch (err) {
      console.error('OTP request error:', err);
      return res.status(500).json({ message: 'OTP request failed', error: err.message });
    }
  });

  // OTP-based forgot password flow: verify OTP and log in
  app.post(`/api/${pathName}/otp-verify`, async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

      const user = await Model.findOne({ email }).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!user.otp || !user.otpExpire) return res.status(400).json({ message: 'OTP not requested' });
      if (new Date() > user.otpExpire) return res.status(400).json({ message: 'OTP expired' });
      if (user.otp !== otp) return res.status(401).json({ message: 'Invalid OTP' });

      // OTP is valid; clear OTP and log in
      await Model.updateOne({ email }, { otp: null, otpExpire: null });

      const safeUser = user;
      delete safeUser.password;
      delete safeUser.otp;
      delete safeUser.otpExpire;

      // Record login activity
      try {
        if (typeof Login !== 'undefined') await Login.create({ email, role: singularKey, activity: 'login' });
      } catch (logErr) {
        console.warn('Failed to record login activity:', logErr && logErr.message ? logErr.message : logErr);
      }

      return res.json({ message: 'Login successful', role: singularKey, user: safeUser });
    } catch (err) {
      console.error('OTP verify error:', err);
      return res.status(500).json({ message: 'OTP verification failed', error: err.message });
    }
  });

  // Update
  app.post(`/api/${pathName}/update`, async (req, res) => {
    try {
      try {
        const len = req.headers['content-length'];
        if (len) console.log(`Update request size=${len} for role=${pathName}`);
        console.log('Update payload keys:', Object.keys(req.body || {}).slice(0, 50));
      } catch (e) { }
      const { email, ...update } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required to identify the user' });
      if (!isEmailStrict(email)) return res.status(400).json({ message: 'Invalid email format' });

      // Define allowed fields per role to avoid accidental/unauthorised updates
      const allowedFieldsByRole = {
        student: ['name', 'phone', 'studentId', 'year', 'cgpa', 'skills', 'profileData', 'profileFileName', 'resumeFileName', 'resumeData', 'course', 'branch'],
        faculty: ['name', 'phone', 'employeeId', 'department', 'designation', 'specialization', 'profileData', 'profileFileName'],
        tpo: ['name', 'phone', 'employeeId', 'department', 'designation', 'profileData', 'profileFileName'],
        admin: ['name', 'phone', 'employeeId', 'accessLevel', 'profileData', 'profileFileName'],
      };
      const allowed = allowedFieldsByRole[singularKey] || Object.keys(update);
      // build a filtered update object containing only allowed keys
      const filteredUpdate = {};
      Object.keys(update || {}).forEach(k => {
        if (allowed.includes(k)) filteredUpdate[k] = update[k];
      });

      if (update.password) {
        // If a password update is requested, use findOne then set and save so the schema
        // pre('save') hook will hash the password exactly once.
        const existing = await Model.findOne({ email });
        if (!existing) return res.status(404).json({ message: 'User not found' });
        // copy only allowed non-password updates to the existing doc
        Object.keys(filteredUpdate).forEach(k => {
          existing[k] = filteredUpdate[k];
        });
        existing.password = update.password; // raw - pre('save') will hash
        const saved = await existing.save();
        const { password, ...safeSaved } = saved.toObject ? saved.toObject() : saved;

        // record profile update activity
        try {
          if (typeof Login !== 'undefined') await Login.create({ email, role: singularKey, activity: 'profile_update' });
        } catch (logErr) {
          console.warn('Failed to record profile update activity:', logErr && logErr.message ? logErr.message : logErr);
        }

        return res.json({ message: 'Changes Saved', [singularKey]: safeSaved });
      }

      // protect immutable/read-only fields depending on role
      try {
        // never allow clients to change role
        if (filteredUpdate.role) delete filteredUpdate.role;
        // admin-specific: prevent admin users from modifying their role or accessLevel via this path
        if (singularKey === 'admin') {
          if (filteredUpdate.accessLevel) delete filteredUpdate.accessLevel;
        }
      } catch (e) {
        // ignore
      }

      // Validate phone number if present: must be exactly 10 digits
      if (filteredUpdate.phone) {
        const phoneStr = String(filteredUpdate.phone || '').trim();
        if (!/^\d{10}$/.test(phoneStr)) {
          return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }
        filteredUpdate.phone = phoneStr;
      }

      // Validate cgpa if present: must be a number between 0 and 10
      if (filteredUpdate.cgpa !== undefined && filteredUpdate.cgpa !== null && filteredUpdate.cgpa !== '') {
        const val = Number(filteredUpdate.cgpa);
        if (Number.isNaN(val) || val < 0 || val > 10) {
          return res.status(400).json({ message: 'CGPA must be a number between 0 and 10' });
        }
        filteredUpdate.cgpa = val;
      }

      // DEBUG: log the update being applied for auditing
      try { console.log(`Applying update for ${pathName} ${email}:`, JSON.stringify(filteredUpdate)); } catch (e) { console.warn('Failed to log filteredUpdate'); }

      const updated = await Model.findOneAndUpdate({ email }, filteredUpdate, { new: true }).lean();
      if (!updated) return res.status(404).json({ message: 'User not found' });

      // record profile update activity in logins collection
      try {
        if (typeof Login !== 'undefined') {
          await Login.create({ email, role: singularKey, activity: 'profile_update' });
        }
      } catch (logErr) {
        console.warn('Failed to record profile update activity:', logErr && logErr.message ? logErr.message : logErr);
      }

      const { password, ...safe } = updated;
      return res.json({ message: 'Changes Saved', [singularKey]: safe });
    } catch (err) {
      return res.status(400).json({ message: 'Update failed', error: err.message });
    }
  });
}

// Serve resume file for a student
app.get('/api/students/resume', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-student-email'] || req.headers['x-user-email'];
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const student = await Student.findOne({ email }).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.resumeData || !student.resumeFileName) return res.status(404).json({ message: 'Resume not found' });

    // Prefer serving from disk if resumePath exists
    if (student.resumePath) {
      const filePath = path.join(__dirname, student.resumePath);
      if (fs.existsSync(filePath)) {
        try {
          const stat = fs.statSync(filePath);
          const total = stat.size;
          res.setHeader('Accept-Ranges', 'bytes');
          const range = req.headers.range;
          if (range) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            const start = m && m[1] ? parseInt(m[1], 10) : 0;
            const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
            if (isNaN(start) || isNaN(end) || start > end || start >= total) {
              res.status(416).setHeader('Content-Range', `bytes */${total}`);
              return res.end();
            }
            const stream = fs.createReadStream(filePath, { start, end: Math.min(end, total - 1) });
            const ext = path.extname(filePath).toLowerCase();
            const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
            res.status(206).setHeader('Content-Range', `bytes ${start}-${Math.min(end, total - 1)}/${total}`);
            res.setHeader('Content-Length', Math.min(end, total - 1) - start + 1);
            res.setHeader('Content-Type', mime);
            const originalName = student.resumeFileName || path.basename(filePath);
            res.setHeader('Content-Disposition', `inline; filename=\"${originalName}\"`);
            res.setHeader('X-Resume-Filename', originalName);
            return stream.pipe(res);
          }
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
          res.setHeader('Content-Length', total);
          res.setHeader('Content-Type', mime);
          const originalName = student.resumeFileName || path.basename(filePath);
          res.setHeader('Content-Disposition', `inline; filename=\"${originalName}\"`);
          res.setHeader('X-Resume-Filename', originalName);
          const stream = fs.createReadStream(filePath);
          return stream.pipe(res);
        } catch (streamErr) {
          console.error('Error streaming resume from disk:', streamErr && streamErr.message ? streamErr.message : streamErr);
        }
      }
    }

    // Fallback: serve from base64 stored in DB
    const fn = student.resumeFileName;
    const ext = fn.substring(fn.lastIndexOf('.')).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
    const buffer = Buffer.from(student.resumeData, 'base64');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename=\"${fn}\"`);
    res.setHeader('X-Resume-Filename', fn);
    return res.send(buffer);
  } catch (err) {
    console.error('Resume fetch error:', err);
    return res.status(500).json({ message: 'Error fetching resume', error: err.message });
  }
});

// Delete a student's resume (remove stored file and unset DB fields)
app.delete('/api/students/resume', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-student-email'] || req.headers['x-user-email'];
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const student = await Student.findOne({ email }).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Remove file on disk if present
    if (student.resumePath) {
      const filePath = path.join(__dirname, student.resumePath);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Failed to remove resume file from disk:', e && e.message ? e.message : e);
      }
    }

    // Unset resume fields so frontend knows it's removed
    await Student.updateOne({ email }, { $unset: { resumeData: '', resumeFileName: '', resumePath: '' } });

    return res.json({ message: 'Removed' });
  } catch (err) {
    console.error('Failed to remove resume:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to remove resume', error: err && err.message ? err.message : String(err) });
  }
});

// Setup routes for all user types
setupUserRoutes('students', Student, 'student');
setupUserRoutes('faculty', Faculty, 'faculty');
setupUserRoutes('tpo', Tpo, 'tpo');
setupUserRoutes('admin', Admin, 'admin');

// Role-agnostic login endpoint: searches each user collection for the email
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request body:', JSON.stringify(req.body));
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (!isEmailStrict(email)) return res.status(400).json({ message: 'Invalid email format' });

    // If role provided, restrict authentication to that role's collection only
    const collections = {
      student: Student,
      faculty: Faculty,
      tpo: Tpo,
      admin: Admin,
    };

    if (role) {
      const Model = collections[role];
      if (!Model) return res.status(400).json({ message: 'Unknown role' });

      console.log(`Login attempt for role=${role}, email=${email}`);

      // Defensive check: if the same email exists in OTHER role collections, refuse login
      const otherRoles = Object.keys(collections).filter(r => r !== role);
      const conflictingRoles = [];
      for (const r of otherRoles) {
        try {
          const m = collections[r];
          const found = await m.findOne({ email }).lean();
          if (found) conflictingRoles.push(r);
        } catch (e) {
          console.warn('Conflict check failed for role', r, e && e.message ? e.message : e);
        }
      }
      if (conflictingRoles.length > 0) {
        console.warn(`Login blocked: email ${email} exists in other role(s): ${conflictingRoles.join(', ')}`);
        return res.status(409).json({ message: `Email exists under other role(s): ${conflictingRoles.join(', ')}. Contact administrator.` });
      }

      const user = await Model.findOne({ email }).select('+password');
      // Strict behavior: if user does not exist in requested role, return 404 (User not found)
      if (!user) return res.status(404).json({ message: 'User not found' });

      let passwordMatches = false;
      if (user.password && user.password.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, user.password);
      } else {
        passwordMatches = user.password === password;
      }

      if (!passwordMatches) return res.status(401).json({ message: 'Invalid credentials' });

      try {
        await Model.updateOne({ email: user.email }, { $set: { lastLogin: new Date(), status: 'Active' } });
      } catch (e) {
        console.warn('Failed to update lastLogin/status on login:', e && e.message ? e.message : e);
      }

      const fresh = await Model.findOne({ email: user.email }).lean();
      const safe = fresh ? (fresh.password ? (() => { const s = { ...fresh }; delete s.password; return s; })() : fresh) : (user.toObject ? user.toObject() : user);

      try {
        await Login.create({ email: user.email, role, activity: 'login' });
      } catch (logErr) {
        console.warn('Failed to record login activity:', logErr && logErr.message ? logErr.message : logErr);
      }

      return res.json({ message: 'Login successful', role, user: safe });
    }

    // If no role provided, behave as before but return first matching collection (legacy support)
    const order = [{ model: Student, role: 'student' }, { model: Faculty, role: 'faculty' }, { model: Tpo, role: 'tpo' }, { model: Admin, role: 'admin' }];
    for (const entry of order) {
      const user = await entry.model.findOne({ email }).select('+password');
      if (!user) continue;
      let passwordMatches = false;
      if (user.password && user.password.startsWith('$2')) {
        passwordMatches = await bcrypt.compare(password, user.password);
      } else {
        passwordMatches = user.password === password;
      }
      if (!passwordMatches) continue;

      try {
        await entry.model.updateOne({ email: user.email }, { $set: { lastLogin: new Date(), status: 'Active' } });
      } catch (e) { console.warn('Failed to update lastLogin/status on login:', e && e.message ? e.message : e); }

      const fresh = await entry.model.findOne({ email: user.email }).lean();
      const safe = fresh ? (fresh.password ? (() => { const s = { ...fresh }; delete s.password; return s; })() : fresh) : (user.toObject ? user.toObject() : user);

      try { await Login.create({ email: user.email, role: entry.role, activity: 'login' }); } catch (logErr) { console.warn('Failed to record login activity:', logErr && logErr.message ? logErr.message : logErr); }

      return res.json({ message: 'Login successful', role: entry.role, user: safe });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (err) {
    return res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// Admin: get consolidated users list across all collections
app.get('/api/admin/users', async (req, res) => {
  try {
    // Fetch users from each model and normalize fields
    const students = await Student.find({}).lean();
    const faculties = await Faculty.find({}).lean();
    const tpos = await Tpo.find({}).lean();
    const admins = await Admin.find({}).lean();

    const mapUser = (u, role) => ({
      name: u.name || '',
      email: u.email || '',
      course: u.course || '',
      role: role,
      department: role === 'student' ? (u.branch || u.department || '') : (u.department || ''),
      status: u.status || 'Inactive',
      lastLogin: u.lastLogin || null,
      _id: u._id,
    });

    const combined = [
      ...students.map(s => mapUser(s, 'student')),
      ...faculties.map(f => mapUser(f, 'faculty')),
      ...tpos.map(t => mapUser(t, 'tpo')),
      ...admins.map(a => ({ ...mapUser(a, 'admin'), department: 'Administration' })),
    ];

    return res.json({ users: combined });
  } catch (err) {
    console.error('Failed to fetch admin users:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to fetch users', error: err && err.message ? err.message : String(err) });
  }
});

// Admin: delete a user by email and role
// Log all incoming requests to this path (helps diagnose preflight/404)
app.all('/api/admin/delete-user', (req, res, next) => {
  console.log(`Received ${req.method} on /api/admin/delete-user from ${req.ip}`);
  next();
});

app.post('/api/admin/delete-user', async (req, res) => {
  try {
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ message: 'email and role are required' });

    const collections = { student: Student, faculty: Faculty, tpo: Tpo, admin: Admin };
    const Model = collections[role];
    if (!Model) return res.status(400).json({ message: 'Unknown role' });

    const deleted = await Model.findOneAndDelete({ email }).lean();
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    try { await Login.create({ email, role, activity: 'deleted' }); } catch (e) { console.warn('Failed to log deletion', e && e.message ? e.message : e); }

    return res.json({ message: 'User deleted', email, role });
  } catch (err) {
    console.error('Delete user error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to delete user', error: err && err.message ? err.message : String(err) });
  }
});

// Logout endpoint to mark a user as Inactive
app.post('/api/logout', async (req, res) => {
  try {
    // prefer JSON body, fallback to headers
    const { email, role } = req.body || {};
    const userEmail = email || req.headers['x-user-email'] || req.headers['x-student-email'];
    const userRole = role || req.headers['x-user-role'];
    if (!userEmail || !userRole) return res.status(400).json({ message: 'Email and role are required to logout' });

    const collections = { student: Student, faculty: Faculty, tpo: Tpo, admin: Admin };
    const Model = collections[userRole];
    if (!Model) return res.status(400).json({ message: 'Unknown role' });

    // Set status to Inactive and update lastLogin to current time (so admin sees when they logged out)
    await Model.updateOne({ email: userEmail }, { $set: { status: 'Inactive', lastLogin: new Date() } });

    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Logout failed', error: err && err.message ? err.message : String(err) });
  }
});

// Resume upload endpoint for students
app.post('/api/students/upload-resume', async (req, res) => {
  try {
    const email = req.headers['x-student-email'];
    if (!email) return res.status(400).json({ message: 'Email header is required' });

    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileName = '';
    let fileReceived = false;

    bb.on('file', (fieldname, file, info) => {
      fileReceived = true;
      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        fileName = info.filename;
      });

      file.on('error', (err) => {
        console.error('File stream error:', err);
      });
    });

    bb.on('close', async () => {
      if (!fileReceived) {
        return res.status(400).json({ message: 'No file received' });
      }

      if (!fileBuffer || !fileName) {
        return res.status(400).json({ message: 'File data not found' });
      }

      // Validate file type
      const validTypes = ['.pdf', '.docx'];
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      if (!validTypes.includes(ext)) {
        return res.status(400).json({ message: 'Only PDF and DOCX files are allowed' });
      }

      // Ensure uploads directory exists and write file to disk
      try {
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const filePath = path.join(uploadsDir, safeName);
        fs.writeFileSync(filePath, fileBuffer);
        console.log(`Resume upload: email=${email}, originalName=${fileName}, storedName=${safeName}, path=${filePath}`);

        // Convert to base64 for backward compatibility storage
        const fileData = fileBuffer.toString('base64');

        const updated = await Student.findOneAndUpdate(
          { email },
          {
            // store the original filename for display and keep a stored name on disk
            resumeFileName: fileName,
            resumeStoredName: safeName,
            resumeData: fileData,
            resumePath: path.join('uploads', safeName),
          },
          { new: true }
        ).lean();

        console.log('Student record updated with resume metadata for', email);

        if (!updated) {
          return res.status(404).json({ message: 'Student not found' });
        }

        // Return a safe response and include both original and stored filenames
        const { password, resumeData, ...safe } = updated;
        return res.json({ message: 'Resume uploaded successfully', student: safe, resumeFileName: fileName, resumeStoredName: safeName });
      } catch (fsErr) {
        console.error('Failed to save uploaded file:', fsErr && fsErr.message ? fsErr.message : fsErr);
        return res.status(500).json({ message: 'Failed to save uploaded file', error: fsErr && fsErr.message ? fsErr.message : String(fsErr) });
      }
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'File upload error', error: err.message });
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error('Upload endpoint error:', err);
    return res.status(500).json({ message: 'Upload error', error: err.message });
  }
});

// Serve resume file for a student
app.get('/api/students/resume', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-student-email'] || req.headers['x-user-email'];
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const student = await Student.findOne({ email }).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!student.resumeData || !student.resumeFileName) return res.status(404).json({ message: 'Resume not found' });

    // Prefer serving from disk if resumePath exists
    if (student.resumePath) {
      // use the stored file name on disk for the path
      const filePath = path.join(__dirname, student.resumePath);
      if (fs.existsSync(filePath)) {
        try {
          const stat = fs.statSync(filePath);
          const total = stat.size;
          res.setHeader('Accept-Ranges', 'bytes');
          const range = req.headers.range;
          if (range) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            const start = m && m[1] ? parseInt(m[1], 10) : 0;
            const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
            if (isNaN(start) || isNaN(end) || start > end || start >= total) {
              res.status(416).setHeader('Content-Range', `bytes */${total}`);
              return res.end();
            }
            const stream = fs.createReadStream(filePath, { start, end: Math.min(end, total - 1) });
            const ext = path.extname(filePath).toLowerCase();
            const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
            res.status(206).setHeader('Content-Range', `bytes ${start}-${Math.min(end, total - 1)}/${total}`);
            res.setHeader('Content-Length', Math.min(end, total - 1) - start + 1);
            res.setHeader('Content-Type', mime);
            // advertise the original filename to the client when available
            const originalName = student.resumeFileName || path.basename(filePath);
            res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            res.setHeader('X-Resume-Filename', originalName);
            return stream.pipe(res);
          }
          // full file
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
          res.setHeader('Content-Length', total);
          res.setHeader('Content-Type', mime);
          const originalName = student.resumeFileName || path.basename(filePath);
          res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
          res.setHeader('X-Resume-Filename', originalName);
          const stream = fs.createReadStream(filePath);
          return stream.pipe(res);
        } catch (streamErr) {
          console.error('Error streaming resume from disk:', streamErr && streamErr.message ? streamErr.message : streamErr);
          // fallthrough to base64 handling below
        }
      }
    }

    // Fallback: serve from base64 stored in DB
    const fn = student.resumeFileName;
    const ext = fn.substring(fn.lastIndexOf('.')).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
    const buffer = Buffer.from(student.resumeData, 'base64');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${fn}"`);
    res.setHeader('X-Resume-Filename', fn);
    return res.send(buffer);
  } catch (err) {
    console.error('Resume fetch error:', err);
    return res.status(500).json({ message: 'Error fetching resume', error: err.message });
  }
});

// Delete a student's resume: remove file on disk if present and unset resume fields in DB
app.delete('/api/students/resume', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-student-email'] || req.headers['x-user-email'];
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const student = await Student.findOne({ email }).lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // If there is no resume stored, return 404
    if (!student.resumeData && !student.resumePath && !student.resumeFileName && !student.resumeStoredName) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Attempt to delete file on disk if we have a path or stored name
    try {
      const candidates = [];
      if (student.resumePath) candidates.push(path.join(__dirname, student.resumePath));
      if (student.resumeStoredName) candidates.push(path.join(__dirname, 'uploads', student.resumeStoredName));
      // dedupe
      const uniq = [...new Set(candidates)];
      for (const p of uniq) {
        try {
          if (fs.existsSync(p)) {
            fs.unlinkSync(p);
            console.log('Deleted resume file on disk:', p);
          }
        } catch (fileErr) {
          console.warn('Failed to delete resume file:', p, fileErr && fileErr.message ? fileErr.message : fileErr);
        }
      }
    } catch (e) {
      console.warn('Error while attempting to remove resume file(s):', e && e.message ? e.message : e);
    }

    // Unset resume-related fields in the student document
    const update = { $unset: { resumeData: "", resumeFileName: "", resumePath: "", resumeStoredName: "" } };
    const updated = await Student.findOneAndUpdate({ email }, update, { new: true }).lean();

    // Record activity if Login model exists
    try {
      if (typeof Login !== 'undefined') await Login.create({ email, role: 'student', activity: 'resume_removed' });
    } catch (logErr) {
      // non-fatal
      console.warn('Failed to log resume removal activity:', logErr && logErr.message ? logErr.message : logErr);
    }

    const safe = updated ? (() => { const s = { ...updated }; if (s.password) delete s.password; return s; })() : null;
    return res.json({ message: 'Resume removed', student: safe });
  } catch (err) {
    console.error('Resume delete error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Error removing resume', error: err && err.message ? err.message : String(err) });
  }
});

// Lightweight ping endpoint to help detect network/server issues
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, now: Date.now() });
});

// Error handler: return JSON for payload-too-large and other body parsing errors
app.use((err, req, res, next) => {
  try {
    if (!err) return next();
    if (err.type === 'entity.too.large' || err.status === 413 || (err.message && err.message.toLowerCase().includes('payload') && err.message.toLowerCase().includes('large'))) {
      console.error('Payload too large error:', err && err.message ? err.message : err);
      return res.status(413).json({ message: 'Payload too large', error: err.message || String(err) });
    }
  } catch (e) {
    // fall through to default handler
  }
  next(err);
});

// --- Suggestion / Feedback endpoints ---
// Create a suggestion/feedback message
app.post('/api/feedback', async (req, res) => {
  try {
    const { fromRole, toRole, fromEmail, toEmail, message } = req.body || {};
    if (!fromRole || !toRole || !message) return res.status(400).json({ message: 'fromRole, toRole and message are required' });
    const doc = await Suggestion.create({ fromRole, toRole, fromEmail, toEmail, message });
    return res.json({ message: 'Created', feedback: doc });
  } catch (err) {
    console.error('Create feedback error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to create feedback', error: err && err.message ? err.message : String(err) });
  }
});

// List suggestions for a role (toRole or fromRole) - use query ?role=admin or ?role=tpo
app.get('/api/feedback', async (req, res) => {
  try {
    const role = req.query.role;
    const q = role ? { $or: [{ toRole: role }, { fromRole: role }] } : {};
    const list = await Suggestion.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ list });
  } catch (err) {
    console.error('List feedback error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to list feedback', error: err && err.message ? err.message : String(err) });
  }
});

// Reply to a suggestion
app.post('/api/feedback/:id/reply', async (req, res) => {
  try {
    const id = req.params.id;
    const { fromRole, fromEmail, message } = req.body || {};
    if (!fromRole || !message) return res.status(400).json({ message: 'fromRole and message are required' });
    const updated = await Suggestion.findByIdAndUpdate(id, { $push: { replies: { fromRole, fromEmail, message, createdAt: new Date() } }, $set: { read: false } }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Replied', feedback: updated });
  } catch (err) {
    console.error('Reply feedback error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to reply', error: err && err.message ? err.message : String(err) });
  }
});

// Mark suggestion as read
app.post('/api/feedback/:id/mark-read', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await Suggestion.findByIdAndUpdate(id, { $set: { read: true } }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Marked read', feedback: updated });
  } catch (err) {
    console.error('Mark read error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to mark read', error: err && err.message ? err.message : String(err) });
  }
});

// Faculty: list students with resume metadata
app.get('/api/faculty/students-resumes', async (req, res) => {
  try {
    // include `course` so faculty can filter by course
    const list = await Student.find({}).select('name email resumeFileName createdAt course').lean();
    return res.json({ students: list });
  } catch (err) {
    console.error('students-resumes error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to fetch students', error: err.message });
  }
});

// Faculty: upload a learning resource (link or document)
app.post('/api/faculty/learning-resources', async (req, res) => {
  try {
    // If a file upload is happening, Busboy will handle it; otherwise accept JSON body for link
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      const bb = busboy({ headers: req.headers });
      let uploaded = { title: '', type: 'document', fileName: '', fileData: '', mime: '', size: 0, uploadedBy: '' };
      let fileBuffer = null;

      bb.on('field', (name, val) => {
        if (name === 'title') uploaded.title = val;
        if (name === 'uploadedBy') uploaded.uploadedBy = val;
      });

      bb.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          fileBuffer = Buffer.concat(chunks);
          uploaded.fileName = info.filename;
          uploaded.mime = info.mime || '';
          uploaded.size = fileBuffer.length;
          uploaded.fileData = fileBuffer.toString('base64');
        });
      });

      bb.on('close', async () => {
        if (!uploaded.title) uploaded.title = uploaded.fileName || 'Document';
        const doc = await LearningResource.create({
          title: uploaded.title,
          type: 'document',
          fileName: uploaded.fileName,
          fileData: uploaded.fileData,
          mime: uploaded.mime,
          size: uploaded.size,
          uploadedBy: uploaded.uploadedBy || 'Faculty',
        });
        return res.json({ message: 'Resource uploaded', resource: doc });
      });

      req.pipe(bb);
      return;
    }

    // JSON body upload (for links)
    const { title, url, uploadedBy } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'title and url are required for link resources' });
    const doc = await LearningResource.create({ title, type: 'link', url, uploadedBy: uploadedBy || 'Faculty' });
    return res.json({ message: 'Link resource created', resource: doc });
  } catch (err) {
    console.error('learning-resources upload error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to upload resource', error: err.message });
  }
});

// Faculty: list learning resources
app.get('/api/faculty/learning-resources', async (req, res) => {
  try {
    const list = await LearningResource.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ resources: list });
  } catch (err) {
    console.error('faculty learning-resources list error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to list resources', error: err.message });
  }
});

// Students: get learning resources (public)
app.get('/api/students/learning-resources', async (req, res) => {
  try {
    const list = await LearningResource.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ resources: list });
  } catch (err) {
    console.error('students learning-resources error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to fetch resources', error: err.message });
  }
});

// Serve a stored learning resource document by id (download or inline)
app.get('/api/learning-resources/:id/file', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
    const doc = await LearningResource.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Resource not found' });
    if (doc.type !== 'document' || !doc.fileData) return res.status(404).json({ message: 'No file stored for this resource' });

    const buffer = Buffer.from(doc.fileData, 'base64');
    const mime = doc.mime || (doc.fileName && doc.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName || 'resource'}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('serve learning resource file error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to serve file', error: err.message });
  }
});

// Faculty: give feedback to a student and create a notification
app.post('/api/faculty/give-feedback', async (req, res) => {
  try {
    const { studentEmail, message, from } = req.body;
    if (!studentEmail || !message) return res.status(400).json({ message: 'studentEmail and message are required' });

    const fb = { from: from || 'Faculty', message, createdAt: new Date() };
    const note = { title: 'Resume Feedback', message, from: fb.from, read: false, createdAt: new Date() };

    const updated = await Student.findOneAndUpdate(
      { email: studentEmail },
      { $push: { feedback: fb, notifications: note } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Student not found' });

    // try to send an email notification (best-effort)
    try {
      const sendEmail = require('./utils/sendEmail');
      if (updated.email) {
        await sendEmail({
          to: updated.email,
          subject: 'New feedback on your resume',
          text: `You have received feedback from ${fb.from}:\n\n${message}`,
        });
      }
    } catch (emailErr) {
      console.warn('Failed to send feedback email:', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    return res.json({ message: 'Feedback added', student: { email: updated.email, name: updated.name } });
  } catch (err) {
    console.error('give-feedback error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to add feedback', error: err.message });
  }
});

// Fetch student's notifications
app.get('/api/students/notifications', async (req, res) => {
  try {
    const email = req.query.email || req.headers['x-student-email'] || req.headers['x-user-email'];
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const student = await Student.findOne({ email }).select('notifications feedback').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json({ notifications: student.notifications || [], feedback: student.feedback || [] });
  } catch (err) {
    console.error('fetch notifications error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

// Delete a student's notification or feedback item
app.post('/api/students/delete-notification', async (req, res) => {
  try {
    const { studentEmail, id, kind } = req.body;
    if (!studentEmail || !id) return res.status(400).json({ message: 'studentEmail and id are required' });

    const pullQuery = {};
    const isObjectId = (val) => {
      try {
        return mongoose.Types.ObjectId.isValid(val);
      } catch (e) {
        return false;
      }
    };

    if (kind === 'feedback') {
      if (isObjectId(id)) {
        pullQuery.feedback = { _id: mongoose.Types.ObjectId(id) };
      } else {
        // fallback: match by createdAt or message text
        const d = new Date(id);
        if (!isNaN(d.getTime())) pullQuery.feedback = { createdAt: d };
        else pullQuery.feedback = { _id: id };
      }
    } else {
      // default to notifications array
      if (isObjectId(id)) {
        pullQuery.notifications = { _id: mongoose.Types.ObjectId(id) };
      } else {
        const d = new Date(id);
        if (!isNaN(d.getTime())) pullQuery.notifications = { createdAt: d };
        else pullQuery.notifications = { _id: id };
      }
    }

    const updated = await Student.findOneAndUpdate(
      { email: studentEmail },
      { $pull: pullQuery },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Student not found' });
    return res.json({ message: 'Deleted', student: { email: updated.email, name: updated.name } });
  } catch (err) {
    console.error('delete-notification error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  }
});

// Profile picture upload endpoint (supports students, faculty, tpo, admin)
app.post('/api/:role/upload-profile', async (req, res) => {
  try {
    const roleParam = req.params.role;
    const collections = { students: Student, faculty: Faculty, tpo: Tpo, admin: Admin };
    const Model = collections[roleParam];
    if (!Model) return res.status(400).json({ message: 'Invalid role' });

    // Accept header 'x-user-email' or legacy 'x-student-email'
    const email = req.headers['x-user-email'] || req.headers['x-student-email'];
    if (!email) return res.status(400).json({ message: 'Email header is required' });

    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileName = '';
    let fileReceived = false;

    bb.on('file', (fieldname, file, info) => {
      fileReceived = true;
      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        fileName = info.filename;
      });

      file.on('error', (err) => {
        console.error('File stream error:', err);
      });
    });

    bb.on('close', async () => {
      if (!fileReceived) {
        return res.status(400).json({ message: 'No file received' });
      }

      if (!fileBuffer || !fileName) {
        return res.status(400).json({ message: 'File data not found' });
      }

      // Validate image type
      const validTypes = ['.png', '.jpg', '.jpeg'];
      const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      if (!validTypes.includes(ext)) {
        return res.status(400).json({ message: 'Only PNG and JPG files are allowed' });
      }

      // Convert to base64 for storage
      const fileData = fileBuffer.toString('base64');

      const updated = await Model.findOneAndUpdate(
        { email },
        {
          profileFileName: fileName,
          profileData: fileData,
        },
        { new: true }
      ).lean();

      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }

      // remove sensitive fields
      const { password, ...safe } = updated;
      return res.json({ message: 'Profile picture uploaded', [roleParam.slice(0, -1)]: safe, user: safe });
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'File upload error', error: err.message });
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error('Upload endpoint error:', err);
    return res.status(500).json({ message: 'Upload error', error: err.message });
  }
});

// Expose a small dev-only email config & test endpoint so it's easy to verify SMTP vs Ethereal
const smtpConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
console.log('NODE_ENV=', process.env.NODE_ENV, 'SMTP configured?=', smtpConfigured, 'EMAIL_HOST=', process.env.EMAIL_HOST ? 'set' : 'unset', 'EMAIL_USER=', process.env.EMAIL_USER ? 'set' : 'unset', 'EMAIL_PASS=', process.env.EMAIL_PASS ? 'set' : 'unset', 'RETURN_EMAIL_PREVIEW=', process.env.RETURN_EMAIL_PREVIEW);

if (process.env.NODE_ENV !== 'production') {
  console.log('Registering debug email endpoints (dev only)');
  app.get('/api/debug/email-config', (req, res) => {
    return res.json({ smtpConfigured, usingEthereal: !smtpConfigured, returnEmailPreview: process.env.RETURN_EMAIL_PREVIEW === 'true' });
  });

  app.post('/api/debug/send-test-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });

      const nodemailer = require('nodemailer');
      let transporter;

      if (smtpConfigured) {
        transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : (process.env.EMAIL_SECURE === 'true' ? 465 : 587),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          // Allow self-signed certs in non-production environments
          tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
        });
      } else {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
          tls: { rejectUnauthorized: false },
        });
      }

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@pms.edu',
        to: email,
        subject: 'PMS test email',
        text: 'This is a test email from PMS server',
      });

      const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
      return res.json({ message: 'sent', messageId: info.messageId, previewUrl: preview });
    } catch (err) {
      console.error('Test email send failed:', err && err.message ? err.message : err);
      return res.status(500).json({ message: 'Test send failed', error: err.message });
    }
  });
}

const PORT = process.env.PORT || 5000;
// Lightweight health endpoint for quick checks
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', time: new Date().toISOString(), pid: process.pid });
});

// Final catch-all to log unmatched requests (helps debug 404s in dev)
app.use((req, res, next) => {
  console.warn('No route matched for incoming request:', req.method, req.url);
  // Send a JSON 404 so PowerShell / curl show clear output
  return res.status(404).json({ message: 'Not Found', path: req.url });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
