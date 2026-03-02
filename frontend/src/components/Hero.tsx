import React from 'react';
import { Search, Calendar } from 'lucide-react';
import './Hero.css';

const Hero: React.FC = () => {
    return (
        <section className="hero">
            <div className="hero-content">
                <span className="hero-badge">
                    <span className="badge-dot"></span> New Spaces Added Daily in Amman
                </span>

                <h1 className="hero-headline">
                    Find Your Perfect<br />
                    <span className="text-primary glow">Workspace</span> Instantly
                </h1>

                <p className="hero-subheadline">
                    Book premium meeting rooms, private offices, and coworking desks<br />
                    designed for productivity and collaboration.
                </p>

                <div className="search-pill glass-panel">
                    <div className="search-input-group">
                        <Search size={20} className="search-icon" />
                        <input type="text" placeholder="Where do you want to work?" className="search-input" />
                    </div>
                    <div className="search-divider"></div>
                    <div className="search-input-group">
                        <Calendar size={20} className="search-icon" />
                        <input type="text" placeholder="Date & Time" className="search-input" />
                    </div>
                    <button className="btn-primary search-btn">
                        <Search size={18} style={{ marginRight: '8px' }} /> Search
                    </button>
                </div>
            </div>

            <div className="trusted-by">
                <p>TRUSTED BY FORWARD-THINKING TEAMS</p>
                <div className="trusted-logos">
                    <span className="mock-logo">stripe</span>
                    <span className="mock-logo">Google</span>
                    <span className="mock-logo">Microsoft</span>
                    <span className="mock-logo">Spotify</span>
                </div>
            </div>
        </section>
    );
};

export default Hero;
