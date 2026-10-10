import Question from '../src/modules/Question.js';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, answer => resolve(answer.trim())));
}

async function mainMenu() {
    while (true) {
        console.log("\n🔹 MENU PRINCIPAL");
        console.log("1️⃣ Ajouter une question");
        console.log("2️⃣ Rechercher une question par ID");
        console.log("3️⃣ Rechercher une question par texte");
        console.log("4️⃣ Mettre à jour une question");
        console.log("5️⃣ Supprimer une question");
        console.log("6️⃣ Afficher toutes les questions d'un quiz");
        console.log("7️⃣ Vérifier si une question est expirée");
        console.log("0️⃣ Quitter");

        const choice = await askQuestion("Choisissez une option : ");

        switch (choice) {
            case '1': await createQuestion(); break;
            case '2': await searchQuestionById(); break;
            case '3': await searchQuestionsByText(); break;
            case '4': await updateQuestionText(); break;
            case '5': await deleteQuestion(); break;
            case '6': await getQuestionsByQuiz(); break;
            case '7': await checkQuestionExpiration(); break;
            case '0': console.log("👋 Fin du programme !"); rl.close(); return;
     
        }
    }
}

// ✅ Ajouter une question
async function createQuestion() {
    try {
        const quiz_id = await askQuestion("Entrez l'ID du quiz : ");
        const question_text = await askQuestion("Entrez la question : ");
        const duration_seconds = await askQuestion("Entrez la durée en secondes (laisser vide pour illimité) : ");

        const newQuestion = await Question.createQuestion({
            quiz_id: Number(quiz_id),
            question_text,
            duration_seconds: duration_seconds ? Number(duration_seconds) : null
        });

        console.log(`✅ Question créée avec l'ID: ${newQuestion.id}`);
    } catch (error) {
        console.error("❌ Erreur lors de la création de la question :", error.message);
    }
}

// ✅ Rechercher une question par ID
async function searchQuestionById() {
    try {
        const id = await askQuestion("Entrez l'ID de la question à rechercher : ");
        const question = await Question.getQuestionById(Number(id));

        if (!question || question.error) {
            console.log("❌ Question non trouvée.");
        } else {
            console.log(`🔎 Résultat : ${JSON.stringify(question, null, 2)}`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la recherche :", error.message);
    }
}

// ✅ Rechercher une question par texte
async function searchQuestionsByText() {
    try {
        const text = await askQuestion("Entrez le texte à rechercher : ");
        const questions = await Question.searchQuestions(text);

        if (questions.length === 0) {
            console.log("❌ Aucune question trouvée.");
        } else {
            console.log(`🔎 Résultats : ${JSON.stringify(questions, null, 2)}`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la recherche :", error.message);
    }
}

// ✅ Mettre à jour le texte d'une question
async function updateQuestionText() {
    try {
        const id = await askQuestion("Entrez l'ID de la question à mettre à jour : ");
        const newText = await askQuestion("Entrez le nouveau texte : ");

        const result = await Question.updateQuestionText(Number(id), { question_text: newText });

        if (result.error) {
            console.log("❌ Erreur :", result.error);
        } else {
            console.log("✅ Question mise à jour.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour :", error.message);
    }
}

// ✅ Supprimer une question
async function deleteQuestion() {
    try {
        const id = await askQuestion("Entrez l'ID de la question à supprimer : ");

        const result = await Question.deleteQuestion(Number(id));

        if (result.error) {
            console.log("❌ Erreur :", result.error);
        } else {
            console.log("✅ Question supprimée.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la suppression :", error.message);
    }
}

// ✅ Récupérer toutes les questions d'un quiz
async function getQuestionsByQuiz() {
    try {
        const quiz_id = await askQuestion("Entrez l'ID du quiz : ");
        const questions = await Question.getQuizQuestions(Number(quiz_id));

        if (questions.length === 0) {
            console.log("❌ Aucune question trouvée.");
        } else {
            console.log(`📜 Questions : ${JSON.stringify(questions, null, 2)}`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des questions :", error.message);
    }
}

// ✅ Vérifier si une question est expirée
async function checkQuestionExpiration() {
    try {
        const id = await askQuestion("Entrez l'ID de la question à vérifier : ");

        const result = await Question.isQuestionExpired(Number(id));

        if (result.error) {
            console.log("❌ Erreur :", result.error);
        } else {
            console.log(result.expired 
                ? "⏳ Temps écoulé !"
                : `⏳ Temps restant : ${result.remaining} secondes`);
        }
    } catch (error) {
        console.error("❌ Erreur lors de la vérification :", error.message);
    }
}

// 🎯 Lancer le menu
mainMenu();


 
