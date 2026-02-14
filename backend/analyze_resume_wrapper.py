#!/usr/bin/env python3
"""
Wrapper script to analyze a resume using the ats_resume_analyzer module.
Called from Node.js backend via child_process.

Usage:
    python analyze_resume_wrapper.py <path_to_resume.pdf>

Outputs JSON to stdout for Node.js to parse.
"""

import sys
import json
import os
import io

# Force UTF-8 encoding on stdout/stderr to avoid Windows charmap errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add the directory of this script to the path so we can import the analyzer
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from ats_resume_analyzer import (
    extract_resume_text,
    extract_skills,
    detect_sections,
    calculate_ats_score,
    skill_gap_analysis,
    get_ats_optimization_advice,
    SKILL_DB,
    SKILL_DETAILS
)

def suggest_roles(skills_found):
    """
    Suggest suitable job roles based on the skills found in the resume.
    """
    role_skill_map = {
        "Full Stack Developer": ["javascript", "react", "node", "nodejs", "express", "mongodb", "html", "css", "sql"],
        "Frontend Developer": ["react", "angular", "vue", "html", "css", "javascript", "typescript", "tailwind", "bootstrap"],
        "Backend Developer": ["node", "nodejs", "express", "django", "flask", "spring", "java", "python", "sql"],
        "Data Scientist": ["python", "machine learning", "pandas", "numpy", "tensorflow", "pytorch", "data analysis", "statistics"],
        "Data Analyst": ["python", "sql", "excel", "tableau", "power bi", "data analysis", "pandas", "data visualization"],
        "ML Engineer": ["python", "tensorflow", "pytorch", "machine learning", "deep learning", "scikit-learn", "keras"],
        "DevOps Engineer": ["docker", "kubernetes", "jenkins", "terraform", "ansible", "aws", "linux", "ci/cd", "git"],
        "Cloud Engineer": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "serverless", "cloud computing"],
        "Mobile App Developer": ["android", "ios", "react native", "flutter", "kotlin", "swift", "mobile development"],
        "Cybersecurity Analyst": ["security", "cybersecurity", "penetration testing", "encryption", "firewall", "owasp"],
        "QA / Test Engineer": ["testing", "selenium", "cypress", "jest", "pytest", "junit", "qa", "quality assurance"],
        "Software Engineer": ["python", "java", "javascript", "c++", "git", "sql", "docker", "agile"],
        "AI/NLP Engineer": ["nlp", "python", "deep learning", "transformers", "hugging face", "tensorflow", "pytorch"],
        "Database Administrator": ["sql", "mysql", "postgresql", "mongodb", "redis", "oracle", "elasticsearch"],
        "UI/UX Developer": ["html", "css", "javascript", "react", "figma", "bootstrap", "tailwind", "sass"],
    }

    all_skills = []
    for category_skills in skills_found.values():
        all_skills.extend([s.lower() for s in category_skills])
    all_skills_set = set(all_skills)

    suggested = []
    for role, required_skills in role_skill_map.items():
        match_count = len(all_skills_set.intersection(set(required_skills)))
        total_required = len(required_skills)
        if total_required > 0:
            match_pct = (match_count / total_required) * 100
        else:
            match_pct = 0

        if match_pct >= 30:  # At least 30% match
            suggested.append({
                "role": role,
                "match_percentage": round(match_pct, 1),
                "matched_skills": sorted(list(all_skills_set.intersection(set(required_skills)))),
                "missing_skills": sorted(list(set(required_skills) - all_skills_set)),
            })

    # Sort by match percentage descending
    suggested.sort(key=lambda x: x["match_percentage"], reverse=True)
    return suggested[:8]  # Return top 8 suggestions


def extract_experience_entries(resume_text):
    """
    Overhauled experience extraction:
    Isolates the experience block first, then parses entries.
    Handles sidebar interleaving by being smarter about section boundaries.
    """
    import re
    
    text = resume_text
    experiences = []
    
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    exp_start = -1
    
    # 1. Identify start of Experience section
    for i, line in enumerate(lines):
        if re.search(r'\b(?:experience|work history|employment|professional background|career history)\w*\b', line, re.IGNORECASE):
            # Header check: Should be relatively short
            if len(line.split()) < 5:
                exp_start = i + 1
                break
                
    if exp_start == -1:
        return []

    # 2. Extract until next major section header
    exp_lines = []
    stop_headers = r'\b(?:education|skills|projects|certifications|awards|references|summary|contact|hobbies|languages|technical)\b'
    
    for line in lines[exp_start:]:
        # If we see a very likely header for the next section, stop
        if len(line) < 40 and re.search(stop_headers, line, re.IGNORECASE):
            # Ensure it's not just a word in a sentence
            if line.isupper() or len(line.split()) < 4:
                break
        exp_lines.append(line)

    # 3. Parse the collected lines into entries
    current_entry = None
    bullet_chars = ('•', '-', '●', '▪', '*', '➢', '✓')
    
    # Keywords that often indicate a job title
    title_keywords = [
        "analyst", "intern", "developer", "engineer", "manager", "lead", 
        "internship", "consultant", "specialist", "coordinator", "officer", "associate", "trainee"
    ]
    
    date_pattern = r'(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,./]*\d{2,4})|(?:\d{2,4}[\s,./-]+\d{0,4})|(?:Present|Current|Now)'

    for line in exp_lines:
        is_bullet = line.startswith(bullet_chars)
        # Check if line contains a date pattern
        has_date = re.search(date_pattern, line, re.IGNORECASE)
        # Check if line contains title keywords
        has_title_kw = any(kw in line.lower() for kw in title_keywords)
        
        # A new entry usually starts with a title keyword or a line that looks like Title | Date
        # But if it's just a date line and we already have a title, don't start a new entry
        is_likely_new_entry = not is_bullet and (has_title_kw or (has_date and not current_entry))

        if is_likely_new_entry:
            if current_entry:
                experiences.append(current_entry)
            current_entry = {
                "title": line,
                "details": []
            }
        elif current_entry:
            clean = line
            for char in bullet_chars:
                if clean.startswith(char):
                    clean = clean[len(char):].strip()
                    break
            
            if clean:
                if is_bullet:
                    current_entry["details"].append(clean)
                else:
                    # If we don't have details yet, it's likely company/date info, keep it in title area
                    if not current_entry["details"]:
                        if "|" not in current_entry["title"]:
                            current_entry["title"] += " | " + clean
                        else:
                            current_entry["details"].append(clean)
                    else:
                        current_entry["details"][-1] += " " + clean

    if current_entry:
        experiences.append(current_entry)

    return experiences


