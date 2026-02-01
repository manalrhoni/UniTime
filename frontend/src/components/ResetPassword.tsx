import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './Login.css'; // On garde ça pour le style des inputs et boutons

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const emailFromUrl = searchParams.get('email');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Initialisation des particules (pour garder le style)
    useEffect(() => {
        if (window.particlesJS) {
            window.particlesJS("particles-js", {
                "particles": {
                    "number": { "value": 40, "density": { "enable": true, "value_area": 800 } },
                    "color": { "value": "#00D9FF" },
                    "opacity": { "value": 0.2 },
                    "size": { "value": 2 },
                    "line_linked": { "enable": true, "distance": 150, "color": "#6B5DD3", "opacity": 0.1, "width": 1 },
                    "move": { "enable": true, "speed": 1 }
                },
                "interactivity": { "events": { "onhover": { "enable": true, "mode": "grab" } } }
            });
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!emailFromUrl) {
            toast.error("Lien invalide. Veuillez refaire une demande.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas.");
            return;
        }

        if (password.length < 4) {
            toast.error("Le mot de passe est trop court.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/reset-password-confirm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailFromUrl,
                    new_password: password
                })
            });

            if (response.ok) {
                toast.success("Mot de passe modifié avec succès !");
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                toast.error("Erreur lors de la modification.");
            }
        } catch (error) {
            toast.error("Erreur de connexion au serveur.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // On utilise un style flex simple pour centrer parfaitement, sans utiliser les classes conflictuelles de Login.css
        <div className="login-page-container" style={{ 
            minHeight: '100vh', 
            backgroundColor: '#1f1b2e', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Fond à particules */}
            <div id="particles-js" style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', zIndex:0}}></div>

            {/* Lien retour */}
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login'); }} className="back-home" style={{ top: '20px', left: '20px' }}>
                <i className="material-icons">arrow_back</i>Retour
            </a>

            {/* Carte du formulaire centrée */}
            <div style={{ 
                zIndex: 10, 
                width: '100%', 
                maxWidth: '450px', 
                padding: '20px' 
            }}>
                <form 
                    onSubmit={handleSubmit} 
                    style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '3rem 2rem', 
                        borderRadius: '20px', 
                        backdropFilter: 'blur(10px)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%'
                    }}
                >
                    <h2 className="title" style={{ color: 'white', marginBottom: '10px' }}>Réinitialisation</h2>
                    
                    <p style={{ color: '#b8a5d1', marginBottom: '30px', textAlign: 'center', fontSize: '0.9rem' }}>
                        Nouveau mot de passe pour : <br/>
                        <strong style={{ color: '#00D9FF' }}>{emailFromUrl || "Email inconnu"}</strong>
                    </p>

                    <div className="input-field" style={{ width: '100%', marginBottom: '15px' }}>
                        <i className="material-icons">lock</i>
                        <input 
                            type="password" 
                            placeholder="Nouveau mot de passe" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-field" style={{ width: '100%', marginBottom: '25px' }}>
                        <i className="material-icons">lock_outline</i>
                        <input 
                            type="password" 
                            placeholder="Confirmer le mot de passe" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn solid" disabled={isLoading} style={{ width: '100%', margin: '0' }}>
                        {isLoading ? "Modification..." : "Changer le mot de passe"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;