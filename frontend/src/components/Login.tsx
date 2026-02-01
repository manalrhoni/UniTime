import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; 

// Permet d'utiliser particlesJS sans erreur TypeScript
declare global {
  interface Window {
    particlesJS: any;
  }
}

const Login: React.FC = () => {
  const navigate = useNavigate();

  // Gestion du mode Inscription (sign-up-mode)
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Gestion du rôle (student, teacher, admin)
  const [role, setRole] = useState('student');

  // États pour les formulaires
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // États pour l'inscription
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  // État pour mémoriser la filière choisie
  const [registerGroupId, setRegisterGroupId] = useState('');

  // État pour stocker la liste des groupes venant de la BDD
  const [dbGroups, setDbGroups] = useState<any[]>([]);

  // États pour le "Mot de passe oublié"
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoadingReset, setIsLoadingReset] = useState(false); 

  useEffect(() => {
    // Initialisation des particules
    if (window.particlesJS) {
      window.particlesJS("particles-js", {
        "particles": {
          "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
          "color": { "value": "#00D9FF" },
          "opacity": { "value": 0.3 },
          "size": { "value": 2 },
          "line_linked": { 
            "enable": true, 
            "distance": 150, 
            "color": "#6B5DD3", 
            "opacity": 0.2, 
            "width": 1 
          },
          "move": { "enable": true, "speed": 1.5 }
        },
        "interactivity": {
          "events": { "onhover": { "enable": true, "mode": "grab" } }
        },
        "retina_detect": true
      });
    }

    // Chargement dynamique des groupes depuis le backend
    const fetchGroups = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8000/groups/');
            if (res.ok) {
                const data = await res.json();
                setDbGroups(data);
            }
        } catch (error) {
            console.error("Erreur chargement groupes", error);
        }
    };
    fetchGroups();

  }, []);

  // --- LOGIQUE DE CONNEXION (LOGIN) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://127.0.0.1:8000/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), 
      });

      const data = await response.json();

      if (response.ok) {
        // VÉRIFICATION DE SÉCURITÉ : Le compte est-il validé ?
        if (data.user.status === 'pending' || data.user.is_active === false) {
            alert("⚠️ Votre compte est en attente de validation par l'administration.\nVous recevrez un email une fois votre compte activé.");
            return; 
        }

        // Si c'est bon, on sauvegarde
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirection
        if (data.user.role === 'admin') navigate('/admin');
        else if (data.user.role === 'enseignant') navigate('/teacher');
        else navigate('/student');
      } else {
        alert("Erreur: " + (data.detail || "Identifiants incorrects"));
      }
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion au serveur.");
    }
  };

  // --- LOGIQUE D'INSCRIPTION (REGISTER) ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if(!registerName || !registerEmail || !registerPassword) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // Validation de la filière pour l'étudiant
    if (role === 'student' && !registerGroupId) {
        alert("Veuillez sélectionner votre filière.");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: registerName,
                email: registerEmail,
                password: registerPassword,
                role: role,
                group_id: role === 'student' ? registerGroupId : null
            })
        });

        if (response.ok) {
            alert(`Inscription réussie pour ${registerName} !\n\nVotre compte est maintenant en attente de validation par l'administrateur.`);
            setIsSignUpMode(false);
            setRegisterName('');
            setRegisterEmail('');
            setRegisterPassword('');
            setRegisterGroupId(''); // Reset de la filière
        } else {
            const err = await response.json();
            alert("Erreur lors de l'inscription : " + (err.detail || "Vérifiez vos données"));
        }

    } catch (error) {
        alert("Impossible de contacter le serveur pour l'inscription.");
    }
  };

  // --- LOGIQUE MOT DE PASSE OUBLIÉ ---
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!resetEmail) return;

      setIsLoadingReset(true); 

      try {
          const response = await fetch('http://127.0.0.1:8000/forgot-password/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: resetEmail })
          });

          if (response.ok) {
              alert(`✅ Un lien de réinitialisation a été envoyé à ${resetEmail}.\n\nVeuillez vérifier votre boîte mail (et les spams).`);
              setShowForgotModal(false);
              setResetEmail('');
          } else {
              const err = await response.json();
              alert("Erreur : " + (err.detail || "Email introuvable ou erreur serveur."));
          }
      } catch (error) {
          alert("Erreur de connexion au serveur.");
      } finally {
          setIsLoadingReset(false); 
      }
  };

  const getPlaceholder = () => {
      if (role === 'teacher') return "Email Enseignant";
      if (role === 'admin') return "Email Administrateur";
      return "Email Étudiant";
  };

  return (
    <div className="login-page-container">
        <div id="particles-js" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:1, pointerEvents:'none'}}></div>
        
        {showForgotModal && (
            <div className="modal-overlay">
                <div className="modal-box">
                    <h3>Mot de passe oublié ?</h3>
                    <p>Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.</p>
                    <form onSubmit={handleForgotPasswordSubmit} style={{padding: 0}}>
                        <div className="input-field" style={{width: '100%'}}>
                            <i className="material-icons">email</i>
                            <input 
                                type="email" 
                                placeholder="Votre email institutionnel" 
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-close" onClick={() => setShowForgotModal(false)}>Annuler</button>
                            <button type="submit" className="btn" disabled={isLoadingReset}>
                                {isLoadingReset ? "Envoi..." : "Envoyer le lien"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="back-home">
            <i className="material-icons">arrow_back</i>Retour à l'accueil
        </a>

        <div className={`login-content ${isSignUpMode ? 'sign-up-mode' : ''}`}>
            <div className="forms-container">
                <div className="signin-signup">
                    
                    {/* --- FORMULAIRE CONNEXION --- */}
                    <form onSubmit={handleLogin} className="sign-in-form">
                        <h2 className="title" style={{color: 'white'}}>Connexion</h2>
                        
                        <div className="role-selector" data-active={role}>
                            <div className={`role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>Étudiant</div>
                            <div className={`role-btn ${role === 'teacher' ? 'active' : ''}`} onClick={() => setRole('teacher')}>Enseignant</div>
                            <div className={`role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</div>
                        </div>

                        <div className="input-field">
                            <i className="material-icons">badge</i>
                            <input 
                              type="text" 
                              placeholder={getPlaceholder()} 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                            />
                        </div>
                        <div className="input-field">
                            <i className="material-icons">lock</i>
                            <input 
                              type="password" 
                              placeholder="Mot de passe" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                        </div>

                        <div className="form-options">
                            <label className="remember-me" style={{color: '#f0e6ff'}}>
                                <input type="checkbox" /> Mémoriser
                            </label>
                            <a href="#" onClick={(e) => { e.preventDefault(); setShowForgotModal(true); }} className="forgot-pass" style={{color: '#00D9FF'}}>
                                Mot de passe oublié ?
                            </a>
                        </div>

                        <input type="submit" value="Se connecter" className="btn solid" />
                    </form>

                    <form onSubmit={handleRegister} className="sign-up-form">
                        <h2 className="title" style={{color: 'white'}}>Inscription</h2>
                        
                        <div className="role-selector" data-active={role}>
                            <div className={`role-btn ${role === 'student' ? 'active' : ''}`} onClick={() => setRole('student')}>Étudiant</div>
                            <div className={`role-btn ${role === 'teacher' ? 'active' : ''}`} onClick={() => setRole('teacher')}>Enseignant</div>
                            <div className={`role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</div>
                        </div>
                        
                        <div className="input-field">
                            <i className="material-icons">person</i>
                            <input 
                                type="text" 
                                placeholder="Nom d'utilisateur" 
                                value={registerName}
                                onChange={(e) => setRegisterName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-field">
                            <i className="material-icons">email</i>
                            <input 
                                type="email" 
                                placeholder="Email" 
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                required
                            />
                        </div>
                        
                        {/* SÉLECTEUR DE GROUPE DYNAMIQUE */}
                        {role === 'student' && (
                            <div className="input-field">
                                <i className="material-icons">school</i>
                                <select 
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        color: '#ece8f2',
                                        width: '95%',
                                        paddingRight: '10px'
                                    }}
                                    value={registerGroupId} 
                                    onChange={(e) => setRegisterGroupId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled style={{background: '#1f1b2e'}}>Choisir votre filière/groupe</option>
                                    
                                    {dbGroups.length > 0 ? (
                                        dbGroups.map((group) => (
                                            <option key={group.id} value={group.name} style={{background: '#1f1b2e'}}>
                                                {group.name} ({group.student_count || 30} places)
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled style={{background: '#1f1b2e'}}>Chargement des groupes...</option>
                                    )}
                                </select>
                            </div>
                        )}

                        <div className="input-field">
                            <i className="material-icons">lock</i>
                            <input 
                                type="password" 
                                placeholder="Mot de passe" 
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <input type="submit" className="btn" value="S'inscrire" />
                    </form>
                </div>
            </div>

            <div className="panels-container">
                <div className="panel left-panel">
                    <div className="content">
                        <h3>Nouveau ici ?</h3>
                        <p>Rejoignez UniTime pour gérer vos emplois du temps intelligemment.</p>
                        <button className="btn transparent" onClick={() => setIsSignUpMode(true)}>S'inscrire</button>
                    </div>
                    <img src="/img/log.png" className="image" alt="Login Illustration" />
                </div>
                <div className="panel right-panel">
                    <div className="content">
                        <h3>Déjà membre ?</h3>
                        <p>Connectez-vous pour accéder à vos ressources.</p>
                        <button className="btn transparent" onClick={() => setIsSignUpMode(false)}>Se connecter</button>
                    </div>
                    <img src="/img/register.png" className="image" alt="Register Illustration" />
                </div>
            </div>
        </div>
    </div>
  );
};

export default Login;