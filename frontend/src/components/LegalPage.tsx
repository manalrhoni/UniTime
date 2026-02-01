import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, FileText, Shield, ArrowLeft } from 'lucide-react'; // Ajout des icônes pour le style
import './InfoPages.css';

const LegalPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="info-page-container">
            {/* En-tête */}
            <div className="page-header">
                <h1>Informations Légales</h1>
                <span onClick={() => navigate('/')} className="back-btn">
                    <ArrowLeft size={20} style={{marginRight:'10px'}} /> 
                    Retour à l'accueil
                </span>
            </div>

            {/* GRILLE 3 COLONNES (Réutilisation du style de la page Support) */}
            <div className="support-grid">
                
                {/* COLONNE 1 : MENTIONS LÉGALES */}
                <div className="support-column">
                    <h2><Scale className="w-6 h-6" /> Mentions Légales</h2>
                    
                    <div className="support-item">
                        <h3>Éditeur</h3>
                        <p>L'application UniTime est développée dans le cadre du projet académique "Analyse de Données et Big Data".</p>
                    </div>

                    <div className="support-item">
                        <h3>Établissement</h3>
                        <p>Faculté des Sciences et Techniques de Tanger (FSTT), Ancienne Route de l'Aéroport, Km 10, Ziaten, BP : 416, Tanger - Maroc.</p>
                    </div>

                    <div className="support-item">
                        <h3>Contact</h3>
                        <p>Pour toute question : <a href="mailto:support@unitime.ma" style={{color:'#6B5DD3', textDecoration:'underline'}}>support@unitime.ma</a>.</p>
                    </div>
                </div>

                {/* COLONNE 2 : CONDITIONS D'UTILISATION */}
                <div className="support-column">
                    <h2><FileText className="w-6 h-6" /> Conditions (CGU)</h2>
                    
                    <div className="support-item">
                        <h3>Objet</h3>
                        <p>Les présentes CGU régissent l'utilisation de la plateforme UniTime, dédiée à la gestion des emplois du temps universitaires.</p>
                    </div>
                    
                    <div className="support-item">
                        <h3>Accès au service</h3>
                        <p>L'accès est réservé aux étudiants, enseignants et administrateurs de la FSTT munis d'identifiants valides. Les coûts d'accès à internet sont à la charge de l'utilisateur.</p>
                    </div>

                    <div className="support-item">
                        <h3>Propriété Intellectuelle</h3>
                        <p>L'ensemble de la structure (code source, design, logos) est protégé par la législation sur la propriété intellectuelle.</p>
                    </div>
                </div>

                {/* COLONNE 3 : CONFIDENTIALITÉ */}
                <div className="support-column">
                    <h2><Shield className="w-6 h-6" /> Confidentialité</h2>
                    
                    <div className="support-item">
                        <h3>Collecte des données</h3>
                        <p>Nous collectons uniquement : Nom, Prénom, Email universitaire, Filière, Groupe et Emploi du temps.</p>
                    </div>
                    
                    <div className="support-item">
                        <h3>Utilisation</h3>
                        <p>Ces données servent exclusivement à la génération automatique des emplois du temps, l'envoi de notifications et l'analyse statistique.</p>
                    </div>
                    
                    <div className="support-item">
                        <h3>Sécurité</h3>
                        <p>Aucune donnée n'est transmise à des tiers. Les mots de passe sont cryptés (hachés) dans notre base de données.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LegalPage;