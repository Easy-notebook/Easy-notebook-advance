import constants from './constants';

export const generalResponse = async (issue, context) => {
    try {
        const response = await fetch(constants.API.GENERATE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                issue: issue,
                context: context,
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('API error:', errorData);
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error in generalResponse:', error);
        throw error;
    }
};

