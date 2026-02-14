#!/usr/bin/env python3
"""
ATS Resume Analyzer - Complete Single File
A comprehensive, production-ready script for analyzing resumes and calculating ATS scores.

Usage:
    python ats_resume_analyzer.py <resume.pdf>
    python ats_resume_analyzer.py <resume.pdf> --output results.json
    python ats_resume_analyzer.py <resume.pdf> --pretty

Features:
    - PDF text extraction
    - Skill detection across 8+ categories (100+ skills)
    - ATS score calculation (0-100)
    - Section detection (Education, Skills, Experience, Projects, Certifications)
    - Skill gap analysis with priority ranking
    - Strengths and weaknesses identification
    - Actionable optimization advice
    - JSON output for easy integration

Dependencies:
    pip install pdfplumber nltk

Author: ATS Analyzer Team
Version: 1.0.0
License: MIT
"""

import sys
import json
import argparse
import re
from pathlib import Path
from typing import Dict, List, Tuple, Any

try:
    import pdfplumber
except ImportError:
    print(json.dumps({"error": "pdfplumber not installed. Run: pip install pdfplumber"}), file=sys.stderr)
    sys.exit(1)

try:
    import nltk
    from nltk.corpus import stopwords
except ImportError:
    print(json.dumps({"error": "nltk not installed. Run: pip install nltk"}), file=sys.stderr)
    sys.exit(1)

# Download NLTK data silently
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    try:
        nltk.download('stopwords', quiet=True)
    except:
        pass  # Continue even if download fails


# ============================================================================
# SKILL DATABASE - Comprehensive skill tracking across multiple categories
# ============================================================================

SKILL_DB = {
    "Programming": [
        "python", "java", "c++", "c", "sql", "typescript", 
        "go", "rust", "kotlin", "swift", "scala", "r", "php", "ruby", 
        "c#", "perl", "bash", "shell", "matlab", "dart", "haskell",
        "lua", "groovy", "elixir", "f#", "objective-c", "oops", "data structures"
    ],
    "Web": [
        "html", "css", "javascript", "react", "node", "nodejs", "angular", 
        "vue", "vuejs", "nextjs", "next.js", "express", "expressjs", "django", 
        "flask", "fastapi", "spring", "spring boot", "asp.net", "jquery", 
        "bootstrap", "tailwind", "tailwindcss", "sass", "scss", "less", 
        "webpack", "vite", "redux", "graphql", "rest api", "restful", "ajax",
        "svelte", "nuxt", "gatsby", "ember", "backbone"
    ],
    "Data_ML": [
        "machine learning", "ml", "data analysis", "pandas", "numpy", 
        "tensorflow", "pytorch", "scikit-learn", "sklearn", "keras", 
        "deep learning", "neural networks", "nlp", "computer vision", "cv",
        "data science", "statistics", "matplotlib", "seaborn", "plotly", 
        "tableau", "power bi", "excel", "spark", "pyspark", "hadoop", 
        "data mining", "data visualization", "big data", "analytics",
        "scipy", "opencv", "hugging face", "transformers", "llm"
    ],
    "Tools": [
        "git", "github", "gitlab", "bitbucket", "docker", "kubernetes", "k8s",
        "jenkins", "jira", "confluence", "slack", "postman", "swagger",
        "linux", "unix", "bash", "vim", "vscode", "intellij", "eclipse",
        "maven", "gradle", "npm", "yarn", "pip", "conda", "virtualenv",
        "terraform", "ansible", "chef", "puppet", "vagrant", "nginx",
        "apache", "circleci", "travis ci", "github actions", "sonarqube"
    ],
    "Databases": [
        "sql", "mysql", "postgresql", "postgres", "mongodb", "oracle", 
        "sql server", "mssql", "sqlite", "redis", "cassandra", "dynamodb", 
        "firebase", "firestore", "mariadb", "neo4j", "couchdb", "elasticsearch",
        "influxdb", "timescaledb", "cockroachdb", "snowflake", "bigquery"
    ],
    "Cloud": [
        "aws", "amazon web services", "azure", "microsoft azure", "gcp", 
        "google cloud", "google cloud platform", "heroku", "digitalocean",
        "cloud computing", "serverless", "lambda", "ec2", "s3", "cloudfront",
        "rds", "cloudformation", "azure functions", "cloud run", "app engine",
        "ecs", "eks", "aks", "gke", "cloud storage", "cdn", "iam"
    ],
    "Mobile": [
        "android", "ios", "react native", "flutter", "swift", "kotlin",
        "xamarin", "ionic", "cordova", "phonegap", "mobile development",
        "swiftui", "jetpack compose", "firebase", "expo", "capacitor"
    ],
    "DevOps": [
        "devops", "ci/cd", "continuous integration", "continuous deployment",
        "docker", "kubernetes", "jenkins", "terraform", "ansible", "git",
        "github actions", "gitlab ci", "circleci", "travis ci", "monitoring",
        "logging", "prometheus", "grafana", "elk", "datadog", "new relic",
        "splunk", "pagerduty", "nagios"
    ],
    "Testing": [
        "testing", "unit testing", "integration testing", "tdd", "bdd",
        "test driven development", "jest", "mocha", "chai", "pytest",
        "junit", "testng", "selenium", "cypress", "playwright", "puppeteer",
        "postman", "jmeter", "loadrunner", "qa", "quality assurance"
    ],
    "Soft_Skills": [
        "agile", "scrum", "kanban", "leadership", "teamwork", "collaboration",
        "communication", "problem solving", "critical thinking", "project management",
        "time management", "adaptability", "creativity", "presentation"
    ],
    "Security": [
        "security", "cybersecurity", "penetration testing", "ethical hacking",
        "encryption", "ssl", "tls", "https", "oauth", "jwt", "authentication",
        "authorization", "owasp", "firewall", "vpn", "iam", "pki"
    ]
}


