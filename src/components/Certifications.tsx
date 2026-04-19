import "./styles/Certifications.css";

const certsData = [
  { name: "Cyber Security Associate Certification Programme", issuer: "Reliance Foundation", date: "Mar 2026" },
  { name: "Cybersecurity Certificate of Participation", issuer: "Ministry of Skill Development", date: "Mar 2026" },
  { name: "Talent Acquisition Certification", issuer: "LearnTube.ai", date: "Sep 2025" },
  { name: "Lean Six Sigma Green Belt Certification", issuer: "Alison", date: "Jun 2025" },
  { name: "Lean Six Sigma Yellow Belt", issuer: "CSSC", date: "Jun 2025" },
  { name: "ChatGPT for Cybersecurity", issuer: "Simplilearn", date: "May 2025" },
  { name: "Master in POSH Act 2013", issuer: "Keka Academy", date: "May 2025" },
  { name: "PMP Certification Training Course", issuer: "Simplilearn", date: "Mar 2025" },
];

const Certifications = () => {
  return (
    <div className="certs-section section-container" id="certifications">
      <h2 className="title" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", marginBottom: "2rem", textAlign: "center" }}>
        Certifications
      </h2>
      <div className="certs-grid">
        {certsData.map((cert, index) => (
          <div key={index} className="cert-card">
            <h3>{cert.name}</h3>
            <div className="cert-details">
              <span className="cert-issuer">{cert.issuer}</span>
              <span className="cert-date">{cert.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Certifications;
