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
    Extract experience-related entries from resume text.
    Looks for patterns like job titles, companies, dates, and descriptions.
    """
    import re

    text = resume_text
    experiences = []

    # Split into lines
    lines = text.split('\n')

    # Look for experience-like patterns
    exp_section_found = False
    current_entry = None

    # Common date patterns
    date_pattern = r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{2,4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|Current|Now)[a-z]*[\s,]*\d{0,4}'
    year_range_pattern = r'\b20\d{2}\s*[-–—to]+\s*(?:20\d{2}|Present|Current|Now)\b'

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check if we're in the experience section
        if re.search(r'\b(?:experience|work history|employment|professional background|career history)\b', stripped, re.IGNORECASE):
            exp_section_found = True
            continue

        # Check if we've moved past experience section
        if exp_section_found and re.search(r'\b(?:education|skills|projects|certifications|awards|references)\b', stripped, re.IGNORECASE):
            exp_section_found = False
            if current_entry:
                experiences.append(current_entry)
                current_entry = None
            continue

        if exp_section_found:
            has_date = re.search(date_pattern, stripped, re.IGNORECASE) or re.search(year_range_pattern, stripped, re.IGNORECASE)

            if has_date and len(stripped) > 10:
                if current_entry:
                    experiences.append(current_entry)
                current_entry = {
                    "title": stripped,
                    "details": []
                }
            elif current_entry:
                current_entry["details"].append(stripped)
            elif stripped and len(stripped) > 5:
                # Possible start of an entry without date
                if current_entry:
                    current_entry["details"].append(stripped)
                else:
                    current_entry = {
                        "title": stripped,
                        "details": []
                    }

    if current_entry:
        experiences.append(current_entry)

    return experiences


def extract_projects(resume_text):
    """
    Extract project entries from resume text.
    """
    import re

    text = resume_text
    projects = []

    lines = text.split('\n')
    proj_section_found = False
    current_project = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check if we're in the projects section
        if re.search(r'\b(?:projects|personal projects|academic projects|key projects|portfolio)\b', stripped, re.IGNORECASE):
            proj_section_found = True
            continue

        # Check if we've moved past projects section
        if proj_section_found and re.search(r'\b(?:education|skills|experience|certifications|awards|references|work)\b', stripped, re.IGNORECASE):
            proj_section_found = False
            if current_project:
                projects.append(current_project)
                current_project = None
            continue

        if proj_section_found:
            # A new project usually starts with a title-like line (no bullet, short, possibly bold)
            if stripped.startswith(('•', '-', '●', '▪', '*')) or (len(stripped) > 5 and not stripped[0].isspace()):
                clean = stripped.lstrip('•-●▪* ').strip()
                if len(clean) > 3:
                    if current_project and (len(current_project.get("details", [])) > 0 or stripped.startswith(('•', '-', '●', '▪', '*'))):
                        # This is a detail bullet
                        current_project["details"].append(clean)
                    else:
                        if current_project:
                            projects.append(current_project)
                        current_project = {
                            "name": clean,
                            "details": []
                        }
            elif current_project:
                current_project["details"].append(stripped)

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
        ats_score, enhanced_strengths, resume_weaknesses = calculate_ats_score(
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