def extract_projects(resume_text):
    """
    Extremely strict project extraction:
    Only considers lines with '|' as new project titles.
    Everything else is a bullet or detail.
    """
    import re

    text = resume_text
    projects = []

    # Split into lines
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    proj_section_start = -1
    
    # 1. Find the Projects section
    for i, line in enumerate(lines):
        if re.search(r'\b(?:projects|personal projects|academic projects|key projects|portfolio)\b', line, re.IGNORECASE):
            proj_section_start = i + 1
            break
            
    if proj_section_start == -1:
        return []

    # 2. Extract lines until the next major section
    proj_lines = []
    # Major section headers to stop at
    stop_headers = r'\b(?:experience|work history|employment|education|skills|certifications|awards|references|summary|contact|hobbies|languages|technical)\w*\b'
    
    for line in lines[proj_section_start:]:
        # If we hit another major section, stop
        if len(line) < 40 and re.search(stop_headers, line, re.IGNORECASE):
            # Only stop if it's likely a header (short, capitalized or all caps)
            if line.isupper() or len(line.split()) < 4:
                break
        proj_lines.append(line)

    bullet_chars = ('•', '-', '●', '▪', '*', '➢', '✓')
    current_project = None
    
    # Words that should NEVER be project titles
    forbidden_titles = ["technical", "skills", "core", "certifications", "education", "summary", "awards"]

    for line in proj_lines:
        lower_line = line.lower()
        is_bullet = line.startswith(bullet_chars)
        
        # PRECISE TITLE DETECTION:
        # In this professional format, titles MUST have a pipe '|'
        # Also ensure we aren't picking up a stray header
        is_forbidden = any(word in lower_line for word in forbidden_titles) and len(line.split()) < 4
        is_new_title = '|' in line and not is_bullet and not is_forbidden

        if is_new_title:
            if current_project:
                projects.append(current_project)
            current_project = {
                "name": line,
                "details": []
            }
        elif current_project:
            # Clean bullet char
            detail = line
            for char in bullet_chars:
                if detail.startswith(char):
                    detail = detail[len(char):].strip()
                    break
            
            if detail:
                # If it's a new line without a pipe and we aren't starting a bullet,
                # it's almost certainly a sub-line or detail.
                if not is_bullet and current_project["details"]:
                    # Append as continuation of last bullet if it looks like one
                    current_project["details"][-1] += " " + detail
                else:
                    current_project["details"].append(detail)

    if current_project:
        projects.append(current_project)

    return projects


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "No file path provided",
            "message": "Usage: python analyze_resume_wrapper.py <path_to_resume.pdf>"
        }))
        sys.exit(1)

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(json.dumps({
            "success": False,
            "error": f"File not found: {file_path}",
            "message": "The specified resume file does not exist."
        }))
        sys.exit(1)

    try:
        # Extract text from PDF
        resume_text = extract_resume_text(file_path)

        # Extract skills
        skills_found = extract_skills(resume_text)

        # Calculate ATS score
        ats_score, enhanced_strengths, resume_weaknesses, score_breakdown = calculate_ats_score(
            resume_text, skills_found
        )

        # Detect sections
        sections = detect_sections(resume_text)

        # Skill gap analysis
        skill_gaps = skill_gap_analysis(skills_found)

        # Get optimization advice
        advice = get_ats_optimization_advice(
            ats_score, enhanced_strengths, resume_weaknesses, skill_gaps
        )

        # Suggest roles based on skills
        suggested_roles = suggest_roles(skills_found)

        # Extract experience entries
        experience = extract_experience_entries(resume_text)

        # Extract projects
        projects = extract_projects(resume_text)

        # Count total skills
        total_skills = sum(len(v) for v in skills_found.values())

        # Build comprehensive result
        result = {
            "success": True,
            "ats_score": ats_score,
            "score_breakdown": score_breakdown,
            "skills_found": skills_found,
            "total_skills_found": total_skills,
            "sections_detected": sections,
            "skill_gaps": skill_gaps,
            "enhanced_strengths": enhanced_strengths,
            "resume_weaknesses": resume_weaknesses,
            "ats_optimization_advice": advice,
            "suggested_roles": suggested_roles,
            "experience": experience,
            "projects": projects,
            "word_count": len(resume_text.split()),
            "metadata": {
                "file_path": file_path,
                "file_name": os.path.basename(file_path),
                "analysis_version": "1.0.0"
            }
        }

        # Output JSON to stdout
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "message": f"Analysis failed: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