# ============================================================================
# SKILL METADATA - Importance and ATS impact for each skill
# ============================================================================

SKILL_DETAILS = {
    # Programming Languages
    "python": {"importance": "High", "ats_impact": "Essential for data science, ML, backend dev, and automation. Top ATS keyword."},
    "java": {"importance": "High", "ats_impact": "Critical for enterprise applications, Android, and backend systems."},
    "javascript": {"importance": "High", "ats_impact": "Core for web development, both frontend and backend (Node.js)."},
    "typescript": {"importance": "High", "ats_impact": "Increasingly important for large-scale JavaScript applications."},
    "sql": {"importance": "High", "ats_impact": "Universal for database operations across all industries."},
    "c++": {"importance": "Medium", "ats_impact": "Important for systems programming, game dev, and performance-critical apps."},
    "c": {"importance": "Medium", "ats_impact": "Foundational for OS development and embedded systems."},
    "go": {"importance": "Medium", "ats_impact": "Growing importance in cloud-native and microservices development."},
    "rust": {"importance": "Medium", "ats_impact": "Emerging language for systems programming with memory safety."},
    "kotlin": {"importance": "Medium", "ats_impact": "Preferred for modern Android development."},
    "swift": {"importance": "Medium", "ats_impact": "Essential for iOS and macOS development."},
    
    # Web Technologies
    "react": {"importance": "High", "ats_impact": "Most popular frontend framework, highly sought in web development roles."},
    "node": {"importance": "High", "ats_impact": "Essential for JavaScript backend development and full-stack roles."},
    "angular": {"importance": "Medium", "ats_impact": "Important for enterprise web applications."},
    "vue": {"importance": "Medium", "ats_impact": "Growing frontend framework, especially in startups."},
    "html": {"importance": "Medium", "ats_impact": "Basic web building block, often combined with CSS and JavaScript."},
    "css": {"importance": "Medium", "ats_impact": "Essential for web styling and responsive design."},
    "django": {"importance": "Medium", "ats_impact": "Popular Python web framework for backend development."},
    "flask": {"importance": "Medium", "ats_impact": "Lightweight Python framework for web APIs and applications."},
    "express": {"importance": "High", "ats_impact": "Standard Node.js framework for backend development."},
    "spring": {"importance": "High", "ats_impact": "Enterprise-standard Java framework."},
    
    # Data & ML
    "machine learning": {"importance": "High", "ats_impact": "Top keyword for AI/ML roles, data science, and research positions."},
    "data analysis": {"importance": "High", "ats_impact": "Core skill for data analyst, data scientist, and BI roles."},
    "pandas": {"importance": "High", "ats_impact": "Industry-standard Python library for data manipulation."},
    "numpy": {"importance": "Medium", "ats_impact": "Foundational for numerical computing in Python."},
    "tensorflow": {"importance": "High", "ats_impact": "Leading deep learning framework from Google."},
    "pytorch": {"importance": "High", "ats_impact": "Preferred framework for ML research and production."},
    "scikit-learn": {"importance": "High", "ats_impact": "Standard machine learning library for Python."},
    "deep learning": {"importance": "High", "ats_impact": "Advanced ML technique, highly valued in AI roles."},
    "nlp": {"importance": "High", "ats_impact": "Natural Language Processing, critical for AI applications."},
    "tableau": {"importance": "Medium", "ats_impact": "Popular business intelligence and visualization tool."},
    "power bi": {"importance": "Medium", "ats_impact": "Microsoft's BI tool, common in corporate environments."},
    
    # Tools & Version Control
    "git": {"importance": "High", "ats_impact": "Universal version control, expected in almost all development roles."},
    "github": {"importance": "High", "ats_impact": "Standard platform for code collaboration and portfolio."},
    "docker": {"importance": "High", "ats_impact": "Essential for containerization in modern development and DevOps."},
    "kubernetes": {"importance": "High", "ats_impact": "Standard for container orchestration in cloud environments."},
    "jenkins": {"importance": "Medium", "ats_impact": "Popular CI/CD tool for automation."},
    "linux": {"importance": "Medium", "ats_impact": "Important for server management and development environments."},
    "jira": {"importance": "Medium", "ats_impact": "Widely used project management tool in tech companies."},
    
    # Databases
    "mongodb": {"importance": "Medium", "ats_impact": "Popular NoSQL database, especially with JavaScript stack."},
    "postgresql": {"importance": "High", "ats_impact": "Advanced open-source relational database."},
    "mysql": {"importance": "High", "ats_impact": "Widely used relational database."},
    "redis": {"importance": "Medium", "ats_impact": "In-memory data store for caching and real-time applications."},
    "elasticsearch": {"importance": "Medium", "ats_impact": "Search and analytics engine."},
    
    # Cloud
    "aws": {"importance": "High", "ats_impact": "Leading cloud platform, highly desired for cloud and DevOps roles."},
    "azure": {"importance": "High", "ats_impact": "Microsoft's cloud platform, important in enterprise environments."},
    "gcp": {"importance": "Medium", "ats_impact": "Google's cloud platform, growing in adoption."},
    
    # Mobile
    "android": {"importance": "Medium", "ats_impact": "Essential for Android mobile development."},
    "ios": {"importance": "Medium", "ats_impact": "Essential for iOS mobile development."},
    "react native": {"importance": "Medium", "ats_impact": "Cross-platform mobile development framework."},
    "flutter": {"importance": "Medium", "ats_impact": "Google's cross-platform mobile framework."},
    
    # DevOps & Testing
    "ci/cd": {"importance": "High", "ats_impact": "Critical for modern software development practices."},
    "terraform": {"importance": "Medium", "ats_impact": "Infrastructure as Code tool, important for DevOps."},
    "ansible": {"importance": "Medium", "ats_impact": "Configuration management and automation tool."},
    "agile": {"importance": "Medium", "ats_impact": "Standard development methodology."},
    "scrum": {"importance": "Medium", "ats_impact": "Popular Agile framework."},
}


