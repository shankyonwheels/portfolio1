import "./styles/Certifications.css";

const certsData = [
  { name: "Be10x AI Certification", issuer: "Be10x", date: "Apr 2026", pdf: "Be10x AI Certificate.pdf" },
  { name: "Cyber Security Associate Certification Programme", issuer: "Reliance Foundation", date: "Mar 2026", pdf: "Cyber security associate certification programme.pdf" },
  { name: "Cybersecurity Certificate of Participation", issuer: "Ministry of Skill Development", date: "Mar 2026", pdf: "Cybersecurity certificate of participation.pdf" },
  { name: "Talent Acquisition Certification", issuer: "LearnTube.ai", date: "Sep 2025", pdf: "Talent Acquistion certification.pdf" },
  { name: "Lean Six Sigma Green Belt Certification", issuer: "Alison", date: "Jun 2025", pdf: "Alison_ six sigma green belt Certificate-5028-49057359.pdf" },
  { name: "Lean Six Sigma Yellow Belt", issuer: "CSSC", date: "Jun 2025", pdf: "Lean Six Sigma Yellow Belt.pdf" },
  { name: "ChatGPT for Cybersecurity", issuer: "Simplilearn", date: "May 2025", pdf: "ChatGPT for Cybersecurity.pdf" },
  { name: "Master in POSH Act 2013", issuer: "Keka Academy", date: "May 2025", pdf: "Master in POSH Act 2013.pdf" },
  { name: "PMP Certification Training Course", issuer: "Simplilearn", date: "Mar 2025", pdf: "PMP Certification Training Course.pdf" },
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
            <div className="cert-action">
              {cert.pdf ? (
                <a href={`/certificates/${cert.pdf}`} target="_blank" rel="noopener noreferrer" className="cert-btn view-cert-btn">
                  View Certificate
                </a>
              ) : (
                <span className="cert-btn pending-cert-btn">Certificate file pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Certifications;
