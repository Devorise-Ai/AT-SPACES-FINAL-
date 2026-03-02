import React from 'react';
import { Check } from 'lucide-react';
import './PricingCard.css';

interface PricingCardProps {
    tier: string;
    name: string;
    price?: number;
    priceText?: string;
    subtitle: string;
    features: string[];
    isPopular?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({ tier, name, price, priceText, subtitle, features, isPopular }) => {
    return (
        <div className={`pricing-card glass-panel ${isPopular ? 'popular glow-border' : ''}`}>
            {isPopular && <div className="popular-badge">MOST POPULAR</div>}

            <div className="pricing-header">
                <h4 className="tier-name">{tier}</h4>
                <h2 className="plan-name">{name}</h2>

                {price !== undefined ? (
                    <div className="price-display">
                        <span className="currency">JOD</span>
                        <span className="amount">{price}</span>
                        <span className="period">/month</span>
                    </div>
                ) : (
                    <div className="price-display custom">
                        <span className="amount">{priceText}</span>
                    </div>
                )}

                <p className="plan-subtitle">{subtitle}</p>
            </div>

            <div className="pricing-features">
                {features.map((feature, idx) => (
                    <div key={idx} className="feature-item">
                        <Check size={18} className="check-icon" />
                        <span>{feature}</span>
                    </div>
                ))}
            </div>

            <div className="pricing-footer">
                <button className={isPopular ? 'btn-primary w-100' : 'btn-outline w-100'}>
                    {isPopular ? 'Get Started' : 'Contact Us'}
                </button>
            </div>
        </div>
    );
};

export default PricingCard;
