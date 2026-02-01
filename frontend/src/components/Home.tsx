import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; // Pour les notifications "Bientôt disponible"
import './Home.css'; 

// Définition pour que Typescript accepte particlesJS
declare global {
  interface Window {
    particlesJS: any;
  }
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  // Référence pour s'assurer que les compteurs ne se lancent qu'une fois
  const hasAnimatedCounters = useRef(false);

  // 1. Pour le défilement fluide vers les sections (au lieu de sauter)
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 2. Pour ouvrir l'application Email
  const handleContact = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.location.href = "mailto:support@unitime.ma?subject=Demande%20d'information%20UniTime";
  };

  // 3. Pour les liens en construction (Documentation, Légal...)
  const handleComingSoon = (e: React.MouseEvent, sectionName: string) => {
    e.preventDefault();
    toast.info(`La section "${sectionName}" est en cours de mise à jour.`, {
      description: "Disponible dans la prochaine version v1.0",
      duration: 3000, // Reste 3 secondes
    });
  };
  // -------------------------------------------

  useEffect(() => {
    // 1. Initialisation des Particules
    const particlesConfig = {
      "particles": {
        "number": { "value": 60, "density": { "enable": true, "value_area": 800 } },
        "color": { "value": "#00D9FF" },
        "shape": { "type": "circle" },
        "opacity": { "value": 0.3, "random": false },
        "size": { "value": 2, "random": true },
        "line_linked": {
          "enable": true,
          "distance": 150,
          "color": "#6B5DD3",
          "opacity": 0.2,
          "width": 1
        },
        "move": {
          "enable": true,
          "speed": 1.5,
          "direction": "none",
          "random": false,
          "straight": false,
          "out_mode": "out",
          "bounce": false,
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": { "onhover": { "enable": true, "mode": "grab" } }
      },
      "retina_detect": true
    };

    if (window.particlesJS) {
      // On wrap dans un try/catch pour éviter les erreurs si la div n'existe pas encore
      try {
        window.particlesJS("particles-hero", particlesConfig);
        window.particlesJS("particles-js", particlesConfig); // Section Stats
        window.particlesJS("particles-footer", particlesConfig);
      } catch (e) { console.log("Chargement particules différé"); }
    }

    // 2. Gestion du Scroll (Navbar)
    const handleScroll = () => {
      const navbar = document.getElementById('navbar');
      if (navbar) {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    };
    window.addEventListener('scroll', handleScroll);

    // 3. Animation des Compteurs (Logique importée de ton script)
    const animateCounters = () => {
      if (hasAnimatedCounters.current) return;
      hasAnimatedCounters.current = true;

      const counters = document.querySelectorAll('.counter');
      counters.forEach(counter => {
        const targetText = counter.getAttribute('data-target') || "0";
        const target = parseInt(targetText);
        const duration = 2000;
        const startTime = Date.now();
        
        const animate = () => {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          let currentValue = Math.floor(easeOutQuart * target);
          
          if (target <= 100) {
              counter.textContent = currentValue + '%';
          } else {
              counter.textContent = currentValue.toString();
          }
          
          if (progress < 1) {
              requestAnimationFrame(animate);
          } else {
              if (target > 100) counter.textContent = target + '+';
          }
        };
        animate();
      });
    };

    // 4. Intersection Observer (Apparition au défilement)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('stats')) {
            animateCounters();
            const statItems = entry.target.querySelectorAll('.stat-item');
            statItems.forEach((item) => {
              (item as HTMLElement).style.animationPlayState = 'running';
            });
            observer.unobserve(entry.target);
          }
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('section').forEach(section => {
      (section as HTMLElement).style.opacity = '0';
      (section as HTMLElement).style.transform = 'translateY(30px)';
      (section as HTMLElement).style.transition = 'all 0.8s ease-out';
      observer.observe(section);
    });

    // Cleanup (Nettoyage quand on quitte la page)
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="home-container">
      {/* Navigation */}
      <nav id="navbar">
        <div className="logo" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <i className="fa-solid fa-clock-rotate-left" style={{marginRight: '10px', fontSize: '0.9em'}}></i>UniTime
        </div>
        <ul className="nav-links">
            {/* Liens avec Scroll Fluide */}
            <li><a onClick={() => scrollToSection('accueil')} style={{cursor: 'pointer'}}>Accueil</a></li>
            <li><a onClick={() => scrollToSection('fonctionnalites')} style={{cursor: 'pointer'}}>Fonctionnalités</a></li>
            <li><a onClick={() => scrollToSection('utilisateurs')} style={{cursor: 'pointer'}}>Utilisateurs</a></li>
            <li><a onClick={() => scrollToSection('apropos')} style={{cursor: 'pointer'}}>À propos</a></li>
        </ul>
        {/* Lien vers le Login React */}
        <button className="cta-nav" onClick={() => navigate('/login')}>Se Connecter</button>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="accueil">
        <div id="particles-hero"></div>
        <div className="bg-circles">
            <div className="circle circle-1"></div>
            <div className="circle circle-2"></div>
        </div>
        
        <div className="hero-visual">
            <div className="floating-card card-1">
                <div className="card-icon"><i className="fa-solid fa-calendar-check"></i></div>
                <div className="card-text">Génération Auto</div>
            </div>
            <div className="floating-card card-2">
                <div className="card-icon"><i className="fa-solid fa-bullseye"></i></div>
                <div className="card-text">Zéro Conflit</div>
            </div>
            <div className="floating-card card-3">
                <div className="card-icon"><i className="fa-solid fa-bolt-lightning"></i></div>
                <div className="card-text">Temps Réel</div>
            </div>

            <div className="robot-container">
                {/* Image Robot depuis le dossier public */}
                <img src="/img/robot.png" alt="UniTime Robot" className="robot-image" />
            </div>
        </div>

        <div className="hero-content">
            <div className="hero-badge">
                <i className="fa-solid fa-microchip" style={{marginRight: '8px'}}></i> 
                Intelligence Artificielle + Gestion Optimale
            </div>
            <h1>
                <strong>Gérez vos emplois du <br/>temps avec <span className="highlight">UniTime</span></strong>
            </h1>
            <p>
                La solution intelligente qui automatise, optimise et simplifie la gestion des emplois du temps universitaires. 
                Fini les conflits, place à l'efficacité.
            </p>
            <div className="hero-buttons">
                <button className="btn-primary" onClick={() => navigate('/login')}>Commencer Maintenant</button>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="fonctionnalites">
        <div className="section-header">
            <div className="section-tag">Fonctionnalités Intelligentes</div>
            <h2>Tout ce dont vous avez besoin</h2>
            <p>Des fonctionnalités puissantes conçues pour simplifier la gestion des emplois du temps</p>
        </div>

        <div className="features-grid">
            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-robot"></i></div>
                <h3>Génération Automatique</h3>
                <p>L'IA crée des emplois du temps optimisés en quelques secondes en tenant compte de toutes les contraintes.</p>
            </div>

            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                <h3>Détection de Conflits</h3>
                <p>Identification automatique des chevauchements, salles occupées et enseignants indisponibles.</p>
            </div>

            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-building-user"></i></div>
                <h3>Gestion des Ressources</h3>
                <p>Allocation intelligente des salles, amphithéâtres et équipements selon les besoins.</p>
            </div>

            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-chart-line"></i></div>
                <h3>Statistiques Avancées</h3>
                <p>Visualisez l'occupation des salles, les créneaux surchargés et optimisez l'utilisation.</p>
            </div>

            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-mobile-screen-button"></i></div>
                <h3>Temps Réel</h3>
                <p>Mises à jour instantanées et synchronisation en direct pour tous les utilisateurs.</p>
            </div>

            <div className="feature-card">
                <div className="feature-icon"><i className="fa-solid fa-file-export"></i></div>
                <h3>Export Multi-format</h3>
                <p>Exportez vos emplois du temps en PDF, Excel, image ou tout autre format nécessaire.</p>
            </div>
        </div>
      </section>

      {/* Users Section */}
      <section className="users" id="utilisateurs">
        <div className="section-header">
            <div className="section-tag">Trois Profils Utilisateurs</div>
            <h2>Conçu pour chaque utilisateur</h2>
            <p>Des fonctionnalités dédiées adaptées aux besoins de chacun</p>
        </div>

        <div className="users-grid">
            <div className="user-card">
                <div className="user-icon"><i className="fa-solid fa-user-shield"></i></div>
                <h3>Administrateur</h3>
                <ul className="user-features">
                    <li>Création et génération des emplois du temps</li>
                    <li>Affectation automatique des salles</li>
                    <li>Gestion des disponibilités</li>
                    <li>Validation des réservations</li>
                    <li>Visualisation en temps réel</li>
                    <li>Export multi-format</li>
                </ul>
            </div>

            <div className="user-card">
                <div className="user-icon"><i className="fa-solid fa-chalkboard-user"></i></div>
                <h3>Enseignant</h3>
                <ul className="user-features">
                    <li>Consultation de l'emploi du temps</li>
                    <li>Demande de réservation de salle</li>
                    <li>Recherche de salles vacantes</li>
                    <li>Signalement d'indisponibilité</li>
                    <li>Notifications automatiques</li>
                    <li>Accès mobile et desktop</li>
                </ul>
            </div>

            <div className="user-card">
                <div className="user-icon"><i className="fa-solid fa-graduation-cap"></i></div>
                <h3>Étudiant</h3>
                <ul className="user-features">
                    <li>Consultation de l'emploi du temps</li>
                    <li>Mises à jour en temps réel</li>
                    <li>Recherche de salles libres</li>
                    <li>Notifications de changements</li>
                    <li>Interface intuitive</li>
                    <li>Accès permanent</li>
                </ul>
            </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats" id="stats-section" style={{position: 'relative'}}>
        <div id="particles-js" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1}}></div>
        <div className="stats-grid" style={{position: 'relative', zIndex: 2}}>
            <div className="stat-item">
                <h3 className="counter" data-target="100">0</h3>
                <p>Conflits Évités</p>
            </div>
            <div className="stat-item">
                <h3 className="counter" data-target="95">0</h3>
                <p>Taux d'Optimisation</p>
            </div>
            <div className="stat-item">
                <h3 className="counter" data-target="60">0</h3>
                <p>Temps Gagné (min)</p>
            </div>
            <div className="stat-item">
                <h3 className="counter" data-target="1000">0</h3>
                <p>Utilisateurs Satisfaits</p>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
            <h2>Prêt à éliminer les conflits et transformer votre gestion ?</h2>
            <p>
                Rejoignez les établissements qui ont choisi UniTime pour optimiser leurs emplois du temps. 
                Commencez dès maintenant et découvrez la différence.
            </p>
            <div className="hero-buttons" style={{justifyContent: 'center'}}>
                <button className="btn-primary" onClick={() => navigate('/login')}>Essayer Gratuitement</button>
                {/* BOUTON CONTACTER L'ÉQUIPE ACTIVÉ */}
                <button className="btn-secondary" onClick={(e) => handleContact(e)}>Contacter l'Équipe</button>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="apropos" style={{position: 'relative', overflow: 'hidden'}}>
        <div id="particles-footer"></div>
        <div className="footer-content">
            <div className="footer-section">
                <h4>UniTime</h4>
                <p style={{color: 'var(--light)', lineHeight: '1.7'}}>
                    Solution intelligente de gestion automatique <br/> des emplois du temps universitaires.
                </p>
            </div>

            <div className="footer-section">
                <h4>Liens Rapides</h4>
                <ul>
                    <li><a onClick={() => scrollToSection('accueil')} style={{cursor: 'pointer'}}>Accueil</a></li>
                    <li><a onClick={() => scrollToSection('fonctionnalites')} style={{cursor: 'pointer'}}>Fonctionnalités</a></li>
                    <li><a onClick={() => scrollToSection('utilisateurs')} style={{cursor: 'pointer'}}>Utilisateurs</a></li>
                    <li><a onClick={() => navigate('/login')} style={{cursor:'pointer'}}>Se Connecter</a></li>
                </ul>
            </div>

            <div className="footer-section">
                <h4>Support</h4>
                <ul>
                    {/* LIENS CONNECTÉS À LA PAGE SUPPORT */}
                    <li><a onClick={() => navigate('/support')} style={{cursor:'pointer'}}>Documentation</a></li>
                    <li><a onClick={() => navigate('/support')} style={{cursor:'pointer'}}>FAQ</a></li>
                    <li><a href="#" onClick={(e) => handleContact(e)}>Contact</a></li>
                    <li><a onClick={() => navigate('/support')} style={{cursor:'pointer'}}>Aide</a></li>
                </ul>
            </div>

            <div className="footer-section">
                <h4>Légal</h4>
                <ul>
                    {/* LIENS CONNECTÉS À LA PAGE LÉGALE */}
                    <li><a onClick={() => navigate('/legal')} style={{cursor:'pointer'}}>Conditions d'utilisation</a></li>
                    <li><a onClick={() => navigate('/legal')} style={{cursor:'pointer'}}>Politique de confidentialité</a></li>
                    <li><a onClick={() => navigate('/legal')} style={{cursor:'pointer'}}>Mentions légales</a></li>
                </ul>
            </div>
        </div>

        <div className="footer-bottom">
            <p>&copy; 2025 UniTime. Tous droits réservés. | Projet Analytique de Données - Université</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;