import { PropsWithChildren } from "react";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              SHASHANK
              <br />
              <span>DWIVEDI</span>
            </h1>
          </div>
          <div className="landing-info" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <h3 style={{ fontSize: "clamp(1.2rem, 3.5vw, 2rem)", fontWeight: 400, margin: 0, textTransform: "uppercase", letterSpacing: "2px" }}>
              Account Manager <br /> Lead IT Recruiter
            </h3>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1.2, margin: 0, textTransform: "none" }}>
              Global IT Recruitment
            </h2>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1.2, margin: 0, color: "var(--accentColor)", textTransform: "none" }}>
              Cybersecurity & Infra
            </h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