# ============================================================================
# CORE FUNCTIONS
# ============================================================================

def extract_resume_text(file_path: str) -> str:
    """
    Extract text from PDF resume with better layout preservation.
    """
    if not Path(file_path).exists():
        raise FileNotFoundError(f"Resume file not found: {file_path}")
    
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Use a more robust extraction method that handles columns better
                # We sort characters by top, then left to maintain reading order
                words = page.extract_words(x_tolerance=3, y_tolerance=3)
                if words:
                    # Group words by line (same top or very close top)
                    lines_dict = {}
                    for w in words:
                        top = round(float(w['top']))
                        if top not in lines_dict:
                            lines_dict[top] = []
                        lines_dict[top].append(w)
                    
                    # Sort lines by top
                    sorted_tops = sorted(lines_dict.keys())
                    for top in sorted_tops:
                        # Sort words in line by left position
                        line_words = sorted(lines_dict[top], key=lambda x: float(x['x0']))
                        line_text = " ".join(w['text'] for w in line_words)
                        text += line_text + "\n"
                else:
                    # Fallback to standard extraction
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        
        if not text.strip():
            raise ValueError("No text could be extracted from the PDF.")
        
        return text
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")


def extract_skills(resume_text: str) -> Dict[str, List[str]]:
    """
    Extract skills from resume text based on comprehensive skill database.
    
    Args:
        resume_text: The resume text content
        
    Returns:
        Dictionary of categorized skills found in the resume
    """
    text = resume_text.lower()
    skills_found = {category: [] for category in SKILL_DB}
    
    for category, skills in SKILL_DB.items():
        for skill in skills:
            # Use word boundaries for better matching
            # Handle multi-word skills and special characters
            skill_pattern = skill.replace('.', r'\.').replace('+', r'\+')
            pattern = r'\b' + skill_pattern + r'\b'
            
            if re.search(pattern, text):
                if skill not in skills_found[category]:  # Avoid duplicates
                    skills_found[category].append(skill)
    
    return skills_found


def detect_sections(resume_text: str) -> Dict[str, bool]:
    """
    Detect presence of key resume sections.
    
    Args:
        resume_text: The resume text content
        
    Returns:
        Dictionary indicating which sections are present
    """
    text = resume_text.lower()
    sections = {
        "education": False,
        "skills": False,
        "experience": False,
        "projects": False,
        "certification": False
    }
    
    # Comprehensive section detection patterns
    section_patterns = {
        "education": [
            r'\beducation\b', r'\bacademic\b', r'\bdegree\b', r'\buniversity\b', 
            r'\bcollege\b', r'\bschool\b', r'\beducational background\b',
            r'\bacademic qualifications\b'
        ],
        "skills": [
            r'\bskills\b', r'\btechnical skills\b', r'\bcompetencies\b', 
            r'\bexpertise\b', r'\bproficiencies\b', r'\bcore competencies\b',
            r'\btechnologies\b', r'\btools\b'
        ],
        "experience": [
            r'\bexperience\b', r'\bwork history\b', r'\bemployment\b', 
            r'\bprofessional experience\b', r'\bwork experience\b',
            r'\bcareer history\b', r'\bprofessional background\b'
        ],
        "projects": [
            r'\bprojects\b', r'\bportfolio\b', r'\bwork samples\b',
            r'\bpersonal projects\b', r'\bacademic projects\b',
            r'\bkey projects\b'
        ],
        "certification": [
            r'\bcertification\b', r'\bcertificate\b', r'\blicense\b', 
            r'\baccreditation\b', r'\bcertified\b', r'\bcertifications\b',
            r'\bprofessional certifications\b'
        ]
    }
    
    for section, patterns in section_patterns.items():
        for pattern in patterns:
            if re.search(pattern, text):
                sections[section] = True
                break
    
    return sections


