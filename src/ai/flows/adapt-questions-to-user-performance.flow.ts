'use server';
/**
 * @fileOverview This file defines a Genkit flow to identify problematic questions based on user performance.
 *
 * - adaptQuestionsToUserPerformance - A function that returns a list of question IDs that have been answered incorrectly.
 * - AdaptQuestionsToUserPerformanceInput - The input type for the adaptQuestionsToUserPerformance function.
 * - AdaptQuestionsToUserPerformanceOutput - The return type for the adaptQuestionsToUserPerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptQuestionsToUserPerformanceInputSchema = z.object({
  userPerformanceData: z.array(
    z.object({
      questionId: z.string().describe('The ID of the question answered.'),
      correct: z.boolean().describe('Whether the user answered correctly.'),
    })
  ).describe('Historical user performance data for the questions.'),
});

export type AdaptQuestionsToUserPerformanceInput = z.infer<typeof AdaptQuestionsToUserPerformanceInputSchema>;

const AdaptQuestionsToUserPerformanceOutputSchema = z.array(z.string()).describe('An array of question IDs that the user has answered incorrectly.');

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
    const { userPerformanceData } = input;

    // Identify problematic question IDs based on user performance data
    const problematicQuestionIds = userPerformanceData
      .filter(data => !data.correct)
      .map(data => data.questionId);

    // Return unique problematic question IDs
    return [...new Set(problematicQuestionIds)];
  }
);
