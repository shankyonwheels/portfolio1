import "./styles/TechStack.css";

const skillsData = [
  {
    category: "Applicant Tracking Systems (ATS)",
    skills: ["Bull Horn", "Job Diva", "Ceipal", "Fieldglass", "Beeline", "Talentorb"],
  },
  {
    category: "Job Portals & Sourcing Tools",
    skills: ["Monster", "Text Kernel", "Dice", "CareerBuilder", "LinkedIn Recruiter", "Indeed", "Xray", "Pendologic", "Naukri", "walaaxy", "contact out"],
  },
  {
    category: "Technical Recruiting Domains",
    skills: [
      "Cybersecurity (SOC, NOC, VAPT)",
      "Cloud & Infrastructure",
      "Java / J2EE / .NET / Python",
      "Big Data / AI / ML",
      "Agile / DevOps / SecDevOps",
      "Database Architecture",
    ],
  },
  {
    category: "Management & Strategy",
    skills: [
      "Leadership",
      "Strategy",
      "Revenue",
      "Ownership",
      "Partnerships",
      "Negotiation",
      "Scale",
      "Execution",
      "Influence",
      "Growth",
    ],
  },
];

const TechStack = () => {
  return (
    <div className="skills-section section-container" id="skills">
      <h2 className="title" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginBottom: "2rem", textAlign: "center" }}>Skills & Tools</h2>
      <div className="skills-grid">
        {skillsData.map((group, index) => (
          <div key={index} className="skills-card">
            <h3 className="skills-category-title">{group.category}</h3>
            <div className="skills-tags">
              {group.skills.map((skill, idx) => (
                <span key={idx} className="skill-tag">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TechStack;
