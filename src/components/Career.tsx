import "./styles/Career.css";

const careerData = [
  {
    company: "Softenger",
    role: "Account Manager / Lead IT Recruiter",
    date: "Mar 2025 - Present",
    desc: "Owning global accounts and talent strategy across US, Europe, Middle East, and APAC; deliver ₹6 Cr+ outcomes in Cybersecurity & Infrastructure hiring.",
  },
  {
    company: "GP Aarogya Healthcare Technologies",
    role: "Operation Manager / Lead IT Recruiter",
    date: "Oct 2024 - Jan 2025",
    desc: "Scaled recruitment operations for 50+ team; built structured hiring frameworks, workforce planning, and performance-driven delivery systems.",
  },
  {
    company: "Qualified Recruiter / Prestige Staffing",
    role: "Lead US IT Recruiter",
    date: "May 2023 - Sep 2024",
    desc: "Partnered with Account Managers to define specific IT roles. Managed a robust pipeline of 500+ candidates and consistently exceeded quota as a top performer for 3+ years.",
  },
  {
    company: "IMS / Experis",
    role: "Lead US IT Recruiter",
    date: "May 2022 - May 2023",
    desc: "Led end-to-end recruitment for high-level technical and management positions. Negotiated salaries, coordinated on-boarding, and managed Fieldglass / Bullhorn ATS pipelines.",
  },
  {
    company: "Mindlance",
    role: "Sr. US IT Recruiter",
    date: "Jan 2022 - May 2022",
    desc: "Supported direct clients like Citigroup and Morgan Stanley. Recruited top-tier IT talent across .NET, Java, Big Data, and Cloud domains.",
  },
  {
    company: "Head Field Solution Pvt Ltd.",
    role: "US IT Recruiter",
    date: "Jul 2020 - Jan 2022",
    desc: "Full life cycle recruiting for Corp-2-Corp, W2, and Contract-To-Hire roles. Engaged candidates across H1B, TN, and Citizen status for clients like Meta, EY, Google, and Hexaware.",
  },
];

const Career = () => {
  return (
    <div className="career-section section-container" id="career">
      <div className="career-container">
        <h2>
          Professional
          <br /> <span>Experience</span>
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          {careerData.map((job, index) => (
            <div className="career-info-box" key={index}>
              <div className="career-info-in">
                <div className="career-role">
                  <h4>{job.role}</h4>
                  <h5>{job.company}</h5>
                </div>
                <h3>{job.date}</h3>
              </div>
              <p>{job.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Career;
