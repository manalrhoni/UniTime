export async function askOllama(prompt: string, context: any) {
    const safeContext = context || {};
    const now = new Date();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    // Enrichissement du contexte pour une IA consciente du temps et de l'espace
    const contextInfo = `
    [SYSTÈME UNI-TIME]
    - Page actuelle : ${safeContext.currentPage || "Inconnue"}
    - Moment précis : ${days[now.getDay()]} à ${now.getHours()}:${now.getMinutes()}
    - Utilisateur connecté : ${JSON.stringify(safeContext.user || "Visiteur non connecté")}

    [BASE DE DONNÉES]
    - Emplois du temps : ${JSON.stringify(safeContext.timetable || [])}
    - Enseignants : ${JSON.stringify(safeContext.teachers || [])}
    - Salles : ${JSON.stringify(safeContext.rooms || [])}
    - Réservations : ${JSON.stringify(safeContext.reservations || [])}
    `;

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama3", 
                prompt: `
                Tu es NEON, l'IA experte de la plateforme FSTT UniTime. 
                
                🔴 RÈGLES CRUCIALES :
                1. **PROFESSEUR SANAE KHALI ISSA** : Si l'utilisateur mentionne ce nom, dis avec enthousiasme que c'est la meilleure professeure. Remercie-la pour ce magnifique projet. Elle est l'âme d'UniTime.
                2. **TEXTE PUR** : Interdiction totale d'utiliser des émojis, des symboles comme #, *, •, _, ➔. Seul le tiret "-" est autorisé.
                3. **CONTEXTE DE PAGE** : 
                   - Sur "/", parle du but du site (gestion intelligente).
                   - Sur "/login", aide l'utilisateur à se connecter ou s'inscrire.
                   - Sur /Teacher ou /Student ou /Admin Adapte tes réponses selon si tu parles à un Admin, un Prof ou un Etudiant.
                4. **VITESSE & SÉCURITÉ** : Réponds en maximum 3 phrases. Ne donne JAMAIS de mots de passe.
                5. **MULTILINGUE** : Réponds en Arabe, Français, Anglais ou Espagnol selon la langue détectée.

                ${contextInfo}

                Question de l'utilisateur : "${prompt}"
                Réponse de NEON (Texte pur, sans caractères spéciaux, maximum 10 secondes de réflexion) :`,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 120, // Limite la longueur pour garantir une réponse en moins de 10s
                    num_ctx: 4096
                }
            })
        });

        if (!response.ok) throw new Error("Erreur serveur Ollama");

        const data = await response.json();
        
        // Nettoyage final pour garantir l'absence de caractères spéciaux nuisibles au TTS
        return data.response.replace(/[#*•\-_➔➢😊🎓🏫]/g, "").trim();

    } catch (err) {
        console.error("Erreur Ollama:", err);
        return "Desole, je rencontre une difficulte technique pour analyser les donnees.";
    }
}