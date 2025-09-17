'use server';
/**
 * @fileOverview This file defines a Genkit flow to adapt questions based on historical user performance.
 *
 * - adaptQuestionsToUserPerformance - A function that retrieves questions and adds those that have historically been answered incorrectly.
 * - AdaptQuestionsToUserPerformanceInput - The input type for the adaptQuestionsToUserPerformance function.
 * - AdaptQuestionsToUserPerformanceOutput - The return type for the adaptQuestionsToUserPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { QuestionType, GameDifficulty } from '@/lib/types';


// Define the schema for a question
const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question.'),
  level: z.number().describe('The level of the question.'),
  type: z.string().describe('The type of the question.'),
  text: z.string().describe('The text of the question.'),
  options: z.array(z.string()).describe('Possible answer options for the question.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('Difficulty level of the question.'),
  explanation: z.string().optional().describe('Explanation for the correct answer.'),
});

export type Question = z.infer<typeof QuestionSchema>;

const AdaptQuestionsToUserPerformanceInputSchema = z.object({
  questions: z.array(QuestionSchema).describe('Array of questions to adapt based on user performance.'),
  userPerformanceData: z.array(
    z.object({
      questionId: z.string().describe('The ID of the question answered.'),
      correct: z.boolean().describe('Whether the user answered correctly.'),
    })
  ).describe('Historical user performance data for the questions.'),
});

export type AdaptQuestionsToUserPerformanceInput = z.infer<typeof AdaptQuestionsToUserPerformanceInputSchema>;

const AdaptQuestionsToUserPerformanceOutputSchema = z.array(QuestionSchema).describe('Adapted array of questions based on user performance data.');

export type AdaptQuestionsToUserPerformanceOutput = z.infer<typeof AdaptQuestionsToUserPerformanceOutputSchema>;

export async function adaptQuestionsToUserPerformance(input: AdaptQuestionsToUserPerformanceInput): Promise<AdaptQuestionsToUserPerformanceOutput> {
  return adaptQuestionsToUserPerformanceFlow(input);
}

const adaptQuestionsToUserPerformanceFlow = ai.defineFlow(
  {
    name: 'adaptQuestionsToUserPerformanceFlow',
    inputSchema: AdaptQuestionsToUserPerformanceInputSchema,
    outputSchema: AdaptQuestionsToUserPerformanceOutputSchema,
  },
  async input => {
    const {questions, userPerformanceData} = input;

    // Identify problematic questions based on user performance data
    const problematicQuestionIds = userPerformanceData
      .filter(data => !data.correct)
      .map(data => data.questionId);

    // Filter out duplicate question IDs
    const uniqueProblematicQuestionIds = [...new Set(problematicQuestionIds)];

    // Retrieve the problematic questions from the original questions array
    const problematicQuestions = questions.filter(question =>
      uniqueProblematicQuestionIds.includes(question.id)
    );

    // Add problematic questions back into the questions array to increase their frequency
    const adaptedQuestions = [...questions, ...problematicQuestions];

    return adaptedQuestions;
  }
);
