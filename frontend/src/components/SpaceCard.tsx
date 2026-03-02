import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, Wifi, Coffee, Star } from 'lucide-react';
import './SpaceCard.css';

interface SpaceCardProps {
    id?: string | number;
    title: string;
    location: string;
    type: string;
    capacity: string;
    price: number;
    rating: number;
    imageUrl: string;
}

const SpaceCard: React.FC<SpaceCardProps> = ({ id, title, location, type, capacity, price, rating, imageUrl }) => {
    const navigate = useNavigate();
    return (
        <div className="space-card glass-panel">
            <div className="card-image-wrap">
                <img src={imageUrl} alt={title} className="card-image" />
                <span className="card-badge">{type}</span>
            </div>

            <div className="card-content">
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                    <div className="card-rating">
                        <Star size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                        <span>{rating}</span>
                    </div>
                </div>

                <div className="card-meta">
                    <MapPin size={16} /> <span>{location}</span>
                </div>

                <div className="card-amenities">
                    <div className="amenity"><Users size={14} /> {capacity}</div>
                    <div className="amenity"><Wifi size={14} /> Yes</div>
                    <div className="amenity"><Coffee size={14} /> Yes</div>
                </div>

                <div className="card-footer">
                    <div className="card-price">
                        <span className="price-val">JOD {price}</span> <span className="price-period">/ hour</span>
                    </div>
                    <button className="btn-outline" onClick={() => id ? navigate(`/space/${id}`) : null}>Book Now</button>
                </div>
            </div>
        </div>
    );
};

export default SpaceCard;
