/*
    JLPT Exam Grading Simulator
*/

const { createApp, ref, computed } = Vue;

// Constants
const SCORING_CONSTANTS = {
    MAX_SECTION_SCORE: 90,
    BASELINE_PERCENTAGE: 60,
    MIN_WEIGHT: 50,
    MAX_WEIGHT: 150,
    SECTIONS: ['grammar', 'listening']
};

// Score calculation class
class ScoreCalculator {
    static calculateWeight(difficulty) {
        /* Inverse difficulty conversion:
        the harder the question (lower correct rate), the higher the weight
        */
        return SCORING_CONSTANTS.MIN_WEIGHT +
            ((100 - difficulty) / 100) *
            (SCORING_CONSTANTS.MAX_WEIGHT - SCORING_CONSTANTS.MIN_WEIGHT);
    }

    static calculateScaledScore(weightedScore) {
        const baselineDecimal = SCORING_CONSTANTS.BASELINE_PERCENTAGE / 100;

        if (weightedScore >= baselineDecimal) {
            // High score range: 60-90
            return SCORING_CONSTANTS.BASELINE_PERCENTAGE +
                (weightedScore - baselineDecimal) *
                (SCORING_CONSTANTS.MAX_SECTION_SCORE - SCORING_CONSTANTS.BASELINE_PERCENTAGE) /
                (1 - baselineDecimal);
        } else {
            // Low score range: 0-60
            return (weightedScore * SCORING_CONSTANTS.BASELINE_PERCENTAGE) / baselineDecimal;
        }
    }

    static calculateSectionScore(questions) {
        if (!questions || questions.length === 0) return 0;

        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach(question => {
            const weight = this.calculateWeight(question.difficulty);
            totalPoints += weight;
            if (question.userAnswer === question.correctAnswer) {
                earnedPoints += weight;
            }
        });

        const weightedScore = earnedPoints / totalPoints;
        return Math.round(this.calculateScaledScore(weightedScore));
    }
}

createApp({
    setup() {
        const currentPage = ref('setup');
        const showValidation = ref(false);
        const examStructure = ref({
            grammar: [],
            listening: []
        });

        // 計算屬性
        const scores = computed(() => {
            const result = {
                grammar: 0,
                listening: 0,
                total: 0,
                correctCount: 0,
                totalQuestions: 0
            };

            SCORING_CONSTANTS.SECTIONS.forEach(section => {
                const questions = examStructure.value[section].flatMap(s => s.questions);
                result[section] = ScoreCalculator.calculateSectionScore(questions);
                result.correctCount += questions.filter(q => q.userAnswer === q.correctAnswer).length;
                result.totalQuestions += questions.length;
            });

            result.total = result.grammar + result.listening;
            return result;
        });

        // 驗證方法
        const isValidDifficulty = (difficulty) => {
            return typeof difficulty === 'number' && difficulty >= 0 && difficulty <= 100;
        };

        // Section操作方法
        const addSection = (part) => {
            examStructure.value[part].push({
                name: '',
                questions: []
            });
        };

        const removeSection = (part, index) => {
            examStructure.value[part].splice(index, 1);
        };

        // 題目操作方法
        const addQuestion = (section) => {
            section.questions.push({
                name: '',
                correctAnswer: '',
                difficulty: 50,
                userAnswer: ''
            });
        };

        const removeQuestion = (section, index) => {
            section.questions.splice(index, 1);
        };

        // 表單驗證
        const validateSetup = () => {
            let isValid = true;

            for (const part in examStructure.value) {
                if (examStructure.value[part].length === 0) {
                    isValid = false;
                    break;
                }

                for (const section of examStructure.value[part]) {
                    if (!section.name || section.questions.length === 0) {
                        isValid = false;
                        break;
                    }

                    for (const q of section.questions) {
                        if (!q.name || !q.correctAnswer || !isValidDifficulty(q.difficulty)) {
                            isValid = false;
                            break;
                        }
                    }
                }
            }

            return isValid;
        };

        const validateAnswers = () => {
            let isValid = true;

            for (const part in examStructure.value) {
                for (const section of examStructure.value[part]) {
                    for (const q of section.questions) {
                        if (!q.userAnswer) {
                            isValid = false;
                            break;
                        }
                    }
                }
            }

            return isValid;
        };

        // 頁面導航方法
        const saveAndProceed = () => {
            showValidation.value = true;

            if (!validateSetup()) {
                alert('請確保所有欄位都已正確填寫，並且每個部分至少有一個Section，每個Section至少有一題，難度需在0-100之間');
                return;
            }

            localStorage.setItem('examStructure', JSON.stringify(examStructure.value));
            currentPage.value = 'answer';
            showValidation.value = false;
        };

        const submitAnswers = () => {
            showValidation.value = true;

            if (!validateAnswers()) {
                alert('請回答所有題目');
                return;
            }

            currentPage.value = 'result';
            showValidation.value = false;
        };

        const resetExam = () => {
            examStructure.value = {
                grammar: [],
                listening: []
            };
            currentPage.value = 'setup';
            showValidation.value = false;
            localStorage.removeItem('examStructure');
        };

        // 初始化
        const initialize = () => {
            const savedData = localStorage.getItem('examStructure');
            if (savedData) {
                try {
                    examStructure.value = JSON.parse(savedData);
                } catch (e) {
                    console.error('Error parsing saved data:', e);
                    localStorage.removeItem('examStructure');
                }
            }

            // 如果沒有保存的數據，創建初始結構
            if (examStructure.value.grammar.length === 0 && examStructure.value.listening.length === 0) {
                SCORING_CONSTANTS.SECTIONS.forEach(section => {
                    addSection(section);
                });
            }
        };

        // 執行初始化
        initialize();

        return {
            currentPage,
            examStructure,
            scores,
            showValidation,
            isValidDifficulty,
            addSection,
            removeSection,
            addQuestion,
            removeQuestion,
            saveAndProceed,
            submitAnswers,
            resetExam
        };
    }
}).mount('#app');