def calculate_ats_score(resume_text: str, skills_found: Dict[str, List[str]]) -> Tuple[int, Dict[str, Any], List[Dict[str, str]], Dict[str, int]]:
    """
    Calculate comprehensive ATS score. 
    Each of the 5 categories is worth 20 points, totaling 100.
    """
    temp_strengths_list = []
    resume_weaknesses = []
    
    text = resume_text.lower()
    words = text.split()
    word_count = len(words)
    
    # 1. FORMATTING (20 points: 15 for sections + 5 for length)
    sections = detect_sections(resume_text)
    section_points = sum(3 for present in sections.values() if present) # 5 sections * 3 = 15
    for section, present in sections.items():
        if present:
            temp_strengths_list.append({"strength": f"{section.capitalize()} section present", "tip": f"Your {section} section is well-structured."})
        else:
            resume_weaknesses.append({"weakness": f"{section.capitalize()} section missing", "impact": "Reduces ATS compatibility.", "fix": f"Add a '{section.capitalize()}' section."})
            
    len_points = 0
    if 400 <= word_count <= 700: len_points = 5
    elif 300 <= word_count <= 900: len_points = 4
    
    formatting_score = section_points + len_points # Max 20

    # 2. SKILLS MATCH (20 points)
    total_skills = sum(len(v) for v in skills_found.values())
    skills_score = 0
    if total_skills >= 20: skills_score = 20
    elif total_skills >= 15: skills_score = 18
    elif total_skills >= 10: skills_score = 15
    elif total_skills >= 6: skills_score = 10
    else: skills_score = 5
    
    if skills_score >= 15:
        temp_strengths_list.append({"strength": "Strong technical skills", "tip": f"You have {total_skills} skills listed."})
    
    # 3. EXPERIENCE RELEVANCE (20 points)
    exp_keywords = ["intern", "internship", "worked", "developed", "implemented", "built", "created", "designed", "managed", "led", "achieved", "improved", "delivered", "launched", "optimized", "automated", "reduced", "increased", "established", "coordinated", "collaborated"]
    exp_hits = sum(1 for k in exp_keywords if re.search(r'\b' + k + r'\b', text))
    experience_score = 0
    if exp_hits >= 8: experience_score = 20
    elif exp_hits >= 5: experience_score = 16
    elif exp_hits >= 3: experience_score = 12
    elif exp_hits >= 1: experience_score = 8
    
    if experience_score >= 12:
        temp_strengths_list.append({"strength": "Good experience indicators", "tip": f"You use {exp_hits} action verbs."})
        
    # 4. KEYWORDS (20 points)
    unique_words = set(words)
    unique_ratio = len(unique_words) / max(len(words), 1)
    keywords_score = 0
    if unique_ratio > 0.50: keywords_score = 20
    elif unique_ratio > 0.45: keywords_score = 16
    elif unique_ratio > 0.35: keywords_score = 12
    
    if keywords_score >= 12:
        temp_strengths_list.append({"strength": "Good keyword diversity", "tip": f"Your vocabulary is varied."})

    # 5. EDUCATION (20 points)
    edu_keywords = ["b.tech", "btech", "be", "b.e", "b.e.", "bca", "mca", "degree", "bachelor", "master", "diploma", "ph.d", "phd", "m.tech", "mtech", "ms", "bs", "mba"]
    edu_found = any(re.search(r'\b' + k + r'\b', text) for k in edu_keywords)
    education_score = 20 if edu_found else 0
    if edu_found:
        temp_strengths_list.append({"strength": "Education credentials clear", "tip": "Educational background is well-documented."})

    # CONTACT INFORMATION (Bonus analysis)
    has_email = bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text))
    has_phone = bool(re.search(r'\b\d{10}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}[-.\s]?\d{10}\b', text))
    has_linkedin = bool(re.search(r'linkedin\.com', text))
    has_github = bool(re.search(r'github\.com', text))
    contact_count = sum([has_email, has_phone, has_linkedin, has_github])
    
    if contact_count >= 3:
        temp_strengths_list.append({"strength": "Complete contact info", "tip": f"Excellent! You have {contact_count} contact methods."})
    elif contact_count >= 2:
        temp_strengths_list.append({"strength": "Good contact info", "tip": f"You have {contact_count} contact methods."})
    
    # QUANTIFIABLE ACHIEVEMENTS (Bonus analysis)
    numbers_pattern = r'\b\d+%|\b\d+x|\b\d+\+|\b\d+ (percent|users|customers|million|thousand|projects|applications)\b'
    if bool(re.search(numbers_pattern, text, re.IGNORECASE)):
        temp_strengths_list.append({"strength": "Quantifiable achievements", "tip": "Great! You include metrics and numbers in your resume."})

    total_score = formatting_score + skills_score + experience_score + keywords_score + education_score
    
    score_breakdown = {
        "formatting": formatting_score,
        "skills": skills_score,
        "experience": experience_score,
        "keywords": keywords_score,
        "education": education_score
    }

    enhanced_strengths = {
        "summary": f"Your resume demonstrates {len(temp_strengths_list)} key strengths that contribute to your ATS score of {total_score}/100.",
        "individual_tips": [s["tip"] for s in temp_strengths_list],
        "strength_count": len(temp_strengths_list),
        "score": total_score
    }
    
    return total_score, enhanced_strengths, resume_weaknesses, score_breakdown


