/**
 * Career Engine — Roadmap Generator
 * Generates personalized 30-day career roadmaps based on skill gaps.
 */

const ROADMAP_TEMPLATES = {
  frontend: {
    week1: {
      focus: "HTML & CSS Foundations",
      goals: ["Master semantic HTML", "CSS layouts (Flexbox, Grid)", "Responsive design principles"],
      activities: [
        { type: "learn", title: "HTML & CSS Crash Course", description: "Complete a comprehensive HTML/CSS tutorial", duration: "4 hours" },
        { type: "practice", title: "Build a Landing Page", description: "Create a responsive landing page from a design", duration: "3 hours" },
        { type: "project", title: "Portfolio Page", description: "Build your personal portfolio page", duration: "4 hours" }
      ],
      milestone: "Can build a responsive static webpage"
    },
    week2: {
      focus: "JavaScript Fundamentals",
      goals: ["ES6+ syntax", "DOM manipulation", "Async programming", "Fetch API"],
      activities: [
        { type: "learn", title: "JavaScript Essentials", description: "Study modern JavaScript (ES6+)", duration: "5 hours" },
        { type: "practice", title: "Interactive Calculator", description: "Build a calculator with DOM manipulation", duration: "3 hours" },
        { type: "project", title: "Weather App", description: "Build a weather app using fetch API", duration: "4 hours" }
      ],
      milestone: "Can build interactive web applications with JavaScript"
    },
    week3: {
      focus: "React Fundamentals",
      goals: ["Components and JSX", "Props and State", "Hooks (useState, useEffect)", "Event handling"],
      activities: [
        { type: "learn", title: "React Tutorial", description: "Complete the official React tutorial", duration: "6 hours" },
        { type: "practice", title: "Todo App", description: "Build a todo app with React", duration: "4 hours" },
        { type: "project", title: "E-commerce Product Page", description: "Build a product page with cart functionality", duration: "5 hours" }
      ],
      milestone: "Can build a React application with state management"
    },
    week4: {
      focus: "Portfolio & Interview Prep",
      goals: ["Complete portfolio project", "Practice technical interviews", "Prepare resume"],
      activities: [
        { type: "project", title: "Complete Portfolio", description: "Polish and deploy your portfolio", duration: "4 hours" },
        { type: "practice", title: "Mock Interviews", description: "Practice common frontend interview questions", duration: "3 hours" },
        { type: "review", title: "Review & Refine", description: "Review all concepts and fill gaps", duration: "3 hours" }
      ],
      milestone: "Portfolio ready and interview-prepared"
    }
  },
  backend: {
    week1: {
      focus: "Node.js & Express Fundamentals",
      goals: ["Node.js basics", "Express.js routing", "Middleware concepts", "REST API design"],
      activities: [
        { type: "learn", title: "Node.js Crash Course", description: "Learn Node.js fundamentals", duration: "4 hours" },
        { type: "practice", title: "Simple API", description: "Build a basic REST API with Express", duration: "3 hours" },
        { type: "project", title: "Task Manager API", description: "Build a CRUD API for task management", duration: "4 hours" }
      ],
      milestone: "Can build a basic REST API"
    },
    week2: {
      focus: "Database Integration",
      goals: ["SQL fundamentals", "MongoDB basics", "ORM/ODM usage", "Data modeling"],
      activities: [
        { type: "learn", title: "Database Course", description: "Learn SQL and MongoDB basics", duration: "5 hours" },
        { type: "practice", title: "Database CRUD", description: "Integrate database with your API", duration: "3 hours" },
        { type: "project", title: "Blog API", description: "Build a blog API with user posts and comments", duration: "4 hours" }
      ],
      milestone: "Can design and implement database schemas"
    },
    week3: {
      focus: "Authentication & Security",
      goals: ["JWT authentication", "Password hashing", "Input validation", "Error handling"],
      activities: [
        { type: "learn", title: "Auth & Security", description: "Study authentication and security best practices", duration: "4 hours" },
        { type: "practice", title: "Auth System", description: "Add authentication to your API", duration: "4 hours" },
        { type: "project", title: "Secure API", description: "Build a fully authenticated API", duration: "5 hours" }
      ],
      milestone: "Can implement secure authentication"
    },
    week4: {
      focus: "Deployment & Portfolio",
      goals: ["Deploy API", "Write documentation", "Practice interviews", "Build portfolio"],
      activities: [
        { type: "project", title: "Deploy API", description: "Deploy your API to Render/Railway", duration: "3 hours" },
        { type: "practice", title: "API Documentation", description: "Write comprehensive API docs", duration: "2 hours" },
        { type: "review", title: "Interview Prep", description: "Practice backend interview questions", duration: "3 hours" }
      ],
      milestone: "Deployed API and ready for interviews"
    }
  },
  data: {
    week1: {
      focus: "Python & Pandas",
      goals: ["Python basics", "Pandas data manipulation", "NumPy arrays", "Data cleaning"],
      activities: [
        { type: "learn", title: "Python for Data Analysis", description: "Learn Python and Pandas fundamentals", duration: "5 hours" },
        { type: "practice", title: "Data Cleaning", description: "Practice cleaning real datasets", duration: "3 hours" },
        { type: "project", title: "Exploratory Analysis", description: "Perform EDA on a dataset", duration: "4 hours" }
      ],
      milestone: "Can clean and analyze data with Python"
    },
    week2: {
      focus: "SQL & Data querying",
      goals: ["SQL queries", "Joins and aggregations", "Window functions", "Query optimization"],
      activities: [
        { type: "learn", title: "SQL Fundamentals", description: "Learn SQL for data analysis", duration: "4 hours" },
        { type: "practice", title: "SQL Queries", description: "Practice complex SQL queries", duration: "3 hours" },
        { type: "project", title: "Data Pipeline", description: "Build a simple data pipeline", duration: "4 hours" }
      ],
      milestone: "Can write complex SQL queries"
    },
    week3: {
      focus: "Data Visualization",
      goals: ["Matplotlib/Seaborn", "Tableau basics", "Dashboard creation", "Storytelling with data"],
      activities: [
        { type: "learn", title: "Data Visualization", description: "Learn visualization tools and techniques", duration: "4 hours" },
        { type: "practice", title: "Create Dashboards", description: "Build interactive dashboards", duration: "4 hours" },
        { type: "project", title: "Analysis Report", description: "Create a complete data analysis report", duration: "5 hours" }
      ],
      milestone: "Can create compelling data visualizations"
    },
    week4: {
      focus: "Portfolio & Interview Prep",
      goals: ["Complete portfolio projects", "Practice case studies", "Prepare for interviews"],
      activities: [
        { type: "project", title: "Portfolio Projects", description: "Complete and polish portfolio projects", duration: "4 hours" },
        { type: "practice", title: "Case Studies", description: "Practice data analysis case studies", duration: "3 hours" },
        { type: "review", title: "Interview Prep", description: "Review concepts and practice questions", duration: "3 hours" }
      ],
      milestone: "Portfolio ready and interview-prepared"
    }
  }
};

