import { useState, useEffect, useCallback } from 'react';
import { AISuggestion, SuggestionType, SuggestionPriority, SuggestionStatus } from './AISuggestions';

export const useAISuggestions = (notebookId?: string) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Load suggestions from API
  const loadSuggestions = useCallback(async () => {
    if (!notebookId) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await aiSuggestionService.getSuggestions(notebookId);
      // setSuggestions(response.data);
      
      // For now, initialize with empty array
      setSuggestions([]);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  // Apply suggestion
  const applySuggestion = useCallback(async (suggestionId: string) => {
    try {
      // TODO: Replace with actual API call
      // await aiSuggestionService.applySuggestion(suggestionId);
      
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId 
            ? { ...s, status: SuggestionStatus.APPLIED } 
            : s
        )
      );
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  }, []);

  // Dismiss suggestion
  const dismissSuggestion = useCallback(async (suggestionId: string) => {
    try {
      // TODO: Replace with actual API call
      // await aiSuggestionService.dismissSuggestion(suggestionId);
      
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId 
            ? { ...s, status: SuggestionStatus.DISMISSED } 
            : s
        )
      );
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  }, []);

  // View suggestion (mark as viewed)
  const viewSuggestion = useCallback(async (suggestionId: string) => {
    try {
      setSuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId && s.status === SuggestionStatus.NEW
            ? { ...s, status: SuggestionStatus.VIEWED } 
            : s
        )
      );
    } catch (error) {
      console.error('Failed to mark suggestion as viewed:', error);
    }
  }, []);

  // Get count of new suggestions
  const getNewSuggestionsCount = useCallback(() => {
    return suggestions.filter(s => s.status === SuggestionStatus.NEW).length;
  }, [suggestions]);

  // Initial load
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return {
    suggestions,
    loading,
    applySuggestion,
    dismissSuggestion,
    viewSuggestion,
    refreshSuggestions: loadSuggestions,
    newSuggestionsCount: getNewSuggestionsCount()
  };
};