def skill_gap_analysis(skills_found: Dict[str, List[str]]) -> Dict[str, Any]:
    """
    Analyze skill gaps with comprehensive ATS impact assessment.
    
    Args:
        skills_found: Dictionary of categorized skills found in resume
        
    Returns:
        Dictionary containing gap analysis summary, impact, and recommendations
    """
    all_missing_skills = []
    overall_impact_statements = []
    
    # Identify all missing skills and their metadata
    for category, skills_in_db in SKILL_DB.items():
        for skill in skills_in_db:
            if skill not in skills_found[category]:
                all_missing_skills.append(skill)
                
                # Get importance and ATS impact for this skill
                detail = SKILL_DETAILS.get(skill, {
                    "importance": "Medium",
                    "ats_impact": "Skill adds value to specific roles and may improve ATS matching for relevant positions."
                })
                
                overall_impact_statements.append({
                    "skill": skill,
                    "category": category,
                    "importance": detail["importance"],
                    "ats_impact": detail["ats_impact"]
                })
    
    # If no gaps found - excellent coverage
    if not all_missing_skills:
        return {
            "summary": "Excellent! No significant skill gaps identified across all tracked categories.",
            "overall_impact": "Your resume demonstrates comprehensive technical skill coverage, which is highly beneficial for ATS matching across a wide range of positions.",
            "recommendation": "Continue to keep your skills updated with emerging technologies. Align your skillset with specific job descriptions when applying to maximize match scores.",
            "missing_skills_count": 0,
            "high_priority_gaps": [],
            "medium_priority_gaps": [],
            "missing_by_category": {}
        }
    
    # Analyze missing skills by priority
    num_gaps = len(all_missing_skills)
    high_importance_gaps = [item for item in overall_impact_statements if item["importance"] == "High"]
    medium_importance_gaps = [item for item in overall_impact_statements if item["importance"] == "Medium"]
    low_importance_gaps = [item for item in overall_impact_statements if item["importance"] == "Low"]
    
    high_count = len(high_importance_gaps)
    medium_count = len(medium_importance_gaps)
    low_count = len(low_importance_gaps)
    
    # Categorize missing skills by category
    missing_by_category = {}
    for item in overall_impact_statements:
        cat = item["category"]
        if cat not in missing_by_category:
            missing_by_category[cat] = []
        missing_by_category[cat].append({
            "skill": item["skill"],
            "importance": item["importance"],
            "ats_impact": item["ats_impact"]
        })
    
    # Generate summary highlighting top missing skills
    top_missing_high = [g["skill"] for g in high_importance_gaps[:5]]
    top_missing_medium = [g["skill"] for g in medium_importance_gaps[:5]]
    
    if top_missing_high:
        summary_preview = ", ".join(top_missing_high)
    elif top_missing_medium:
        summary_preview = ", ".join(top_missing_medium)
    else:
        summary_preview = ", ".join(sorted(set(all_missing_skills))[:10])
    
    summary_text = (
        f"Analysis identified {num_gaps} skill gaps across various categories. "
        f"Priority breakdown: {high_count} high-importance, {medium_count} medium-importance, {low_count} low-importance. "
        f"Key missing skills include: {summary_preview}."
    )
    
    # Determine overall ATS impact based on missing skill priorities
    if high_count >= num_gaps / 2 and high_count >= 5:
        impact_level = "CRITICAL"
        overall_impact_summary = (
            f"⚠️ CRITICAL CONCERN: {high_count} high-importance skills are missing. "
            f"These gaps could severely limit your resume's visibility in ATS systems and may lead to automatic disqualification for many relevant positions. "
            f"High-priority skills like {', '.join([g['skill'] for g in high_importance_gaps[:3]])} are frequently used as filter criteria by ATS."
        )
    elif high_count >= 3:
        impact_level = "MODERATE"
        overall_impact_summary = (
            f"⚠ MODERATE CONCERN: {high_count} high-importance skills and {medium_count} medium-importance skills are missing. "
            f"This could moderately impact your ATS ranking and limit shortlisting opportunities for positions requiring these core competencies. "
            f"Focus on acquiring: {', '.join([g['skill'] for g in high_importance_gaps[:3]])}."
        )
    elif medium_count >= 10:
        impact_level = "LOW TO MODERATE"
        overall_impact_summary = (
            f"◐ LOW TO MODERATE CONCERN: The missing skills are mainly medium-importance ({medium_count} skills). "
            f"While not critical, adding these skills could broaden your appeal and improve ATS matching for a wider range of positions."
        )
    else:
        impact_level = "LOW"
        overall_impact_summary = (
            f"✓ LOW CONCERN: The identified gaps are primarily in lower-priority or specialized skills. "
            f"These have minimal direct impact on ATS matching for general positions, but may be important for specific niche roles."
        )
    
    # Generate comprehensive recommendations
    if high_count > 0:
        consolidated_recommendation = (
            f"🎯 IMMEDIATE ACTIONS NEEDED:\n"
            f"1. PRIORITIZE HIGH-IMPORTANCE SKILLS: Focus on acquiring these {high_count} critical skills first: "
            f"{', '.join([g['skill'] for g in high_importance_gaps[:5]])}. These are often mandatory requirements in job descriptions.\n"
            f"2. LEARN AND DEMONSTRATE: Take online courses (Coursera, Udemy, edX), complete hands-on projects, "
            f"or contribute to open-source to gain practical experience.\n"
            f"3. UPDATE RESUME: Once proficient, add these skills to your resume with specific examples of usage in your projects or experience.\n"
            f"4. USE PRECISE KEYWORDS: Mirror the exact terminology from job descriptions. For example, if a job mentions 'React.js', "
            f"include 'React.js' or 'React' rather than just 'frontend frameworks'.\n"
            f"5. VALIDATE WITH PROJECTS: Build portfolio projects showcasing new skills to strengthen credibility."
        )
    elif medium_count > 0:
        consolidated_recommendation = (
            f"📈 RECOMMENDED IMPROVEMENTS:\n"
            f"1. Expand your skillset gradually by learning medium-priority skills like: {', '.join([g['skill'] for g in medium_importance_gaps[:5]])}.\n"
            f"2. Integrate new skills into your existing projects and update your resume accordingly.\n"
            f"3. Focus on skills relevant to your target role and industry.\n"
            f"4. Use online resources, certifications, or personal projects to demonstrate competency."
        )
    else:
        consolidated_recommendation = (
            f"✓ MAINTAIN AND REFINE:\n"
            f"1. Your skill coverage is strong. Continue to keep current skills updated.\n"
            f"2. Stay informed about emerging technologies in your field.\n"
            f"3. Tailor your resume for specific job applications by emphasizing relevant skills from your existing skillset."
        )
    
    return {
        "summary": summary_text,
        "overall_impact": overall_impact_summary,
        "impact_level": impact_level,
        "recommendation": consolidated_recommendation,
        "missing_skills_count": num_gaps,
        "high_priority_gaps": [g["skill"] for g in high_importance_gaps[:10]],
        "medium_priority_gaps": [g["skill"] for g in medium_importance_gaps[:10]],
        "low_priority_gaps": [g["skill"] for g in low_importance_gaps[:10]],
        "missing_by_category": missing_by_category,
        "priority_breakdown": {
            "high": high_count,
            "medium": medium_count,
            "low": low_count
        }
    }


def get_ats_optimization_advice(
    ats_score: int,
    enhanced_strengths: Dict[str, Any],
    resume_weaknesses: List[Dict[str, str]],
    skill_gaps: Dict[str, Any]
) -> List[str]:
    """
    Generate comprehensive, actionable ATS optimization advice.
    
    Args:
        ats_score: Calculated ATS score (0-100)
        enhanced_strengths: Dictionary of strengths analysis
        resume_weaknesses: List of identified weaknesses
        skill_gaps: Dictionary of skill gap analysis
        
    Returns:
        List of actionable advice strings formatted for easy reading
    """
    advice = []
    
    # ========================================================================
    # OVERALL SCORE ASSESSMENT
    # ========================================================================
    advice.append("=" * 70)
    advice.append("ATS RESUME ANALYSIS REPORT")
    advice.append("=" * 70)
    advice.append("")
    
    if ats_score >= 85:
        advice.append(f"✓✓✓ EXCELLENT! Your resume scored {ats_score}/100")
        advice.append("")
        advice.append("Your resume is highly optimized for ATS systems. You're in the top tier")
        advice.append("and should pass most automated screenings. Focus on tailoring for specific")
        advice.append("roles to maximize your success rate.")
    elif ats_score >= 70:
        advice.append(f"✓✓ STRONG! Your resume scored {ats_score}/100")
        advice.append("")
        advice.append("Your resume is well-optimized and likely to pass most ATS screenings.")
        advice.append("With some targeted improvements, you can reach the excellent tier.")
    elif ats_score >= 55:
        advice.append(f"◐ GOOD! Your resume scored {ats_score}/100")
        advice.append("")
        advice.append("Your resume will pass many ATS screenings but has significant room for")
        advice.append("improvement. Focus on the high-priority items below to boost your score.")
    elif ats_score >= 40:
        advice.append(f"⚠ NEEDS IMPROVEMENT! Your resume scored {ats_score}/100")
        advice.append("")
        advice.append("Your resume may struggle with many ATS systems. Immediate optimization")
        advice.append("is recommended to improve your chances of getting past automated screening.")
    else:
        advice.append(f"⚠⚠ CRITICAL! Your resume scored {ats_score}/100")
        advice.append("")
        advice.append("Your resume is at high risk of being filtered out by ATS systems.")
        advice.append("Urgent optimization needed. Follow the recommendations below carefully.")
    
    advice.append("")
    
    # ========================================================================
    # STRENGTHS SECTION
    # ========================================================================
    if enhanced_strengths and enhanced_strengths.get('individual_tips'):
        advice.append("=" * 70)
        advice.append("✓ YOUR STRENGTHS")
        advice.append("=" * 70)
        advice.append("")
        advice.append(enhanced_strengths.get('summary', 'Your resume has several strong points.'))
        advice.append("")
        advice.append("KEY STRENGTHS:")
        
        for i, tip in enumerate(enhanced_strengths['individual_tips'][:8], 1):
            advice.append(f"  {i}. {tip}")
        
        advice.append("")
    
    # ========================================================================
    # WEAKNESSES SECTION - PRIORITIZED
    # ========================================================================
    if resume_weaknesses:
        advice.append("=" * 70)
        advice.append("⚠ AREAS FOR IMMEDIATE IMPROVEMENT")
        advice.append("=" * 70)
        advice.append("")
        advice.append(f"Identified {len(resume_weaknesses)} issues that need attention:")
        advice.append("")
        
        for i, weakness in enumerate(resume_weaknesses[:10], 1):
            advice.append(f"{i}. ISSUE: {weakness.get('weakness', 'Issue identified')}")
            advice.append(f"   IMPACT: {weakness.get('impact', 'May affect ATS performance')}")
            advice.append(f"   FIX: {weakness.get('fix', 'Address this issue')}")
            advice.append("")
    
    # ========================================================================
    # SKILL GAP ANALYSIS
    # ========================================================================
    if skill_gaps:
        advice.append("=" * 70)
        advice.append("📊 SKILL GAP ANALYSIS")
        advice.append("=" * 70)
        advice.append("")
        
        advice.append(f"SUMMARY: {skill_gaps.get('summary', 'Analysis complete')}")
        advice.append("")
        
        advice.append(f"ATS IMPACT: {skill_gaps.get('overall_impact', 'Variable impact based on role')}")
        advice.append("")
        
        # Show high priority gaps prominently
        if skill_gaps.get('high_priority_gaps'):
            advice.append("🎯 HIGH-PRIORITY MISSING SKILLS (Learn These First):")
            for skill in skill_gaps['high_priority_gaps'][:8]:
                advice.append(f"  • {skill}")
            advice.append("")
        
        # Show medium priority if space
        if skill_gaps.get('medium_priority_gaps') and len(skill_gaps.get('high_priority_gaps', [])) < 5:
            advice.append("📈 MEDIUM-PRIORITY MISSING SKILLS (Consider Learning):")
            for skill in skill_gaps['medium_priority_gaps'][:5]:
                advice.append(f"  • {skill}")
            advice.append("")
        
        advice.append("RECOMMENDATION:")
        advice.append(skill_gaps.get('recommendation', 'Continue skill development'))
        advice.append("")
    
    # ========================================================================
    # GENERAL OPTIMIZATION TIPS
    # ========================================================================
    advice.append("=" * 70)
    advice.append("💡 GENERAL ATS OPTIMIZATION TIPS")
    advice.append("=" * 70)
    advice.append("")
    advice.append("1. TAILOR FOR EACH JOB:")
    advice.append("   • Customize your resume for each application")
    advice.append("   • Mirror keywords from the job description")
    advice.append("   • Highlight most relevant experiences first")
    advice.append("")
    advice.append("2. USE STANDARD FORMATTING:")
    advice.append("   • Use standard section headers (Experience, Education, Skills)")
    advice.append("   • Avoid tables, text boxes, headers/footers")
    advice.append("   • Use standard fonts (Arial, Calibri, Times New Roman)")
    advice.append("   • Save as PDF for consistency")
    advice.append("")
    advice.append("3. OPTIMIZE KEYWORD USAGE:")
    advice.append("   • Include both acronyms and full terms (AI and Artificial Intelligence)")
    advice.append("   • Use industry-standard terminology")
    advice.append("   • Add relevant synonyms naturally")
    advice.append("")
    advice.append("4. QUANTIFY ACHIEVEMENTS:")
    advice.append("   • Use specific metrics (increased by 40%, managed team of 5)")
    advice.append("   • Include numbers, percentages, timeframes")
    advice.append("   • Show tangible impact of your work")
    advice.append("")
    advice.append("5. PROOFREAD CAREFULLY:")
    advice.append("   • Check for spelling and grammar errors")
    advice.append("   • Ensure consistent formatting")
    advice.append("   • Verify all dates and information are accurate")
    advice.append("")
    
    # ========================================================================
    # FINAL RECOMMENDATIONS
    # ========================================================================
    advice.append("=" * 70)
    advice.append("🎯 NEXT STEPS")
    advice.append("=" * 70)
    advice.append("")
    
    if ats_score < 60:
        advice.append("IMMEDIATE PRIORITY:")
        advice.append("1. Fix all critical weaknesses listed above")
        advice.append("2. Add missing sections (if any)")
        advice.append("3. Expand your skills section significantly")
        advice.append("4. Add quantifiable achievements with metrics")
        advice.append("5. Reanalyze your resume after changes")
    elif ats_score < 80:
        advice.append("RECOMMENDED ACTIONS:")
        advice.append("1. Address high-impact weaknesses first")
        advice.append("2. Add 5-10 more relevant technical skills")
        advice.append("3. Incorporate more action verbs in experience descriptions")
        advice.append("4. Add specific metrics to demonstrate impact")
        advice.append("5. Review and update based on target job descriptions")
    else:
        advice.append("OPTIMIZATION ACTIONS:")
        advice.append("1. Fine-tune for specific job applications")
        advice.append("2. Keep skills updated with latest technologies")
        advice.append("3. Continuously add quantifiable achievements")
        advice.append("4. Maintain consistent formatting and structure")
        advice.append("5. Consider adding certifications or recent projects")
    
    advice.append("")
    advice.append("=" * 70)
    advice.append("End of ATS Analysis Report")
    advice.append("=" * 70)
    
    return advice


