import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Book, MessageCircle, Mail } from 'lucide-react';
import './InfoPages.css';

const SupportPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="info-page-container">
            {/* En-tête */}
            <div className="page-header">
                <h1>Centre de Support</h1>
                <span onClick={() => navigate('/')} className="back-btn">
                    <i className="fa-solid fa-arrow-left" style={{marginRight:'10px'}}></i> 
                    Retour à l'accueil
                </span>
            </div>

            {/* GRILLE 3 COLONNES */}
            <div className="support-grid">
                
                {/* COLONNE 1 : FAQ */}
                <div className="support-column">
                    <h2><HelpCircle className="w-6 h-6" /> Foire Aux Questions</h2>
                    
                    <div className="support-item">
                        <h3>Mot de passe oublié ?</h3>
                        <p>Cliquez sur "Mot de passe oublié" sur la page de connexion. Un lien de réinitialisation vous sera envoyé par email.</p>
                    </div>

                    <div className="support-item">
                        <h3>Emploi du temps vide ?</h3>
                        <p>Si aucun cours n'apparait, c'est que l'administration n'a pas encore validé le planning de votre groupe pour cette semaine.</p>
                    </div>

                    <div className="support-item">
                        <h3>Erreur de connexion ?</h3>
                        <p>Vérifiez que votre compte a bien été activé par l'administrateur après votre inscription.</p>
                    </div>
                </div>

                {/* COLONNE 2 : DOCUMENTATION */}
                <div className="support-column">
                    <h2><Book className="w-6 h-6" /> Documentation</h2>
                    
                    <div className="support-item">
                        <h3>Pour les Étudiants</h3>
                        <ul>
                            <li>Consultez votre emploi du temps en temps réel.</li>
                            <li>Recevez des notifications pour chaque changement de salle.</li>
                            <li>Utilisez l'outil "Salles Libres" pour vos révisions.</li>
                        </ul>
                    </div>

                    <div className="support-item">
                        <h3>Pour les Enseignants</h3>
                        <ul>
                            <li>Signalez vos indisponibilités à l'avance.</li>
                            <li>Effectuez des demandes de rattrapage directement via l'onglet "Réservations".</li>
                            <li>Visualisez l'occupation des salles.</li>
                        </ul>
                    </div>
                </div>

                {/* COLONNE 3 : AIDE / CONTACT */}
                <div className="support-column">
                    <h2><MessageCircle className="w-6 h-6" /> Besoin d'aide ?</h2>
                    
                    <div className="support-item">
                        <p>Notre équipe technique est à votre disposition pour résoudre tout problème lié à la plateforme UniTime.</p>
                    </div>

                    <div className="support-item">
                        <h3>Horaires du support</h3>
                        <p>Lundi - Vendredi : 09h00 - 17h00<br/>Samedi : 09h00 - 12h00</p>
                    </div>

                    <div className="support-item">
                        <h3>Canaux</h3>
                        <p>Email : support@unitime.ma<br/>Bureau : Bloc A, 2ème étage</p>
                    </div>

                    <div className="contact-area">
                        <button 
                            className="btn-contact-big" 
                            onClick={() => window.location.href = "mailto:support@unitime.ma"}
                        >
                            <Mail className="w-5 h-5" /> Contacter l'Équipe
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupportPage;