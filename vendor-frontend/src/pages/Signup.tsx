import React, { useState } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    LayoutGrid
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const Signup: React.FC = () => {
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const steps = [
        { num: 1, label: 'Personal Info' },
        { num: 2, label: 'Branch Info' },
        { num: 3, label: 'Space Details' },
        { num: 4, label: 'Uploads' },
    ];

    return (
        <div className="signup-page">
            <header className="auth-header">
                <Link to="/" className="brand-header">
                    <div className="brand-logo-small">
                        <LayoutGrid size={24} color="#FF5B04" />
                    </div>
                    <h1>AtSpaces <span>VENDOR</span></h1>
                </Link>
            </header>

            <main className="signup-content">
                <div className="signup-hero">
                    <div className="partner-badge">Partner with us</div>
                    <h2>Grow your workspace revenue</h2>
                    <p>Join the AtSpaces network and reach thousands of professionals looking for flexible desks and private offices.</p>
                </div>

                <div className="stepper-wrapper glass">
                    <div className="stepper">
                        {steps.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className={`step ${step >= s.num ? 'active' : ''}`}>
                                    <div className="step-num">{s.num}</div>
                                    <div className="step-label">{s.label}</div>
                                </div>
                                {i < steps.length - 1 && <div className={`step-line ${step > s.num ? 'active' : ''}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="step-form-content">
                        {step === 1 && (
                            <div className="form-step">
                                <h3>Personal Info</h3>
                                <p>Please provide accurate details to speed up your approval process.</p>

                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" placeholder="John Doe" />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" placeholder="john@example.com" />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" placeholder="+962 7X XXX XXXX" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="form-step">
                                <h3>Branch Info</h3>
                                <p>Tell us about your main workspace location.</p>
                                <div className="form-group">
                                    <label>Branch Name</label>
                                    <input type="text" placeholder="The Corner Hub - Downtown" />
                                </div>
                                <div className="form-group">
                                    <label>City</label>
                                    <select>
                                        <option>Amman</option>
                                        <option>Riyadh</option>
                                        <option>Jeddah</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="step-actions">
                            {step > 1 && (
                                <button onClick={handleBack} className="btn-back">
                                    <ChevronLeft size={18} /> Back
                                </button>
                            )}
                            <div style={{ flex: 1 }}></div>
                            {step < 4 ? (
                                <button onClick={handleNext} className="btn-continue">
                                    Continue <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button onClick={() => navigate('/login')} className="btn-continue">
                                    Submit Application
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Signup;