def analyze_resume(file_path: str) -> Dict[str, Any]:
    """
    Main function to analyze a resume and return comprehensive results.
    
    Args:
        file_path: Path to the PDF resume file
        
    Returns:
        Dictionary containing all analysis results including:
        - success: Boolean indicating if analysis succeeded
        - ats_score: Score from 0-100
        - skills_found: Dictionary of categorized skills
        - skill_gaps: Detailed gap analysis
        - enhanced_strengths: Strengths with tips
        - resume_weaknesses: List of weaknesses with fixes
        - ats_optimization_advice: Comprehensive advice
        - word_count: Total word count
        - sections_detected: Which sections were found
    """
    try:
        # Extract text from PDF
        resume_text = extract_resume_text(file_path)
        
        # Extract skills from resume
        skills_found = extract_skills(resume_text)
        
        # Calculate comprehensive ATS score
        ats_score, enhanced_strengths, resume_weaknesses, score_breakdown = calculate_ats_score(
            resume_text, skills_found
        )
        
        # Analyze skill gaps
        skill_gaps = skill_gap_analysis(skills_found)
        
        # Generate optimization advice
        ats_optimization_advice = get_ats_optimization_advice(
            ats_score, enhanced_strengths, resume_weaknesses, skill_gaps
        )
        
        # Compile and return all results
        return {
            "success": True,
            "ats_score": ats_score,
            "score_breakdown": score_breakdown,
            "skills_found": skills_found,
            "total_skills_found": sum(len(v) for v in skills_found.values()),
            "skill_gaps": skill_gaps,
            "enhanced_strengths": enhanced_strengths,
            "resume_weaknesses": resume_weaknesses,
            "ats_optimization_advice": ats_optimization_advice,
            "word_count": len(resume_text.split()),
            "sections_detected": detect_sections(resume_text),
            "metadata": {
                "file_path": file_path,
                "file_name": Path(file_path).name,
                "analysis_version": "1.0.0"
            }
        }
        
    except FileNotFoundError as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": "FileNotFoundError",
            "message": "Resume file not found. Please check the file path."
        }
    except ValueError as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": "ValueError",
            "message": "Could not extract text from PDF. The file may be empty or corrupted."
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "An unexpected error occurred during analysis."
        }


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    """Main entry point for command-line usage."""
    parser = argparse.ArgumentParser(
        description='Analyze resume and calculate ATS score with comprehensive feedback',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s resume.pdf
  %(prog)s resume.pdf --output results.json
  %(prog)s resume.pdf --pretty
  %(prog)s resume.pdf -o results.json --pretty

For integration with Node.js/React:
  See documentation for API integration examples
        """
    )
    
    parser.add_argument(
        'resume_path',
        help='Path to the PDF resume file'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output JSON file path (optional, prints to stdout if not specified)'
    )
    parser.add_argument(
        '--pretty', '-p',
        action='store_true',
        help='Pretty print JSON output with indentation'
    )
    parser.add_argument(
        '--version', '-v',
        action='version',
        version='%(prog)s 1.0.0'
    )
    
    args = parser.parse_args()
    
    # Analyze the resume
    print("Analyzing resume...", file=sys.stderr)
    results = analyze_resume(args.resume_path)
    
    # Format output
    indent = 2 if args.pretty else None
    json_output = json.dumps(results, indent=indent, ensure_ascii=False)
    
    # Output results
    if args.output:
        try:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(json_output)
            print(f"✓ Results saved to {args.output}", file=sys.stderr)
        except Exception as e:
            print(f"✗ Error saving to file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Print to stdout for piping/parsing
        print(json_output)
    
    # Exit with appropriate code
    exit_code = 0 if results.get('success', False) else 1
    
    # Print summary to stderr (won't interfere with JSON output)
    if results.get('success'):
        print(f"\n✓ Analysis complete! ATS Score: {results['ats_score']}/100", file=sys.stderr)
    else:
        print(f"\n✗ Analysis failed: {results.get('error', 'Unknown error')}", file=sys.stderr)
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