export function generateRoadmap(targetRole, skillGaps) {
  const template = ROADMAP_TEMPLATES[targetRole] || ROADMAP_TEMPLATES.frontend;

  // Customize roadmap based on skill gaps
  const roadmap = Object.entries(template).map(([weekKey, weekData], index) => {
    const weekNumber = index + 1;

    // Prioritize activities based on gaps
    const prioritizedActivities = [...weekData.activities];

    // Add gap-specific activities if relevant gaps exist
    if (skillGaps && skillGaps.gaps) {
      for (const gap of skillGaps.gaps.slice(0, 2)) {
        if (weekData.goals.some(g => g.toLowerCase().includes(gap.skill.toLowerCase()))) {
          prioritizedActivities.push({
            type: "practice",
            title: `Practice ${gap.skill}`,
            description: gap.suggestedImprovement || `Work on ${gap.skill} exercises`,
            duration: "2 hours"
          });
        }
      }
    }

    return {
      week: weekNumber,
      focus: weekData.focus,
      goals: weekData.goals,
      activities: prioritizedActivities,
      milestone: weekData.milestone
    };
  });

  // Calculate total hours
  const totalHours = roadmap.reduce((total, week) => {
    return total + week.activities.reduce((weekTotal, activity) => {
      const hours = parseInt(activity.duration) || 0;
      return weekTotal + hours;
    }, 0);
  }, 0);

  return {
    roadmap,
    totalHours,
    targetRole: template.week1?.focus || "Career Development",
    keyResources: [
      { name: "freeCodeCamp", type: "course", url: "https://www.freecodecamp.org" },
      { name: "The Odin Project", type: "course", url: "https://www.theodinproject.com" },
      { name: "MDN Web Docs", type: "article", url: "https://developer.mozilla.org" },
      { name: "LeetCode", type: "practice", url: "https://leetcode.com" }
    ]
  };
}

export default { ROADMAP_TEMPLATES, generateRoadmap };
