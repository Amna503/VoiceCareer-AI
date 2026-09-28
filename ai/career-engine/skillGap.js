/**
 * Career Engine — Skill Gap Analysis
 * Compares current skills against target career requirements.
 */

export const CAREER_ROLE_REQUIREMENTS = {
  frontend: {
    title: "Frontend Developer",
    critical: [
      { skill: "HTML", description: "Semantic markup and accessibility" },
      { skill: "CSS", description: "Styling, layouts, responsive design" },
      { skill: "JavaScript", description: "ES6+, DOM manipulation, async programming" },
      { skill: "React", description: "Components, hooks, state management" }
    ],
    important: [
      { skill: "TypeScript", description: "Type safety and better DX" },
      { skill: "Git", description: "Version control and collaboration" },
      { skill: "API Integration", description: "REST/GraphQL data fetching" },
      { skill: "Testing", description: "Unit and integration testing" },
      { skill: "Responsive Design", description: "Mobile-first approach" }
    ],
    niceToHave: [
      { skill: "Next.js", description: "Server-side rendering and full-stack React" },
      { skill: "Tailwind CSS", description: "Utility-first CSS framework" },
      { skill: "Storybook", description: "Component development and documentation" },
      { skill: "Performance Optimization", description: "Core Web Vitals, lazy loading" }
    ]
  },
  backend: {
    title: "Backend Developer",
    critical: [
      { skill: "Node.js", description: "Server-side JavaScript runtime" },
      { skill: "Express.js", description: "Web framework and routing" },
      { skill: "REST APIs", description: "API design and implementation" },
      { skill: "Database", description: "SQL/NoSQL data modeling" }
    ],
    important: [
      { skill: "Authentication", description: "JWT, sessions, OAuth" },
      { skill: "Git", description: "Version control" },
      { skill: "Error Handling", description: "Graceful error management" },
      { skill: "Testing", description: "API and integration testing" },
      { skill: "Security", description: "Input validation, rate limiting" }
    ],
    niceToHave: [
      { skill: "Docker", description: "Containerization" },
      { skill: "CI/CD", description: "Deployment pipelines" },
      { skill: "WebSockets", description: "Real-time communication" },
      { skill: "GraphQL", description: "Alternative API paradigm" }
    ]
  },
  data: {
    title: "Data Analyst",
    critical: [
      { skill: "SQL", description: "Data querying and manipulation" },
      { skill: "Python", description: "Data analysis with pandas, numpy" },
      { skill: "Data Visualization", description: "Charts, dashboards, storytelling" },
      { skill: "Statistics", description: "Statistical analysis and hypothesis testing" }
    ],
    important: [
      { skill: "Excel", description: "Advanced formulas, pivot tables" },
      { skill: "Tableau/Power BI", description: "Business intelligence tools" },
      { skill: "Data Cleaning", description: "ETL and data preprocessing" },
      { skill: "Critical Thinking", description: "Analytical problem-solving" }
    ],
    niceToHave: [
      { skill: "Machine Learning", description: "Basic ML concepts" },
      { skill: "R", description: "Statistical programming" },
      { skill: "Cloud Platforms", description: "AWS/GCP/Azure basics" }
    ]
  },
  general: {
    title: "General Professional",
    critical: [
      { skill: "Communication", description: "Verbal and written communication" },
      { skill: "Problem Solving", description: "Analytical and creative thinking" },
      { skill: "Teamwork", description: "Collaboration and interpersonal skills" }
    ],
    important: [
      { skill: "Time Management", description: "Prioritization and organization" },
      { skill: "Leadership", description: "Initiative and decision-making" },
      { skill: "Adaptability", description: "Learning agility and flexibility" }
    ],
    niceToHave: [
      { skill: "Project Management", description: "Planning and execution" },
      { skill: "Presentation", description: "Public speaking and demo skills" }
    ]
  }
};

export function getRoleRequirements(role) {
  return CAREER_ROLE_REQUIREMENTS[role] || CAREER_ROLE_REQUIREMENTS.general;
}

export function analyzeSkillGaps(currentSkills, targetRole) {
  const requirements = getRoleRequirements(targetRole);
  const currentSkillsLower = (currentSkills || []).map(s => s.toLowerCase());

  const gaps = [];
  const matched = [];

  // Check critical skills
  for (const req of requirements.critical) {
    const isMatched = currentSkillsLower.some(s =>
      s.includes(req.skill.toLowerCase()) || req.skill.toLowerCase().includes(s)
    );
    if (isMatched) {
      matched.push(req.skill);
    } else {
      gaps.push({ ...req, importance: "critical" });
    }
  }

  // Check important skills
  for (const req of requirements.important) {
    const isMatched = currentSkillsLower.some(s =>
      s.includes(req.skill.toLowerCase()) || req.skill.toLowerCase().includes(s)
    );
    if (isMatched) {
      matched.push(req.skill);
    } else {
      gaps.push({ ...req, importance: "important" });
    }
  }

  // Check nice-to-have skills
  for (const req of requirements.niceToHave) {
    const isMatched = currentSkillsLower.some(s =>
      s.includes(req.skill.toLowerCase()) || req.skill.toLowerCase().includes(s)
    );
    if (isMatched) {
      matched.push(req.skill);
    } else {
      gaps.push({ ...req, importance: "nice-to-have" });
    }
  }

  return {
    targetRole: requirements.title,
    matchedSkills: matched,
    gaps,
    totalRequired: requirements.critical.length + requirements.important.length + requirements.niceToHave.length,
    matchedCount: matched.length,
    gapCount: gaps.length
  };
}

export default { CAREER_ROLE_REQUIREMENTS, getRoleRequirements, analyzeSkillGaps };
