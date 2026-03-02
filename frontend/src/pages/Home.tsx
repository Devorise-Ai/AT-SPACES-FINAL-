import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Hero from '../components/Hero';
import SpaceCard from '../components/SpaceCard';
import PricingCard from '../components/PricingCard';
import './Home.css';
import { ArrowRight } from 'lucide-react';

// Mock data for initial render or fallback
const mockSpaces = [
    {
        id: '1',
        title: 'Tech Hub Amman',
        location: 'King Hussein Business Park',
        type: 'Private Office',
        capacity: '1-4',
        price: 15,
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: '2',
        title: 'Creative Studio Abdali',
        location: 'Abdali Boulevard',
        type: 'Hot Desk',
        capacity: '1',
        price: 12,
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: '3',
        title: 'Executive Boardroom',
        location: '5th Circle',
        type: 'Meeting Room',
        capacity: 'up to 12',
        price: 35,
        rating: 5.0,
        imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800'
    }
];

const pricingPlans = [
    {
        tier: 'Starter',
        name: 'Free',
        priceText: 'Free',
        subtitle: 'Perfect for trying out AtSpaces',
        features: ['Browse available spaces', 'Book up to 5 hours/month', 'Basic support'],
        isPopular: false
    },
    {
        tier: 'Professional',
        name: 'JOD 49/month',
        price: 49,
        subtitle: 'For professionals who need flexible workspaces',
        features: ['Unlimited bookings', 'Priority access to premium rooms', 'AI Assistant for smart booking', 'Calendar integrations'],
        isPopular: true
    },
    {
        tier: 'Enterprise',
        name: 'Custom',
        priceText: 'Custom',
        subtitle: 'For teams and organizations',
        features: ['Everything in Professional', 'Team management dashboard', 'Dedicated account manager', 'Custom integrations', '24/7 support'],
        isPopular: false
    }
];

const Home: React.FC = () => {
    const [spaces, setSpaces] = useState(mockSpaces);
    const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');

    // Attempt to load from actual backend API (optional based on connectivity)
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const healthRes = await axios.get('/api/health');
                if (healthRes.status === 200) {
                    setApiStatus('connected');
                } else {
                    setApiStatus('error');
                }
            } catch (err) {
                setApiStatus('error');
            }
        };

        checkConnection();

        const fetchSpaces = async () => {
            try {
                const response = await axios.get('/api/branches');
                // Basic mapping logic if backend responds
                if (response.data && response.data.length > 0) {
                    // We map the backend data nicely to our SpaceCard props. 
                    // If the backend doesn't have images we fallback to Unsplash random.
                    const mappedSpaces = response.data.slice(0, 3).map((branch: any, idx: number) => ({
                        id: branch.id,
                        title: branch.name,
                        location: branch.location || branch.city,
                        type: branch.services?.[0]?.type || 'Workspace',
                        capacity: branch.services?.[0]?.capacity || '1',
                        price: branch.services?.[0]?.pricePerHour || 15,
                        rating: branch.averageRating || 4.5,
                        imageUrl: mockSpaces[idx]?.imageUrl || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'
                    }));
                    setSpaces(mappedSpaces);
                }
            } catch (error) {
                console.warn("Could not fetch branches from API, using mock data.", error);
            }
        };

        fetchSpaces();
    }, []);

    return (
        <div className="home-page">
            {/* Dynamic API Status Badge */}
            <div style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
                padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
                backgroundColor: apiStatus === 'connected' ? 'rgba(46, 204, 113, 0.2)' :
                    apiStatus === 'error' ? 'rgba(231, 76, 60, 0.2)' : 'rgba(241, 196, 15, 0.2)',
                color: apiStatus === 'connected' ? '#2ecc71' :
                    apiStatus === 'error' ? '#e74c3c' : '#f1c40f',
                border: `1px solid ${apiStatus === 'connected' ? '#2ecc71' :
                    apiStatus === 'error' ? '#e74c3c' : '#f1c40f'}`,
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: apiStatus === 'connected' ? '#2ecc71' :
                        apiStatus === 'error' ? '#e74c3c' : '#f1c40f',
                    boxShadow: `0 0 8px ${apiStatus === 'connected' ? '#2ecc71' :
                        apiStatus === 'error' ? '#e74c3c' : '#f1c40f'}`
                }} />
                API: {apiStatus.toUpperCase()}
            </div>

            <Hero />

            <section className="section spaces-section container">
                <div className="section-header">
                    <div>
                        <h2 className="section-title">Premium <span className="text-primary">Workspaces</span></h2>
                        <p className="section-subtitle">Discover our top-rated spaces designed for productivity, collaboration, and focus.</p>
                    </div>
                    <button className="btn-text">
                        View All Spaces <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </div>

                <div className="spaces-grid">
                    {spaces.map(space => (
                        <SpaceCard key={space.id} {...space} />
                    ))}
                </div>
            </section>

            <section className="section pricing-section container">
                <div className="section-header center">
                    <h2 className="section-title">Simple, Transparent <span className="text-primary">Pricing</span></h2>
                    <p className="section-subtitle">Choose the plan that fits your workspace needs. No hidden fees, cancel anytime.</p>
                </div>

                <div className="pricing-grid">
                    {pricingPlans.map((plan, idx) => (
                        <PricingCard key={idx} {...plan} />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
