import { AISuggestion } from './AISuggestions';

export interface AISuggestionService {
  /**
   * Get AI suggestions for a specific notebook
   * @param notebookId - The ID of the notebook
   * @returns Promise with array of AI suggestions
   */
  getSuggestions(notebookId: string): Promise<AISuggestion[]>;

  /**
   * Apply a suggestion (mark as applied and execute if needed)
   * @param suggestionId - The ID of the suggestion to apply
   * @returns Promise indicating success
   */
  applySuggestion(suggestionId: string): Promise<void>;

  /**
   * Dismiss a suggestion (mark as dismissed)
   * @param suggestionId - The ID of the suggestion to dismiss
   * @returns Promise indicating success
   */
  dismissSuggestion(suggestionId: string): Promise<void>;

  /**
   * Mark a suggestion as viewed
   * @param suggestionId - The ID of the suggestion to mark as viewed
   * @returns Promise indicating success
   */
  viewSuggestion(suggestionId: string): Promise<void>;

  /**
   * Generate new suggestions for a notebook
   * @param notebookId - The ID of the notebook
   * @param context - Optional context for generating suggestions
   * @returns Promise with newly generated suggestions
   */
  generateSuggestions(notebookId: string, context?: any): Promise<AISuggestion[]>;
}

// TODO: Implement actual service that calls backend API
export const aiSuggestionService: AISuggestionService = {
  async getSuggestions(notebookId: string): Promise<AISuggestion[]> {
    // TODO: Implement API call
    // const response = await fetch(`/api/notebooks/${notebookId}/suggestions`);
    // return response.json();
    return [];
  },

  async applySuggestion(suggestionId: string): Promise<void> {
    // TODO: Implement API call
    // await fetch(`/api/suggestions/${suggestionId}/apply`, { method: 'POST' });
  },

  async dismissSuggestion(suggestionId: string): Promise<void> {
    // TODO: Implement API call
    // await fetch(`/api/suggestions/${suggestionId}/dismiss`, { method: 'POST' });
  },

  async viewSuggestion(suggestionId: string): Promise<void> {
    // TODO: Implement API call
    // await fetch(`/api/suggestions/${suggestionId}/view`, { method: 'POST' });
  },

  async generateSuggestions(notebookId: string, context?: any): Promise<AISuggestion[]> {
    // TODO: Implement API call
    // const response = await fetch(`/api/notebooks/${notebookId}/suggestions/generate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ context })
    // });
    // return response.json();
    return [];
  }
};